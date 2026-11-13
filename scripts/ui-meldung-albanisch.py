# [CLAUDE] UI-Test (13.11.2026, Backlog 1461, Blickwinkel „Fahrer schreibt die Meldung auf Albanisch“):
# Meldeformular zeigt bei albanischen Stichwörtern (auch ohne ë/ç getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1460) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('frenat nuk punojnë', 'brake'), ('FRENAT NUK PUNOJNË', 'brake'), ('frenat nuk punojne', 'brake'), ('nuk frenon', 'brake'), ('frenat janë të dobëta', 'brake'), ('ra presioni i ajrit', 'brake'), ('humbet ajër', 'brake'), ('frena e dorës nuk mban', 'parkbrake'), ('kamioni u rrokullis vetë', 'parkbrake'), ('del tym nga kabina', 'fire'), ('tym nga kabina', 'fire'), ('digjet kabina', 'fire'), ('kabina po digjet', 'fire'), ('mori zjarr motori', 'fire'), ('vjen erë djegie', 'fire'), ('zjarr në kabinë', 'fire'), ('goma u shpua', 'flat'), ('shpova gomën', 'flat'), ('goma plasi', 'flat'), ('gomë e shfryrë', 'flat'), ('timoni është bllokuar', 'steer'), ('timoni rëndë', 'steer'), ('tërheq në të djathtë', 'steer'), ('rrjedh vaj', 'leak'), ('vaji pikon', 'leak'), ('rrjedh nafta', 'leak'), ('humbet antifriz', 'leak'), ('pata aksident', 'acc'), ('u përplasa me një makinë', 'acc'), ('godita një shtyllë', 'acc'), ('pata aksident, jam i plagosur', 'acc'), ('jam i plagosur', 'injury'), ('thirra ambulancën', 'injury'), ('motori nuk ndizet', 'nostart'), ('nuk ndizet', 'nostart'), ('starteri nuk punon', 'nostart'), ('pasqyra u thye', 'mirror'), ('theva pasqyrën', 'mirror'), ('dritat nuk punojnë', 'lights'), ('llamba u dogj', 'lights'), ('sinjalizuesit nuk punojnë', 'lights'), ('dritat e frenave nuk ndizen', 'lights'), ('drita e targës nuk ndizet', 'lights'), ('u ndez llamba e motorit', 'warnlight'), ('pulson llamba', 'warnlight'), ('ndizet një dritë e kuqe', 'warnlight'), ('xhami i përparmë u ça', 'glass'), ('xhami u thye', 'glass'), ('dritarja nuk ulet', 'window'), ('bateria u shkarkua', 'batt'), ('akumulatori bosh', 'batt'), ('tahografi nuk lexon kartën', 'tacho'), ('tahografi nuk punon', 'tacho'), ('humba kartën e shoferit', 'tacho'), ('karta mbeti brenda', 'tacho'), ('karta e shoferit nuk lexohet', 'tacho'), ('rimorkioja u shkëput', 'coupling'), ('gjysmërimorkioja nuk lidhet', 'coupling'), ('shala nuk mbyllet', 'coupling'), ('mbaroi nafta', 'dryfuel'), ('nuk kam naftë', 'dryfuel'), ('mbeta pa naftë', 'dryfuel'), ('motori nxehet', 'engine'), ('motori nuk tërheq', 'engine'), ('motori humb fuqi', 'engine'), ('goma e dëmtuar', 'tyre'), ('goma humb ajër', 'tyre'), ('frigoriferi nuk ftoh', 'reefer'), ('agregati nuk punon', 'reefer'), ('frigoriferi jep alarm', 'reefer'), ('jastëku i ajrit plasi', 'susp'), ('rimorkioja është anuar', 'susp'), ('nuk hyn marshi', 'gear'), ('friksioni rrëshqet', 'gear'), ('kutia e shpejtësisë gabim', 'gear'), ('kondicioneri nuk punon', 'climate'), ('ngrohja nuk ngroh', 'climate'), ('webasto nuk punon', 'climate'), ('tenda u gris', 'tarp'), ('vrimë në tendë', 'tarp'), ('marmita ra', 'exhaust'), ('marmitja varet', 'exhaust'), ('fshirëset nuk punojnë', 'visib'), ('xhamat avullojnë', 'visib'), ('rripi i sigurimit nuk mbyllet', 'seat'), ('ndenjësja u prish', 'seat'), ('bulonat e rrotës janë të liruara', 'wheel'), ('disku u ça', 'wheel'), ('mozi nxehet', 'wheel'), ('ngela në baltë', 'stuck'), ('mbeta në borë', 'stuck'), ('humba çelësat', 'lost'), ('nuk i gjej çelësat', 'lost'), ('targa ra', 'numplate'), ('asistenti i korsisë nuk punon', 'adas'), ('frenon vetë pa arsye', 'adas'), ('dera nuk mbyllet', 'door'), ('bordi hidraulik nuk punon', 'door'), ('bremzes nedarbojas', 'brake'), ('stabdžiai neveikia', 'brake')]
NO=['frenat u riparuan', 'goma u ndërrua, gjithçka në rregull', 'tym nga marmita', 'tym i zi nga marmita', 'guri goditi xhamin', 'guri e çau xhamin', 'nuk ka zjarrfikëse', 'ngrohja e ndenjëses nuk punon', 'karta e karburantit nuk punon', 'humba kartën e karburantit', 'nuk e di', 'motori punon normal', 'punon përsëri', 'pa probleme', 'dritat e emergjencës', 'trekëndëshi humbi']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sq.inhaber','display_name':'SQ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sq.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSQ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('frenat nuk p','frigoriferi nuk','humba çel')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sq-{txt[:5]}-{lang}-{w}.png')
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
