# [CLAUDE] UI-Test (31.10.2026, Backlog 782): UK/RU-Meldungen mit Reparaturvermerk („педаль газу заїдає, замінили“, „немає катафота, замінили“,
# „запаска спущена, замінили“, „підлога в причепі зламана, заварили“) zeigen wie DE/EN keinen Hinweis; ohne Vermerk erscheint er weiter
# (Gaspedal, Konturmarkierung, Ersatzrad, Ladeboden, Zentralschmierung, Batterie „акумулятор потік“). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
POS={'de':[('Gaspedal klemmt','#pedal'),('Ersatzrad fehlt','#spare')],
     'uk':[('педаль газу заїдає','#pedal'),('немає катафота','#contour'),('запаска спущена','#spare'),('підлога в причепі зламана','#floor'),('сідло сухе','#grease'),('акумулятор потік','#batt')],
     'en':[('accelerator pedal stuck','#pedal'),('spare wheel missing','#spare')]}
NEG={'de':[('Gaspedal klemmt, repariert','#pedal')],
     'uk':[('педаль газу заїдає, замінили','#pedal'),('немає катафота, замінили','#contour'),('запаска спущена, замінили','#spare'),('підлога в причепі зламана, заварили','#floor'),('сідло сухе, полагодили','#grease'),('педаль газа заедает, отремонтировали','#pedal')],
     'en':[('accelerator pedal stuck, fixed','#pedal')]}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'al.inhaber','display_name':'AL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'al.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAL-ZM 2;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'al.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for i,(txt,sel) in enumerate(POS[lang]):
            q.fill('#d',txt); q.wait_for_timeout(100)
            check(vis(sel),f'{lang}/{w}: „{txt}“ → {sel}')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
            if SHOTS and i==0: q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reparatur-ukru-{lang}-{w}.png')
        for txt,sel in NEG[lang]:
            q.fill('#d',txt); q.wait_for_timeout(100)
            check(not vis(sel),f'{lang}/{w}: „{txt}“ → kein {sel}')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
