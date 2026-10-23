# [CLAUDE] UI-Test (23.10.2026, Teilagenten „Disposition im Tagesgeschäft“ / „Inventur zum Jahreswechsel“):
# Dispo-Startseite: „Nicht einplanen“ zeigt „Rückkehr: ungeklärt“ ohne Plan-/Liefertermin und „Ruhend“ am ruhenden Fahrzeug, Link
# „Prüfung/Wartung überfällig (n)“, Leisten-Zahlen sind Links auf die gefilterte Fahrzeugliste; Fahrzeugliste zählt Verfügbarkeit ohne ruhende
# (eigener Knopf „Ruhend“). Lager: deaktivierter Artikel mit Restbestand → „Restbestand ausbuchen“ bucht auf 0.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UNK={'de':'Rückkehr: ungeklärt','uk':'Повернення: не з’ясовано','en':'Return: unclear'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dt.inhaber','display_name':'DT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def inv(b):
        u=api('POST','/api/users',b); c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    inv({'username':'dt.dispo','display_name':'DT Dispo','role':'dispatch','environment':'production','home_site':'Dortmund'})
    inv({'username':'dt.werkstatt','display_name':'DT WS','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    V={}
    for i,(pl,vin) in enumerate([('DT-RU 1','WDB9634031L100001'),('DT-WT 2','WDB9634031L100002'),('DT-HU 3','WDB9634031L100003'),('DT-OK 4','WDB9634031L100004')]):
        r=api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':'Dortmund'}); V[pl]='VIN:'+vin
    check(api('POST',f"/api/vehicles/{V['DT-RU 1']}/evaluation",{'excluded':True,'reason':'Verkauf offen (Test)'})['s']==200,'ruhend')
    r=api('POST','/api/cases',{'vehicle_id':V['DT-RU 1'],'description':'Bremse defekt','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})
    check(r['s'] in (200,201),'kritischer Vorgang am ruhenden Fahrzeug')
    r=api('POST','/api/cases',{'vehicle_id':V['DT-WT 2'],'description':'Spiegel','priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    def cmd(cl,action,payload={},note=None):
        ver=cl('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return cl('POST',f'/api/cases/{cid}/commands',b)
    check(cmd(api,'approve_repair',{'workshop_site':'DORTMUND'},'frei')['s']==200,'Reparatur freigegeben')
    wctx=br.new_context(); w=wctx.new_page(); w.goto(B); wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b]); wapi('POST','/api/login',{'username':'dt.werkstatt','password':PW})
    check(cmd(wapi,'start_repair')['s']==200 and cmd(wapi,'wait_parts',{},'Spiegelglas bestellt')['s']==200,'wartet auf Teile ohne Liefertermin')
    check(api('POST',f"/api/vehicles/{V['DT-HU 3']}/maintenance",{'kind':'UVV','last_done_date':'2024-01-10','interval_months':12,'evidence':'UVV-Protokoll (Test)'})['s'] in (200,201),'UVV überfällig')
    it=wapi('POST','/api/stock',{'name':'Filter DT','unit_price_net':'10','initial_qty':3})['d']['id']
    check(wapi('PATCH',f'/api/stock/{it}',{'active':False})['s']==200,'Artikel deaktiviert')
    for lang in ['en','uk','de']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dt.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang,'home_site':'Dortmund'}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dsitebar',timeout=15000); q.wait_for_timeout(600)
        rows=q.locator('.list a.row').all_inner_texts()
        wt=[x for x in rows if 'DT-WT 2' in x]; ru=[x for x in rows if 'DT-RU 1' in x]
        check(wt and UNK[lang] in wt[0],f'{lang} {wd}px: Rückkehr ungeklärt')
        check(ru and q.locator('[data-dormant]').count()==1,f'{lang} {wd}px: Ruhend-Kennzeichen')
        check('(1)' in q.inner_text('#dmover'),f'{lang} {wd}px: Überfällig-Link')
        check(q.locator('[data-fbk]').count()==4,f'{lang} {wd}px: Leiste mit Links')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Start ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dispo_{lang}_{wd}.png',full_page=True)
        q.click('#fbdormant'); q.wait_for_timeout(800)
        check(q.locator('#vl a.row').count()==1 and 'DT-RU 1' in q.inner_text('#vl'),f'{lang} {wd}px: Liste „Ruhend“')
        gs=q.evaluate("()=>[...document.querySelectorAll('[data-av]')].map(b=>b.dataset.av+':'+b.textContent).join('|')")
        check('gesperrt:' not in gs or 'gesperrt:' in gs and '(0)' in [x for x in gs.split('|') if x.startswith('gesperrt:')][0],f'{lang} {wd}px: Gesperrt ohne ruhende {gs}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Liste ohne Querscrollen')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    # Lager: Restbestand ausbuchen (Werkstatt, 390 px)
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dt.werkstatt','password':PW}]); q.goto(B+f'/#/stock/{it}'); q.reload(); q.wait_for_selector('#wof',timeout=15000)
    check(q.locator('#mf').is_hidden(),'Buchen-Formular verborgen')
    if SHOTS: q.screenshot(path=f'{SHOTS}/ausbuchen_390.png',full_page=True)
    q.fill('#wof_note','ausgelistet'); q.once('dialog',lambda d: d.accept()); q.click('#wof button'); q.wait_for_timeout(1200)
    check(q.locator('#wof').count()==0,'nach Ausbuchen kein Formular mehr')
    check(wapi('GET',f'/api/stock/{it}')['d']['item']['on_hand']==0,'Bestand 0')
    check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1') and not errs,f'Lager ohne Querscrollen/Fehler {errs}')
    ctx.close(); wctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
