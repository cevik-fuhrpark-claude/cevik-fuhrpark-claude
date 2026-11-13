# [CLAUDE] UI-Test (13.11.2026, Backlog 1457, Blickwinkel „Fahrer schreibt die Meldung auf Tschechisch/Slowakisch“):
# Meldeformular zeigt bei tschechischen/slowakischen Stichwörtern (auch ohne Häkchen/Striche getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1456) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('brzdy nefungují', 'brake'), ('BRZDY NEFUNGUJI', 'brake'), ('nebrzdí to', 'brake'), ('padá tlak vzduchu', 'brake'), ('brzdy nefungujú', 'brake'), ('ruční brzda nedrží', 'parkbrake'), ('ručná brzda nedrží', 'parkbrake'), ('kamion se rozjel sám', 'parkbrake'), ('z kabiny jde kouř', 'fire'), ('ide dym z kabíny', 'fire'), ('kabina hoří', 'fire'), ('smrdí to spáleninou', 'fire'), ('píchl jsem', 'flat'), ('praskla pneumatika', 'flat'), ('mám defekt', 'flat'), ('pneumatika praskla', 'flat'), ('volant je zablokovaný', 'steer'), ('tahá doprava', 'steer'), ('teče olej', 'leak'), ('olej kape', 'leak'), ('tečie nafta', 'leak'), ('měl jsem nehodu', 'acc'), ('mal som nehodu', 'acc'), ('naboural jsem', 'acc'), ('měl jsem nehodu, jsem zraněný', 'acc'), ('jsem zraněný', 'injury'), ('volal jsem záchranku', 'injury'), ('motor nestartuje', 'nostart'), ('nenaštartuje', 'nostart'), ('nejde nastartovat', 'nostart'), ('zrcátko ulomené', 'mirror'), ('spätné zrkadlo rozbité', 'mirror'), ('světla nesvítí', 'lights'), ('svetlá nesvietia', 'lights'), ('prasklá žárovka', 'lights'), ('svítí kontrolka motoru', 'warnlight'), ('rozsvietila sa kontrolka', 'warnlight'), ('čelní sklo prasklé', 'glass'), ('prasklo čelné sklo', 'glass'), ('okno nejde stáhnout', 'window'), ('baterie vybitá', 'batt'), ('batéria je vybitá', 'batt'), ('tachograf nečte kartu', 'tacho'), ('tachograf nečíta kartu', 'tacho'), ('ztratil jsem kartu řidiče', 'tacho'), ('návěs nejde zapojit', 'coupling'), ('točnice nezavírá', 'coupling'), ('došla nafta', 'dryfuel'), ('minula sa nafta', 'dryfuel'), ('motor se přehřívá', 'engine'), ('motor sa prehrieva', 'engine'), ('nemá výkon', 'engine'), ('pneumatika poškozená', 'tyre'), ('pneumatika ztrácí vzduch', 'tyre'), ('agregát nechladí', 'reefer'), ('měch praskl', 'susp'), ('nejde zařadit rychlost', 'gear'), ('spojka prokluzuje', 'gear'), ('spojka prekĺzava', 'gear'), ('klimatizace nefunguje', 'climate'), ('topení netopí', 'climate'), ('kúrenie nekúri', 'climate'), ('plachta roztržená', 'tarp'), ('výfuk upadl', 'exhaust'), ('stěrače nefungují', 'visib'), ('stierače nefungujú', 'visib'), ('pás nejde zapnout', 'seat'), ('šrouby kola povolené', 'wheel'), ('skrutky kolesa uvoľnené', 'wheel'), ('zapadl jsem v blátě', 'stuck'), ('zapadol som v snehu', 'stuck'), ('ztratil jsem klíče', 'lost'), ('stratil som kľúče', 'lost'), ('SPZ upadla', 'numplate'), ('asistent jízdy v pruhu nefunguje', 'adas'), ('brzdí sám od sebe', 'adas'), ('dveře nejdou zavřít', 'door'), ('dvere nejdú zatvoriť', 'door'), ('hydraulické čelo nefunguje', 'door'), ('havarijní režim', 'engine'), ('nouzový režim', 'engine'), ('nem fog a fék', 'brake'), ('kočnice ne rade', 'brake')]
NO=['brzdy opraveny', 'pneumatika vyměněna, je v pořádku', 'kouř z výfuku', 'černý kouř z výfuku', 'kamínek praskl čelní sklo', 'nemám hasicí přístroj', 'vyhřívání sedadla nefunguje', 'tanková karta nefunguje', 'nevím', 'motor funguje normálně', 'už funguje']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'cs.inhaber','display_name':'CS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='cs.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nCS-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('brzdy nef','agregát','ztratil jsem k')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/cs-{txt[:5]}-{lang}-{w}.png')
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
