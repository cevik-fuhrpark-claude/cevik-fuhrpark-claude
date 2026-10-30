# [CLAUDE] UI-Test (30.10.2026, Backlog 685–687, Blickwinkel „Kennzeichen verloren, gestohlen oder unleserlich“): Meldeformular zeigt
# bei verlorenem/gestohlenem Kennzeichen eigene Schritte (#numplate), „Kennzeichen SZ-YC 5501, Spiegel kaputt“ nicht;
# Vorgang zeigt der Leitung den Hinweis „Ersatz über die Zulassungsstelle, neues Kennzeichen in den Stammdaten“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Kennzeichen hinten über Nacht abgeschraubt','uk':'Номерний знак відпав у дорозі','en':'Rear number plate fell off on the motorway'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ma.inhaber','display_name':'MA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ma.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'MA-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM76{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    vid=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']==plate][0]['id']
    cr=api('POST','/api/cases',{'vehicle_id':vid,'description':'Kennzeichen am Auflieger ist abgefallen','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(cr['s']==201,'Vorgang angelegt'); cid=cr['d']['id']
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ma.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#numplate'),f'{lang}/{w}: Kennzeichen-Schritte bei „{TXT[lang]}“')
        check(not vis('#loose'),f'{lang}/{w}: kein zusätzlicher Hinweis „loses Teil“')
        tx=q.inner_text('#numplate'); check('numplate_' not in tx and len(tx)>80,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#numplate').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kennzeichen-{lang}-{w}.png')
        q.fill('#d','Kennzeichen SZ-YC 5501, Spiegel kaputt'); q.wait_for_timeout(150)
        check(not vis('#numplate'),f'{lang}/{w}: Kennzeichen + Spiegel → kein Kennzeichen-Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-claimnumplate]',timeout=15000)
        tx=q.inner_text('[data-claimnumplate]')
        check(len(tx)>20 and 'cp_' not in tx and '{' not in tx,f'{lang}/{w}: Hinweis für die Leitung im Vorgang')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS: q.locator('[data-claimnumplate]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kennzeichen-vorgang-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
