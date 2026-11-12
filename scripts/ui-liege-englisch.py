# [CLAUDE] UI-Test (12.11.2026, Backlog 1397, Blickwinkel „Fahrer meldet Schlafkabine/Liege (bunk) und Fahrerhaus-Ausstattung auf Englisch“):
# Meldeformular zeigt bei „the bunk won't fold up“, „bunk strap is broken“, „the cab fridge isn't cooling“, „the privacy curtain is torn“,
# „the overhead locker won't stay shut“ die Ausstattungs-Schritte (ohne Plane/Kühlaufbau); „the curtains won't close“ bleibt Plane,
# „the fridge lost power“ Kühlaufbau; „the cupboard door is broken“ ohne Tür-Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("the bunk won't fold up",'#cabkit',None),('bunk strap is broken','#cabkit',None),("the cab fridge isn't cooling",'#cabkit','#reefer'),
       ('the privacy curtain is torn','#cabkit','#tarp'),("the overhead locker won't stay shut",'#cabkit',None),('the cupboard door is broken','#cabkit','#door'),
       ("the curtains won't close",'#tarp','#cabkit'),('the fridge lost power','#reefer','#cabkit')]
NO=['the bunk strap was broken, fixed now','the blind spot camera is broken','the trailer bed is broken']
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
            if SHOTS and txt.startswith('the bunk'): q.locator(want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/bunk-en-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check('cabkit' not in shown,f'{lang}/{w}: „{txt}“ ohne Ausstattungs-Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
