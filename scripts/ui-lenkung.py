# [CLAUDE] UI-Test (25.10.2026, Backlog 316, Blickwinkel „Lenkung schwergängig, hat Spiel oder Lkw zieht zur Seite“): Meldeformular zeigt
# fünf Schritte (anhalten, Warnmeldung/Servolenkung → nicht bewegen, Leitung/nicht schrauben, Fotos/Situation, Auswahl Fahrbereitschaft);
# „Lenkzeit überschritten“ zeigt keinen Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Lenkungs-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Lenkung schwergängig','uk':'Кермо туго повертається','en':'Truck pulls to the right'}
BOTH={'de':'Unfall, Lkw zieht nach links','uk':'ДТП, тягне вправо','en':'Accident, steering is very heavy'}
NO={'de':'Lenkzeit überschritten','uk':'Двері пошкоджені','en':'Steering committee meeting'}
HT={'de':'Lenkung schwergängig, mit Spiel oder Lkw zieht zur Seite','uk':'Кермо туго повертається, має люфт або вантажівку тягне вбік','en':'Steering heavy, with play or truck pulling to one side'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'le.inhaber','display_name':'LE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'le.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLE-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'le.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#steer'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#steer') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Lenkungs-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#steer'),f'{lang}/{w}: Hinweis bei Lenkungsproblem')
        tx=q.inner_text('#steer')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#steer').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lenkung-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#steer') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#steer ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Lenkung eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=steer'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_steer' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
