# [CLAUDE] UI-Test (25.10.2026, Backlog 321, Blickwinkel „Sicherheitsgurt oder Fahrersitz defekt“): Meldeformular zeigt
# fünf Schritte (nicht ohne Gurt, Sitz nicht sicher, Leitung/nicht reparieren, Fotos/Seite, Auswahl Fahrbereitschaft);
# „Spanngurt gerissen“ zeigt keinen Gurt-Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Gurt-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Sicherheitsgurt rastet nicht ein','uk':'Сидіння зламане','en':'Seat belt won’t latch'}
BOTH={'de':'Unfall, Fahrersitz wackelt jetzt','uk':'ДТП, сидіння зламане','en':'Accident, seat belt torn'}
NO={'de':'Spanngurt gerissen','uk':'Двері пошкоджені','en':'Reefer unit fault'}
HT={'de':'Sicherheitsgurt oder Fahrersitz defekt','uk':'Несправний ремінь безпеки або сидіння водія','en':'Seat belt or driver’s seat faulty'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'si.inhaber','display_name':'SI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'si.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSI-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'si.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#seat'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#seat') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Gurt-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#seat'),f'{lang}/{w}: Hinweis bei Gurt-/Sitzschaden')
        tx=q.inner_text('#seat')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#seat').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gurt-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#seat') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#seat ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Gurt eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=seat'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_seat' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
