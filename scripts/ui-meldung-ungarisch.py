# [CLAUDE] UI-Test (13.11.2026, Backlog 1456, Blickwinkel „Fahrer schreibt die Meldung auf Ungarisch“):
# Meldeformular zeigt bei ungarischen Stichwörtern (auch ohne Akzente getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1455) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('nem fog a fék', 'brake'), ('a fékek nem működnek', 'brake'), ('NEM FOG A FEK', 'brake'), ('gyengén fékez', 'brake'), ('esik a levegőnyomás', 'brake'), ('a kézifék nem tart', 'parkbrake'), ('a kamion elgurult', 'parkbrake'), ('füst jön a kabinból', 'fire'), ('égett szagot érzek', 'fire'), ('kigyulladt a motor', 'fire'), ('tűz van', 'fire'), ('defektet kaptam', 'flat'), ('kidurrant a gumi', 'flat'), ('a gumi lyukas', 'flat'), ('beragadt a kormány', 'steer'), ('a kormány beragadt', 'steer'), ('húz jobbra', 'steer'), ('folyik az olaj', 'leak'), ('az olaj folyik', 'leak'), ('csöpög a gázolaj', 'leak'), ('balesetem volt', 'acc'), ('balesetem volt és megsérültem', 'acc'), ('megsérültem', 'injury'), ('mentőt hívtam', 'injury'), ('nem indul a motor', 'nostart'), ('a motor nem indul', 'nostart'), ('a tükör letört', 'mirror'), ('a lámpák nem világítanak', 'lights'), ('kiégett az izzó', 'lights'), ('világít a motorhiba lámpa', 'warnlight'), ('kigyulladt egy visszajelző', 'warnlight'), ('megrepedt a szélvédő', 'glass'), ('az ablak nem megy le', 'window'), ('az akku lemerült', 'batt'), ('a tachográf nem olvassa a kártyát', 'tacho'), ('elvesztettem a sofőrkártyát', 'tacho'), ('a pótkocsi nem kapcsol', 'coupling'), ('a nyereg nem zár', 'coupling'), ('kifogyott az üzemanyag', 'dryfuel'), ('a motor túlmelegszik', 'engine'), ('nincs ereje', 'engine'), ('a gumi sérült', 'tyre'), ('a hűtő nem hűt', 'reefer'), ('a légrugó kidurrant', 'susp'), ('nem megy be a sebesség', 'gear'), ('a kuplung csúszik', 'gear'), ('a klíma nem működik', 'climate'), ('a ponyva szakadt', 'tarp'), ('a kipufogó leesett', 'exhaust'), ('az ablaktörlő nem működik', 'visib'), ('a biztonsági öv nem kapcsol', 'seat'), ('meglazult a kerékcsavar', 'wheel'), ('a kerékcsavar laza', 'wheel'), ('elakadtam a sárban', 'stuck'), ('elvesztettem a kulcsot', 'lost'), ('a rendszámtábla leesett', 'numplate'), ('a sávtartó asszisztens nem működik', 'adas'), ('magától fékez', 'adas'), ('az ajtó nem záródik', 'door'), ('a hátfal nem működik', 'door'), ('nem fog a fek', 'brake'), ('fust jon a kabinbol', 'fire'), ('kočnice ne rade', 'brake'), ('hamulce nie działają', 'brake')]
NO=['a féket megjavították', 'a gumit kicserélték, minden rendben', 'füst jön a kipufogóból', 'fekete füst jön a kipufogóból', 'kő csapódott a szélvédőbe', 'nincs poroltó', 'az ülésfűtés nem működik', 'a tankkártya nem működik', 'nem tudom', 'a motor rendben van', 'a fék újra működik']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hu.inhaber','display_name':'HU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='hu.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHU-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('nem fog','a hűtő','elveszt')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hu-{txt[:5]}-{lang}-{w}.png')
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
