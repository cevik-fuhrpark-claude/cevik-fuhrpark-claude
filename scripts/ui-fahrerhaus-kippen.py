# [CLAUDE] UI-Test (25.10.2026, Backlog 326, Blickwinkel „Fahrerhaus lässt sich nicht kippen oder ist nicht verriegelt“): Meldeformular zeigt
# fünf Schritte (nicht verriegelt: nicht losfahren, halb gekippt: nicht darunter, Leitung, Fotos, Auswahl Fahrbereitschaft);
# „Kippbrücke geht nicht hoch“ zeigt keinen Fahrerhaus-Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Fahrerhaus-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Fahrerhaus lässt sich nicht kippen','uk':'Кабіна не перекидається','en':'Cab won’t tilt'}
BOTH={'de':'Unfall, Fahrerhaus nicht verriegelt','uk':'ДТП, кабіна не зафіксована','en':'Accident, cab not locked'}
NO={'de':'Kippbrücke geht nicht hoch','uk':'Двері пошкоджені','en':'Cab door won’t lock'}
HT={'de':'Fahrerhaus lässt sich nicht kippen oder ist nicht verriegelt','uk':'Кабіна не перекидається або не зафіксована','en':'Cab won’t tilt or is not locked'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nFK-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#cabtilt'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#cabtilt') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Fahrerhaus-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#cabtilt'),f'{lang}/{w}: Hinweis bei Fahrerhaus kippen/verriegeln')
        tx=q.inner_text('#cabtilt')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#cabtilt').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kippen-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#cabtilt') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#cabtilt ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Fahrerhaus eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=cabtilt'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_cabtilt' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
