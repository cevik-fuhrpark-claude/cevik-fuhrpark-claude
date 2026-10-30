# [CLAUDE] UI-Test (30.10.2026, Backlog 690–691, Blickwinkel „Fahrer rutscht beim Absteigen aus – Trittstufe oder Haltegriff defekt“): Meldeformular zeigt
# bei defekter/glatter Trittstufe oder Sturz beim Absteigen eigene Schritte (#step) statt zusätzlich „loses Teil“ (#loose);
# „Haltegriff repariert, wieder fest“ nicht. Hilfe zeigt den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Trittstufe Fahrerseite abgerissen, beim Absteigen ausgerutscht','uk':'Підніжка зламана, посковзнувся з кабіни','en':'Cab step broken, slipped getting out of the cab'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ts.inhaber','display_name':'TS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ts.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'TS-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM78{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ts.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#step'),f'{lang}/{w}: Trittstufen-Schritte bei „{TXT[lang]}“')
        check(q.evaluate("!document.querySelector('#step ul').hidden"),f'{lang}/{w}: Schritte aufgeklappt')
        check(not vis('#loose'),f'{lang}/{w}: kein zusätzlicher Hinweis „loses Teil“')
        tx=q.inner_text('#step'); check('step_' not in tx and len(tx)>200,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#step').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/trittstufe-{lang}-{w}.png')
        q.fill('#d','Haltegriff repariert, wieder fest'); q.wait_for_timeout(150)
        check(not vis('#step'),f'{lang}/{w}: repariert → kein Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        q.goto(B+'/#/help'); q.wait_for_timeout(1200)
        ht=q.inner_text('#app'); check('help_step' not in ht and (('Trittstufe' in ht) or ('Підніжка' in ht) or ('Step or grab' in ht)),f'{lang}/{w}: Hilfe-Abschnitt vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
