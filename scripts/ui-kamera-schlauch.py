# [CLAUDE] UI-Test (26.10.2026, Backlog 359–362): Meldeformular zeigt bei „Rückfahrkamera beschlagen“ den Assistenz-, bei „Kühlerschlauch geplatzt“
# den Leck-, bei „Luftschlauch geplatzt“ den Bremsen-, bei „Kühlergrill hängt herunter“ den Teile-, bei „Tachometer zeigt nichts“ den Anzeige- und bei
# „Fahrersitz verliert Luft“ den Sitz-Hinweis, bei „Feststellbremse festgefroren“ den Bremsen- und bei „Sattelzug eingeknickt“ den Unfall-Hinweis (Backlog 361–362); „Kamera gereinigt“ zeigt keinen. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES={
 'de':[('Rückfahrkamera beschlagen','#adas'),('Kühlerschlauch geplatzt','#leak'),('Luftschlauch geplatzt','#brake'),('Kühlergrill hängt herunter','#loose'),('Tachometer zeigt nichts','#dash'),('Fahrersitz verliert Luft','#seat'),('Feststellbremse festgefroren','#brake'),('Sattelzug auf Glatteis eingeknickt','#acc')],
 'uk':[('камера заднього виду запітніла','#adas'),('патрубок радіатора лопнув','#leak'),('повітряний шланг лопнув','#brake'),('решітка радіатора відвалилась','#loose'),('спідометр не працює','#dash'),('сидіння зламане','#seat'),('гальма примерзли','#brake'),('фура склалась на льоду','#acc')],
 'en':[('reversing camera fogged up','#adas'),('coolant hose burst','#leak'),('air hose burst','#brake'),('grille came off','#loose'),('speedometer not working','#dash'),('driver seat losing air','#seat'),('air tanks frozen','#brake'),('jackknifed on ice','#acc')]}
NO={'de':'Kamera gereinigt','uk':'камеру почистили','en':'camera cleaned'}
IDS=['#adas','#leak','#brake','#loose','#dash','#seat','#acc']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ks.inhaber','display_name':'KS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ks.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM79' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKS-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ks.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not any(vis(i) for i in IDS),f'{lang}/{w}: „{NO[lang]}“ → kein Hinweis')
        for txt,sel in CASES[lang]:
            q.fill('#d',txt); q.wait_for_timeout(100)
            check(vis(sel) and q.inner_text(sel).count('\n')>=2,f'{lang}/{w}: „{txt}“ → {sel} mit Schritten')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: „{txt}“ ohne Querscrollen')
            if SHOTS and sel in ('#adas','#leak'): q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kamera-schlauch-{sel[1:]}-{lang}-{w}.png')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
