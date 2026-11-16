# [CLAUDE] UI-Test (16.11.2026, Backlog 1513, Blickwinkel „Disposition braucht kurzfristig einen freien Lkw mit Ladebordwand bzw. einen Kühlauflieger“):
# Fahrzeugliste mit Auswahl „Ausstattung“ (aus hinterlegten Prüfterminen) – Ladebordwand am Lkw, Kühlung am gekoppelten Anhänger (Chip „(Anhänger)“),
# zusammen mit „Keine offenen Meldungen“, Hinweis, Suche „kühlung“, Druckkopf. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EQ={'de':('Ladebordwand','Kühlung','Anhänger','Ausstattung'),'uk':('Гідроборт','Холодильник','Причіп','Обладнання'),'en':('Tail lift','Refrigeration','Trailer','Equipment')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'eq.inhaber','display_name':'EQ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'eq.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'eq.dispo','display_name':'EQ Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    # EQ-LB 1/2: Lkw mit Ladebordwand (2 hat eine offene Meldung); EQ-KL 1 + Kühlauflieger EQ-KA 1; EQ-XX 1 ohne Ausstattung
    for plate,vin,extra in [('EQ-LB 1513','WDB96340315130001',{}),('EQ-LB 1514','WDB96340315130002',{}),('EQ-KL 1513','WDB96340315130003',{'trailer_plate':'EQ-KA 1513'}),
                            ('EQ-KA 1513','WSM00000015130004',{'kind':'anhaenger'}),('EQ-XX 1513','WDB96340315130005',{})]:
        check(api('POST','/api/vehicles',{'plate':plate,'vin':vin,'site':'Dortmund',**extra})['s'] in (200,201),f'Fahrzeug {plate}')
    for vin in ['WDB96340315130001','WDB96340315130002']:
        check(api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'Ladebordwand','last_done_date':'2026-03-10','interval_months':12,'evidence':'Prüfbuch LBW'})['s']==201,'Ladebordwand '+vin)
    check(api('POST','/api/vehicles/VIN:WSM00000015130004/maintenance',{'kind':'Kühlgerät','next_due_date':'2027-05-31','evidence':'Wartungsnachweis'})['s']==201,'Kühlgerät am Anhänger')
    check(api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340315130002','description':'Spiegel locker','priority':'niedrig','request_key':str(uuid.uuid4())})['s']==201,'Meldung EQ-LB 1514')
    for lang in ['de','uk','en']:
      lb,kh,tr,lab=EQ[lang]
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'eq.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles'); q.reload(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        sel=q.locator('#veq')
        check(sel.count()==1 and lab in (sel.get_attribute('aria-label') or ''),f'{lang} {wd}px: Auswahl „{lab}“')
        opts=sel.locator('option').all_inner_texts() if sel.count() else []
        check(any(o.startswith(lab+': '+lb) and '(2)' in o for o in opts) and any(o.startswith(lab+': '+kh) and '(2)' in o for o in opts) and len(opts)==3,f'{lang} {wd}px: Anzahl je Ausstattung {opts}')
        row=[x for x in q.locator('#vl a.row').all() if x.locator('.plate').inner_text().endswith('EQ-KL 1513')]
        check(bool(row) and row[0].locator('[data-eqc]').count()==1 and f'{kh} ({tr})' in row[0].locator('[data-eqc]').inner_text(),f'{lang} {wd}px: Chip „{kh} ({tr})“ an der Zugmaschine')
        sel.select_option('taillift'); q.wait_for_timeout(700)
        rows=q.locator('#vl a.row').all_inner_texts()
        check(len(rows)==2 and all('EQ-LB' in r for r in rows),f'{lang} {wd}px: nur Lkw mit Ladebordwand ({len(rows)})')
        check(q.locator('[data-eqhint]').count()==1,f'{lang} {wd}px: Hinweis')
        q.locator('[data-av="einsatzbereit_lt_system"]').click(); q.wait_for_timeout(600)
        rows=q.locator('#vl a.row').all_inner_texts()
        check(len(rows)==1 and 'EQ-LB 1513' in rows[0],f'{lang} {wd}px: mit „Keine offenen Meldungen“ nur der freie ({len(rows)})')
        check(lab in (q.locator('#vprl').text_content() or '') and lb in (q.locator('#vprl').text_content() or ''),f'{lang} {wd}px: Druckkopf nennt Ausstattung')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ausstattung_{lang}_{wd}.png',full_page=False)
        q.locator('[data-av="all"]').click(); q.wait_for_timeout(400); q.locator('#veq').select_option(''); q.wait_for_timeout(600)
        q.fill('#q',kh.lower()); q.wait_for_timeout(300)
        vis=[x.inner_text() for x in q.locator('#vl a.row').all() if x.is_visible()]
        check(len(vis)==2 and any('EQ-KL 1513' in v for v in vis) and any('EQ-KA 1513' in v for v in vis),f'{lang} {wd}px: Suche „{kh.lower()}“ findet Gespann ({len(vis)})')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
