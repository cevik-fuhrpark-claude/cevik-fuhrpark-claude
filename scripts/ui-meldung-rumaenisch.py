# [CLAUDE] UI-Test (13.11.2026, Backlog 1454, Blickwinkel „Fahrer schreibt die Meldung auf Rumänisch“):
# Meldeformular zeigt bei rumänischen Stichwörtern (auch ohne ă/î/ș/ț getippt) dieselben Hinweise wie bei polnischen (Backlog 1453) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('frânele nu funcționează','brake'),('franele nu functioneaza','brake'),('pierde aer, scade presiunea','brake'),('frâna de mână nu ține','parkbrake'),('iese fum din cabină','fire'),('am făcut pană','flat'),('a explodat anvelopa','flat'),
 ('volanul e blocat','steer'),('curge ulei','leak'),('am avut un accident','acc'),('sunt rănit','injury'),('motorul nu pornește','nostart'),('oglinda e ruptă','mirror'),('farul nu funcționează','lights'),
 ('s-a aprins martorul de motor','warnlight'),('parbrizul e crăpat','glass'),('geamul nu se deschide','window'),('bateria e descărcată','batt'),('tahograful nu citește cardul','tacho'),('semiremorca nu se cuplează','coupling'),
 ('am rămas fără motorină','dryfuel'),('motorul se supraîncălzește','engine'),('anvelopa e tăiată','tyre'),('agregatul nu răcește','reefer'),('perna de aer e spartă','susp'),('viteza nu intră','gear'),('clima nu funcționează','climate'),
 ('prelata e ruptă','tarp'),('țeava de eșapament e ruptă','exhaust'),('ștergătoarele nu funcționează','visib'),('centura nu se închide','seat'),('prezoanele sunt slăbite','wheel'),('m-am împotmolit în noroi','stuck'),('am pierdut cheile','lost'),
 ('numărul de înmatriculare a căzut','numplate'),('asistentul de bandă nu funcționează','adas'),('ușa nu se închide','door'),('liftul nu funcționează','door'),
 ('hamulce nie działają','brake'),('fren tutmuyor','brake')]
NO=['frânele reparate','anvelopa înlocuită, totul ok','fum din eșapament','o piatră a lovit parbrizul','lipsește stingătorul','încălzirea scaunului nu funcționează','am sunat la asistența rutieră','nu știu']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ro.inhaber','display_name':'RO Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ro.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nRO-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(shown==[want],f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt.startswith(('frânele nu','agregat','am pierdut')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rumaenisch-{txt[:5]}-{lang}-{w}.png')
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
