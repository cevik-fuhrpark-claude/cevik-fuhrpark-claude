# [CLAUDE] UI-Test (07.11.2026, Backlog 1130, Blickwinkel „Fahrer findet einen Strafzettel am Lkw bzw. wurde geblitzt“): Meldeformular zeigt
# eigene Schritte (#ticket), beim Strafzettel „an der Windschutzscheibe“ keine Glasschaden-Schritte (#glass); echter Glasschaden daneben zeigt
# beide; „Windschutzscheibe gerissen“ nur Glas; Halterung an der Scheibe keine Glas-Schritte (Backlog 1131); Seitenscheibe beschlagen → Sicht (1133). Hilfe zeigt den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Strafzettel an der Windschutzscheibe gefunden','uk':'штраф за паркування на лобовому склі','en':'parking ticket on the windscreen'}
BOTH={'de':'Strafzettel an der Windschutzscheibe, außerdem Steinschlag','uk':'штраф на лобовому склі, а ще скол на лобовому склі','en':'parking ticket on the windscreen, windscreen also cracked'}
GLASS={'de':'Windschutzscheibe gerissen','uk':'тріщина на лобовому склі','en':'windscreen cracked'}
FOG={'de':'Seitenscheibe von innen beschlagen','uk':'бокове скло запотіває','en':'side window fogged up'}
OBJ={'de':'Navi-Halterung an der Windschutzscheibe fällt ab','uk':'тримач телефону на лобовому склі відпав','en':'phone holder on the windscreen fell off'}
HT={'de':'Strafzettel, Verwarnung oder geblitzt','uk':'Штраф, попередження чи камера швидкості','en':'Parking ticket, fine notice or speed camera'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'SZ-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM79{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#ticket'),f'{lang}/{w}: Strafzettel-Schritte bei „{TXT[lang]}“')
        check(not vis('#glass'),f'{lang}/{w}: keine Glasschaden-Schritte')
        check(q.evaluate("!document.querySelector('#ticket ul').hidden"),f'{lang}/{w}: Schritte aufgeklappt')
        tx=q.inner_text('#ticket'); check('ticket_' not in tx and 'undefined' not in tx and len(tx)>200,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#ticket').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/strafzettel-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(150)
        check(vis('#ticket') and vis('#glass'),f'{lang}/{w}: Strafzettel + echter Glasschaden → beide Schritte')
        q.fill('#d',GLASS[lang]); q.wait_for_timeout(150)
        check(vis('#glass') and not vis('#ticket'),f'{lang}/{w}: nur Glasschaden → nur Glas-Schritte')
        q.fill('#d',OBJ[lang]); q.wait_for_timeout(150)
        check(not vis('#glass') and not vis('#ticket'),f'{lang}/{w}: Halterung an der Scheibe → keine Glas-Schritte (Backlog 1131)')
        q.fill('#d',FOG[lang]); q.wait_for_timeout(150)
        check(not vis('#glass') and vis('#visib'),f'{lang}/{w}: Seitenscheibe beschlagen → Sicht statt Glas (Backlog 1133)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        q.goto(B+'/#/help'); q.wait_for_timeout(1200)
        ht=q.inner_text('#app'); check('help_ticket' not in ht and HT[lang] in ht,f'{lang}/{w}: Hilfe-Abschnitt vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
