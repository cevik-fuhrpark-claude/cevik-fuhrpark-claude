# [CLAUDE] UI-Test: Aktionen ohne Netz melden einen Fehler statt still abzubrechen.
# 1) Management-Panel → Master-Eingang „Gesehen“ ohne Netz: Meldung, Eintrag bleibt offen; danach mit Netz entschieden.
# 3) Doppelklick auf „Anlegen“ legt nur einen Datensatz an, Doppelklick auf einen Aktionsknopf löst nur einmal aus (zentrale Sperren).
# 2) Sicherheitsnetz: Aktion gelingt, das Neuladen der Ansicht danach scheitert (Netz weg) → Meldung statt veralteter Seite ohne Hinweis.
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
    # je Breite ein eigener kritischer Vorgang → eigener offener Eintrag im Master-Eingang
    for i in range(3):
        api('POST','/api/vehicles',{'vin':f'WDB96340310777{i:03d}','plate':f'FM-ERR {i+1}','site':'Dortmund'})
        r=api('POST','/api/cases',{'vehicle_id':f'VIN:WDB96340310777{i:03d}','description':'UI-Test: Bremsleitung undicht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':f'fm-krit-{i}'})
        check(r['s'] in (200,201),'kritischer Vorgang angelegt '+str(r['s']))
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+'/#/master'); q.wait_for_selector('[data-dec][data-st="gesehen"]')
        link=q.locator('[data-dec][data-st="gesehen"]').first; ev=link.get_attribute('data-dec')
        q.route('**/api/master/*/decision', lambda r: r.abort())
        link.click(); q.wait_for_selector('.toast.err')
        check('Verbindung' in q.inner_text('.toast.err') or len(q.inner_text('.toast.err'))>3,f'{w}px: Meldung ohne Netz: '+q.inner_text('.toast.err'))
        if SHOTS: q.screenshot(path=f'{SHOTS}/fehlermeldung_master_{w}.png')
        check(q.locator(f'[data-dec="{ev}"]').count()==2,f'{w}px: Eintrag bleibt offen')
        check(q.locator(f'[data-dec="{ev}"][data-busy]').count()==0,f'{w}px: Link wieder bedienbar')
        q.unroute('**/api/master/*/decision'); q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.locator(f'[data-dec="{ev}"][data-st="erledigt"]').click()
        q.wait_for_function(f"()=>!document.querySelector('[data-dec=\"{ev}\"]')")
        check(q.locator('.toast.err').count()==0,f'{w}px: mit Netz entschieden, keine Fehlermeldung')
        # Sicherheitsnetz: Agentenlauf gelingt, Neuladen des Panels scheitert → Meldung (vorher still)
        q.route(lambda u: u.split('?')[0].endswith('/api/master'), lambda r: r.abort())
        q.click('#ra'); q.wait_for_selector('.toast.err', timeout=10000)
        check(len(q.inner_text('.toast.err'))>3,f'{w}px: Neuladen nach Aktion ohne Netz meldet Fehler: '+q.inner_text('.toast.err'))
        if SHOTS: q.screenshot(path=f'{SHOTS}/fehlermeldung_neuladen_{w}.png')
        # Doppelklick auf „Agent jetzt ausführen“ (Klick-Knopf ohne Formular) startet nur einen Lauf
        q.goto(B+'/#/master'); q.wait_for_selector('#ra'); runs=[]
        q.on('request', lambda r: runs.append(1) if r.method=='POST' and r.url.endswith('/api/agent/run') else None)
        q.locator('#ra').dblclick(); q.wait_for_timeout(1500)
        check(len(runs)==1,f'{w}px: Doppelklick startet genau einen Agentenlauf ({len(runs)})')
        # Doppelklick auf „Anlegen“ (neuer Fahrer) legt nur einen Datensatz an
        q.goto(B+'/#/drivers'); q.wait_for_selector('#ndf', state='attached')
        q.locator('#ndf').locator('xpath=ancestor::details').locator('summary').click()
        name=f'FM Doppelklick {w}'; q.fill('#ndf [name=display_name]', name)
        q.locator('#ndf button:not([type=button])').last.dblclick()
        q.wait_for_function("()=>/#\\/drivers\\/[\\w-]+$/.test(location.hash)")
        q.wait_for_timeout(500)
        n=sum(1 for d in q.evaluate(JS,['GET','/api/drivers'])['d']['drivers'] if d['display_name']==name)
        check(n==1,f'{w}px: Doppelklick legt genau einen Fahrer an ({n})')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        sw=q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"); check(sw,f'{w}px: kein Querscrollen')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'UI Fehlermeldungen: alles grün')
raise SystemExit(1 if fails else 0)
