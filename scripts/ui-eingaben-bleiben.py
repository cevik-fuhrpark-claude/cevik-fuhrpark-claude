# [CLAUDE] UI-Test: Neuaufbau derselben Seite nach einer Aktion behält fremde Eingaben, aufgeklappte Bereiche und die Scrollposition.
# 1) Fahrzeugakte: km-Stand getippt (nicht gespeichert), dann Wartungsregel gespeichert → km-Eingabe steht noch da, Bereich offen,
#    Seite springt nicht nach oben; Wartungsformular ist leer. Danach km speichern → km-Feld leer (gesendetes Formular nie zurück).
# 2) Vorgang: Kommentar senden → Kommentarfeld danach leer (kein versehentliches Doppelsenden).
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for i,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        vin=f'WDB96340310888{i:03d}'; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'vin':vin,'plate':f'FM-EB {i+1}','site':'Dortmund'})['s'] in (200,201),f'{w}px: Fahrzeug angelegt')
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#kf', state='attached')
        kd=q.locator('#kf').locator('xpath=ancestor::details'); kd.locator('summary').click()
        q.fill('#kf [name=km]','123456')
        md=q.locator('#mf').locator('xpath=ancestor::details'); md.locator('summary').click()
        q.fill('#mf [name=interval_months]','12'); q.fill('#mf [name=next_due_date]','2027-03-31'); q.fill('#mf [name=evidence]','UI-Test Beleg')
        q.locator('#mf').scroll_into_view_if_needed(); y0=q.evaluate('scrollY')
        q.locator('#mf button.btn').click()
        q.wait_for_function("()=>!document.querySelector('#mf [name=evidence]').value")
        q.wait_for_timeout(300)
        check(q.input_value('#kf [name=km]')=='123456',f'{w}px: getippter km-Stand bleibt nach Speichern der Wartung')
        check(q.evaluate("()=>document.querySelector('#kf').closest('details').open"),f'{w}px: km-Bereich bleibt aufgeklappt')
        y1=q.evaluate('scrollY')
        check(y0<50 or y1>50,f'{w}px: Seite springt nicht nach oben ({y0} → {y1})')
        check(q.input_value('#mf [name=interval_months]')=='',f'{w}px: gespeichertes Wartungsformular ist leer')
        if SHOTS: q.screenshot(path=f'{SHOTS}/eingaben_bleiben_{w}.png')
        q.locator('#kf button.btn').click()
        q.wait_for_function("()=>!document.querySelector('#kf [name=km]').value", timeout=10000)
        check(q.input_value('#kf [name=km]')=='',f'{w}px: gespeicherter km-Stand nicht erneut im Feld')
        kms=api('GET','/api/vehicles/'+vid)['d']
        check('123456' in str(kms),f'{w}px: km-Stand gespeichert')
        # Vorgang: Kommentar senden → Feld danach leer
        r=api('POST','/api/cases',{'vehicle_id':vid,'description':'UI-Test: Spiegel lose','priority':'niedrig','driveability':'fahrbereit','request_key':f'fm-eb-{i}'})
        cid=(r['d'] or {}).get('case',{}).get('id') or (r['d'] or {}).get('id')
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('#ct')
        q.fill('#ct','Bitte bis Freitag prüfen'); q.locator('#cf button.btn, #cf button:not([type=button])').last.click()
        q.wait_for_function("()=>document.querySelector('.timeline') && document.querySelector('.timeline').textContent.includes('Bitte bis Freitag prüfen')", timeout=10000)
        q.wait_for_timeout(300)
        check(q.input_value('#ct')=='',f'{w}px: gesendeter Kommentar nicht erneut im Feld')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
