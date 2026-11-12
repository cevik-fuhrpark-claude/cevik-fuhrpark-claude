# [CLAUDE] UI-Test (12.11.2026, Backlog 1400, Sonde Blickwinkel „Fahrer meldet Plane/Curtainsider/Aufbau auf Englisch“):
# Meldeformular zeigt bei „curtainside is torn“, „sliding roof is jammed“, „water coming through the trailer roof“ die Planen-Schritte,
# „the customs seal cable is broken“ Plane ohne Elektrik, „dropside won't close“ Ladeboden/Aufbau, „one of the back doors is hanging off“ Tür;
# „the curtain is not ripped“, „the curtain was ripped, fixed now“ ohne Planen-Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('curtainside is torn','#tarp',None),('sliding roof is jammed','#tarp',None),('water coming through the trailer roof','#tarp',None),('the customs seal cable is broken','#tarp','#elec'),("dropside won't close",'#floor',None),('one of the back doors is hanging off','#door',None)]
NO=['the curtain is not ripped','the curtain was ripped, fixed now']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sk.inhaber','display_name':'SK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sk.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSK-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith('curtainside'): q.locator(want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plane-en-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check('tarp' not in shown,f'{lang}/{w}: „{txt}“ ohne Planen-Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
