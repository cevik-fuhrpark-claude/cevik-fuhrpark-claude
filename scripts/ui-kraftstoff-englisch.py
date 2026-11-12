# [CLAUDE] UI-Test (12.11.2026, Backlog 1387, Blickwinkel „Fahrer meldet Kraftstoff/Tank auf Englisch“): Meldeformular zeigt bei
# englischen Kraftstoff-/Tankmeldungen die passenden Schritte (Dieseldiebstahl → Diebstahl, AdBlue-Tank mit Diesel → Falsch getankt,
# Dieselgeruch vom Motor → Leck, Tankgeber → Anzeige statt Fahrwerk, Tankband → loses Teil, verunreinigter Kraftstoff → Wasser im Diesel)
# und „I accidentally put AdBlue …“ keine Unfall-Schritte. Oberfläche DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('someone stole diesel from the tank overnight','#theft',None),('I filled the AdBlue tank with diesel','#fuel',None),
       ('I accidentally put AdBlue in the diesel tank','#fuel','#acc'),('diesel smell from the engine','#leak',None),
       ('fuel level sensor faulty','#dash','#susp'),('diesel tank strap is broken','#loose',None),('contaminated fuel from the station','#waterfuel',None)]
NO=['I filled the diesel tank with diesel','bad fuel consumption','nobody stole anything']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ke.inhaber','display_name':'KE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ke.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKE-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want,notw in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            check(vis(want),f'{lang}/{w}: „{txt}“ → {want}')
            if notw: check(not vis(notw),f'{lang}/{w}: „{txt}“ ohne {notw}')
            if SHOTS and want=='#theft': q.locator(want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kraftstoff-en-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not any(x in shown for x in ['fuel','theft','waterfuel']),f'{lang}/{w}: „{txt}“ ohne Kraftstoff-/Diebstahl-Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
