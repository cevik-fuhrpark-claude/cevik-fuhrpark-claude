# [CLAUDE] UI-Test (14.11.2026, Backlog 1462, Blickwinkel „Fahrer schreibt die Meldung auf Estnisch“):
# Meldeformular zeigt bei estnischen Stichwörtern (auch ohne õ/ä/ö/ü getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1461) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("pidurid ei tööta", "brake"), ("PIDURID EI TÖÖTA", "brake"), ("pidurid ei toota", "brake"), ("auto ei pidurda", "brake"), ("pidurid on nõrgad", "brake"), ("õhurõhk langeb", "brake"), ("kukkus õhurõhk", "brake"), ("lekib õhku", "brake"), ("käsipidur ei pea", "parkbrake"), ("auto veeres ise", "parkbrake"), ("kabiinist tuleb suitsu", "fire"), ("kabiin põleb", "fire"), ("mootor läks põlema", "fire"), ("tulekahju kabiinis", "fire"), ("kõrbelõhn kabiinis", "fire"), ("rehv lõhkes", "flat"), ("lõhkes rehv", "flat"), ("rehv on tühi", "flat"), ("kumm on tühi", "flat"), ("rool on kinni", "steer"), ("rool on raske", "steer"), ("auto veab paremale", "steer"), ("õli lekib", "leak"), ("lekib õli", "leak"), ("kütus lekib", "leak"), ("antifriis tilgub", "leak"), ("õlileke", "leak"), ("juhtus avarii", "acc"), ("põrkasin kokku sõiduautoga", "acc"), ("sõitsin posti otsa", "acc"), ("avarii, sain viga", "acc"), ("sain viga", "injury"), ("kutsusin kiirabi", "injury"), ("mootor ei käivitu", "nostart"), ("ei käivitu", "nostart"), ("ei lähe käima", "nostart"), ("starter ei tööta", "nostart"), ("peegel on katki", "mirror"), ("lõhkusin peegli", "mirror"), ("tuled ei põle", "lights"), ("esituli ei põle", "lights"), ("pirn läks läbi", "lights"), ("suunatuli ei tööta", "lights"), ("pidurituled ei põle", "lights"), ("numbrituli ei põle", "lights"), ("mootori tuli põleb", "warnlight"), ("märgutuli vilgub", "warnlight"), ("süttis punane tuli", "warnlight"), ("esiklaas on mõranenud", "glass"), ("klaas pragunes", "glass"), ("aken ei lähe alla", "window"), ("aknatõstuk ei tööta", "window"), ("aku on tühi", "batt"), ("aku ei laadi", "batt"), ("sõidumeerik ei loe kaarti", "tacho"), ("tahhograaf annab vea", "tacho"), ("kaart jäi kinni", "tacho"), ("kaotasin juhikaardi", "tacho"), ("poolhaagis haakus lahti", "coupling"), ("sadul ei lukustu", "coupling"), ("kütus sai otsa", "dryfuel"), ("pole enam kütust", "dryfuel"), ("mootor kuumeneb üle", "engine"), ("mootor ei vea", "engine"), ("avariirežiim", "engine"), ("rehv on kulunud", "tyre"), ("rehv laseb õhku", "tyre"), ("rehvis on mull", "tyre"), ("külmaagregaat ei jahuta", "reefer"), ("agregaat annab häiret", "reefer"), ("õhkpadi lõhkes", "susp"), ("haagis on viltu", "susp"), ("käik ei lähe sisse", "gear"), ("käigukast annab vea", "gear"), ("sidur libiseb", "gear"), ("kliima ei tööta", "climate"), ("küte ei tööta", "climate"), ("webasto ei käivitu", "climate"), ("tent rebenes", "tarp"), ("tendis on auk", "tarp"), ("summuti kukkus ära", "exhaust"), ("summuti ripub", "exhaust"), ("kojamehed ei tööta", "visib"), ("aknad lähevad uduseks", "visib"), ("turvavöö ei kinnitu", "seat"), ("iste on katki", "seat"), ("rattamutrid on lahti", "wheel"), ("velg on mõranenud", "wheel"), ("rattalaager kuumeneb", "wheel"), ("jäin porisse kinni", "stuck"), ("jäin lumme kinni", "stuck"), ("kaotasin võtmed", "lost"), ("võtmed on kadunud", "lost"), ("numbrimärk kukkus ära", "numplate"), ("assistent ei tööta", "adas"), ("radar annab vea", "adas"), ("pidurdab ise", "adas"), ("uks ei sulgu", "door"), ("uks ei avane", "door"), ("tagaluuk ei tööta", "door"), ("tõstuk annab vea", "door")]
NO=["pidurid parandatud", "rehv vahetati, kõik korras", "summutist tuleb suitsu", "summutist tuleb musta suitsu", "kivi tabas esiklaasi", "kivi tegi klaasi mõra", "tulekustuti puudub", "istme soojendus ei tööta", "kütusekaart ei tööta", "kaotasin kütusekaardi", "ma ei tea", "mootor töötab normaalselt", "töötab jälle", "probleeme pole", "avariituled", "ohukolmnurk kadus", "numbrituli"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'et.inhaber','display_name':'ET Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='et.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nET-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('pidurid ei t','külmaagregaat','kaotasin võ')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/et-{txt[:5]}-{lang}-{w}.png')
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
