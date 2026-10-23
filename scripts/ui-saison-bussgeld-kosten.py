# [CLAUDE] UI-Test (23.10.2026, Teilagenten „Reifenwechsel-Saison“ / „Fahrerwechsel bei offenem Bußgeld“ / „Jahresabschluss Kosten“):
# Reifen: Sprung aus Reifen – Flotte (#/vehicles/…?sec=tires) zeigt den Abschnitt Reifen mit aufgeklappter Erfassung; nach dem Speichern bleibt
# die Erfassung offen (Art und km-Stand bleiben, Position rückt weiter, Profiltiefe leer). Bußgeld: „Angaben ändern“ mit Tatzeit (Berliner Ortszeit),
# Änderung erscheint in Anzeige und Verlauf. Kosten: Knopf „CSV Einzelpositionen“. Werkstattplan: 60 Tage, Standort je Zeile.
# Management: „Zuletzt entschieden/erledigt“ mit Person und Vermerk. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sb.inhaber','display_name':'SB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']
    u=api('POST','/api/users',{'username':'sb.werkstatt','display_name':'SB WS','role':'workshop','environment':env,'workshop_site':'DORTMUND'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    VIDS=[]
    for i in range(9):
        vin=f'WDB9634031L2000{i:02d}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'SB-RW {i+1}','site':'Dortmund'}); VIDS.append('VIN:'+vin)
    f=api('POST','/api/fines',{'kind':'anhoerung','offense_type':'geschwindigkeit','offense_at':'2026-10-15T09:30','plate_in_letter':'SB-RW 1','authority':'Stadt Test','reference':'AZ-SB-1'})
    check(f['s'] in (200,201),'Bußgeld angelegt'); FID=f['d']['id']
    # zweiter Standort + Prüftermin je Standort im Folgemonat; Agentenbefund entschieden (Vertretung)
    for i,(pl,site) in enumerate([('SB-HA 1','Hamm'),('SB-DO 2','Dortmund')]):
        vin=f'WDB9634031L3000{i:02d}'; api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':site})
        api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'UVV','last_done_date':'2025-09-10','interval_months':12,'evidence':'UVV-Protokoll (Test)'})
    api('POST','/api/agent/run'); mi=api('GET','/api/master')['d']['inbox']
    print('  Übergaben:', len(mi))
    if mi: api('POST',f"/api/master/{mi[0]['event_id']}/decision",{'decision_status':'erledigt','note':'Vertretung: Fahrer angerufen'})
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sb.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        vid=VIDS[n]; n+=1
        q.goto(B+'/#/vehicles/'+vid+'?sec=tires'); q.reload(); q.wait_for_selector('#tf',timeout=15000); q.wait_for_timeout(700)
        top=q.evaluate("()=>document.querySelector('#tires-h').getBoundingClientRect().top")
        check(-5<=top<=120,f'{lang} {wd}px: Sprung zum Abschnitt Reifen (top={top:.0f})')
        check(q.evaluate("()=>document.querySelector('#tf').closest('details').open"),f'{lang} {wd}px: Erfassung aufgeklappt')
        first=q.evaluate("()=>document.querySelector('#tf [name=position]').value")
        q.fill('#tf [name=tread_mm]','8'); q.fill('#tf [name=odometer_km]','123456'); q.click('#tf button.btn'); q.wait_for_timeout(1200)
        st=q.evaluate("()=>{const f=document.querySelector('#tf'); const o=[...f.position.options].map(x=>x.value); return {open:f.closest('details').open, km:f.odometer_km.value, tread:f.tread_mm.value, pos:f.position.value, ev:f.event_type.value, idx:o.indexOf(f.position.value)}}")
        check(st['open'] and st['km']=='123456' and st['tread']=='' and st['ev']=='messung',f'{lang} {wd}px: Erfassung bleibt offen, km bleibt, Profil leer {st}')
        check(st['pos']!=first and st['idx']==1,f'{lang} {wd}px: Position weiter')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Akte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/reifen_{lang}_{wd}.png')
        # Inhaber: Bußgeld „Angaben ändern“ mit Tatzeit, Kosten-Knopf
        o=br.new_context(viewport={'width':wd,'height':h}); r=o.new_page(); r.on('pageerror',lambda e: errs.append(str(e)))
        r.goto(B); r.evaluate(JS,['POST','/api/login',{'username':'sb.inhaber','password':PW}]); r.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        r.goto(B+'/#/fines/'+FID); r.reload(); r.wait_for_selector('#uf',state='attached',timeout=15000)
        r.click('#uf >> xpath=..//summary'); r.wait_for_timeout(200)
        cur=r.input_value('#uf [name=offense_at]')
        check(cur in ('2026-10-15T09:30','2026-09-15T09:30'),f'{lang} {wd}px: Tatzeit als Berliner Ortszeit ({cur})')
        new='2026-09-15T09:30' if cur.startswith('2026-10') else '2026-10-15T09:30'
        r.fill('#uf [name=offense_at]',new); r.click('#uf button.btn'); r.wait_for_timeout(1200)
        txt=r.inner_text('main') if r.locator('main').count() else r.inner_text('body')
        dd=new[8:10]+'.'+new[5:7]+'.'+new[:4] if lang=='de' else new[8:10]
        check(dd in txt and '09:30' in txt,f'{lang} {wd}px: neue Tatzeit angezeigt')
        check(r.locator('ol.timeline li').count()>=2,f'{lang} {wd}px: Verlauf mit Änderung')
        check(r.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Bußgeld ohne Querscrollen')
        if SHOTS: r.screenshot(path=f'{SHOTS}/bussgeld_{lang}_{wd}.png',full_page=True)
        r.goto(B+'/#/costs'); r.wait_for_selector('#csvi',timeout=15000)
        check(r.locator('#csvi').is_visible() and len(r.inner_text('#csvi').strip())>3,f'{lang} {wd}px: Knopf Einzelpositionen')
        check(r.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Kosten ohne Querscrollen')
        if SHOTS: r.screenshot(path=f'{SHOTS}/kosten_{lang}_{wd}.png')
        r.goto(B+'/#/plan'); r.wait_for_selector('#pdays',timeout=15000)
        check(r.locator('#pdays option[value="60"]').count()==1,f'{lang} {wd}px: Plan bis 60 Tage')
        check(r.locator('[data-vsite]').count()>=2,f'{lang} {wd}px: Fahrzeug-Standort je Zeile')
        check(r.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Plan ohne Querscrollen')
        if SHOTS: r.screenshot(path=f'{SHOTS}/plan_{lang}_{wd}.png',full_page=True)
        if mi:
            r.goto(B+'/#/master'); r.wait_for_selector('#decdone',timeout=15000); r.click('#decdone summary'); r.wait_for_timeout(200)
            check('Vertretung: Fahrer angerufen' in r.inner_text('#decdone') and 'SB Inhaber' in r.inner_text('#decdone'),f'{lang} {wd}px: zuletzt entschieden mit Person und Vermerk')
            check(r.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Management ohne Querscrollen')
        else: check(False,'kein Agentenbefund für die Vertretungsprüfung')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close(); o.close()
    br.close()
print('UI saison/bussgeld/kosten:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
