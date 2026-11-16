# [CLAUDE] UI-Test (16.11.2026, Backlog 1543, Blickwinkel „Fahrer aus den Philippinen schreibt Tagalog/Taglish“):
# Meldeformular zeigt bei „sira ang preno“, „flat ang gulong“, „ayaw mag-start ng makina“, „nasusunog ang truck“, „tumutulo ang langis“,
# „nabangga ako“, „hindi lumalamig ang reefer“, „ninakaw ang diesel“ u. a. den passenden Hinweis; Reparaturvermerk („naayos na“, „napalitan na“),
# Verneinung („walang tagas“, „walang aksidente“, „hindi tumutulo ang langis“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["sira ang preno", "brake"], ["walang preno", "brake"], ["flat po yung gulong sa harap", "flat"], ["kalbo na ang gulong", "tyre"], ["matigas ang manibela", "steer"],
       ["tumutulo ang langis", "leak"], ["nasusunog ang truck", "fire"], ["nabangga ako", "acc"], ["nasugatan ako", "injury"], ["ayaw mag-start ng makina", "nostart"],
       ["nag-overheat ang makina", "engine"], ["maitim na usok sa tambutso", "engine"], ["sira yung salamin sa gilid", "mirror"], ["patay ang ilaw", "lights"],
       ["lowbat ang baterya", "batt"], ["na-block ang fuel card", "fuelcard"], ["nawala ang susi", "lost"], ["kumalas ang trailer", "coupling"],
       ["naubusan ako ng diesel", "dryfuel"], ["hindi lumalamig ang reefer", "reefer"], ["hindi lumalamig ang aircon", "climate"], ["punit ang trapal", "tarp"],
       ["nalaglag ang tambutso", "exhaust"], ["ayaw magsara ng pinto", "door"], ["na-stuck sa putik ang truck", "stuck"], ["ayaw pumasok ng gear", "gear"],
       ["maluwag ang mga nut ng gulong", "wheel"], ["ninakaw ang diesel", "theft"], ["sinira ng kung sino ang trapal", "tarp,vandal"], ["ayaw tumaas ng bintana", "window"]]
NO=["okay na ang preno", "naayos na ang preno", "napalitan na ang gulong", "walang tagas", "hindi tumutulo ang langis", "walang aksidente", "walang sunog",
    "ayos lang lahat", "pauwi na ako", "nasa ospital ang anak ko", "mainit ang panahon ngayon", "gumagana na ang aircon"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tlg.inhaber','display_name':'TLG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='tlg.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nTL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(','.join(sorted(shown))==want,f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('sira ang preno','nasusunog ang truck'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tlg-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
