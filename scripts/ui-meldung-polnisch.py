# [CLAUDE] UI-Test (13.11.2026, Backlog 1453, Blickwinkel „Fahrer schreibt die Meldung auf Polnisch“):
# Meldeformular zeigt bei polnischen Stichwörtern (auch ohne ą/ł/ó getippt) dieselben Hinweise wie bei türkischen (Backlog 1407) – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('hamulce nie działają','brake'),('hamulce nie dzialaja','brake'),('spada ciśnienie powietrza','brake'),('hamulec ręczny nie trzyma','parkbrake'),('dym z kabiny','fire'),('złapałem gumę','flat'),('pękła opona','flat'),
 ('kierownica zablokowana','steer'),('cieknie olej','leak'),('miałem wypadek','acc'),('jestem ranny','injury'),('silnik nie odpala','nostart'),('lusterko urwane','mirror'),('lampy tylne nie świecą','lights'),
 ('świeci się kontrolka silnika','warnlight'),('szyba pękła','glass'),('szyba nie otwiera się','window'),('akumulator padł','batt'),('tachograf nie działa','tacho'),('naczepa nie chce się zapiąć','coupling'),
 ('skończyło się paliwo','dryfuel'),('silnik się przegrzewa','engine'),('opona przecięta','tyre'),('agregat nie chłodzi','reefer'),('miech pękł','susp'),('bieg nie wchodzi','gear'),('klima nie działa','climate'),
 ('plandeka rozdarta','tarp'),('tłumik urwany','exhaust'),('wycieraczki nie działają','visib'),('pas nie zapina','seat'),('śruby koła poluzowane','wheel'),('zakopałem się w błocie','stuck'),('zgubiłem kluczyki','lost'),
 ('tablica rejestracyjna odpadła','numplate'),('asystent pasa ruchu nie działa','adas'),('drzwi nie zamykają się','door'),('winda nie działa','door')]
NO=['hamulce naprawione','opona wymieniona, wszystko ok','dym z wydechu','kamień uderzył w szybę','brak gaśnicy','poduszka powietrzna sprawna','ogrzewanie fotela nie działa','dzwoni pogotowie techniczne']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pl.inhaber','display_name':'PL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='pl.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nPL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('hamulce nie dz','agregat','zgubi')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/polnisch-{txt[:5]}-{lang}-{w}.png')
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
