# [CLAUDE] UI-Test (07.11.2026, Backlog 1132, Sonde Federung/Sitz): „Fahrersitz Luftfederung verliert Luft“ zeigt im Meldeformular die
# Sitz-Schritte (#seat) statt der Federungs-Schritte (#susp); Fahrzeugfederung zeigt weiter #susp; Bremszylinder verliert Luft → #brake (1134);
# Radmutter-Anzeiger verdreht → #wheel, Stein zwischen Zwillingsreifen → #tyre (1135). DE/UK/EN bei 390/820/1366 px, kein
# Querscrollen, keine Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SEAT={'de':'Fahrersitz Luftfederung verliert Luft','uk':'пневмопідвіска сидіння водія не працює','en':'driver seat air suspension leaking'}
BRK={'de':'Bremszylinder hinten links verliert Luft','uk':'гальмівна камера травить повітря','en':'brake chamber leaking air'}
WNUT={'de':'Radmutteranzeiger hinten links verdreht','uk':'бракує колісної гайки зліва','en':'wheel nut indicators moved rear left'}
TSTONE={'de':'Stein zwischen den Zwillingsreifen eingeklemmt','uk':'у шині цвях','en':'stone stuck between the twin wheels'}
SUSP={'de':'Luftfederung hinten links verliert Luft','uk':'пневмопідвіска задня ліва спускає','en':'air suspension rear left leaking'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sf.inhaber','display_name':'SF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'SF-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM79{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sf.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',SEAT[lang]); q.wait_for_timeout(150)
        check(vis('#seat') and not vis('#susp'),f'{lang}/{w}: Sitz-Schritte statt Federung bei „{SEAT[lang]}“')
        if SHOTS: q.locator('#seat').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sitzfederung-{lang}-{w}.png')
        q.fill('#d',SUSP[lang]); q.wait_for_timeout(150)
        check(vis('#susp') and not vis('#seat'),f'{lang}/{w}: Fahrzeugfederung → Federungs-Schritte')
        q.fill('#d',BRK[lang]); q.wait_for_timeout(150)
        check(vis('#brake'),f'{lang}/{w}: Luftverlust am Bremszylinder → Bremsen-Schritte (Backlog 1134)')
        q.fill('#d',WNUT[lang]); q.wait_for_timeout(150)
        check(vis('#wheel'),f'{lang}/{w}: Radmutter-Anzeiger/fehlende Mutter → Räder-Schritte (Backlog 1135)')
        q.fill('#d',TSTONE[lang]); q.wait_for_timeout(150)
        check(vis('#tyre'),f'{lang}/{w}: Stein/Nagel → Reifen-Schritte (Backlog 1135)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
