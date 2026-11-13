# [CLAUDE] UI-Test (13.11.2026, Backlog 1459, Blickwinkel „Fahrer schreibt die Meldung auf Litauisch“):
# Meldeformular zeigt bei litauischen Stichwörtern (auch ohne Häkchen/Striche getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1458) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('stabdžiai neveikia', 'brake'), ('STABDŽIAI NEVEIKIA', 'brake'), ('stabdziai neveikia', 'brake'), ('nestabdo', 'brake'), ('silpni stabdžiai', 'brake'), ('krenta oro slėgis', 'brake'), ('pučia orą', 'brake'), ('rankinis stabdis nelaiko', 'parkbrake'), ('stovėjimo stabdis neveikia', 'parkbrake'), ('sunkvežimis nuriedėjo pats', 'parkbrake'), ('eina dūmai iš kabinos', 'fire'), ('dūmai iš kabinos', 'fire'), ('dega kabina', 'fire'), ('kabina dega', 'fire'), ('užsidegė variklis', 'fire'), ('kvepia degėsiais', 'fire'), ('gaisras kabinoje', 'fire'), ('pradūriau padangą', 'flat'), ('sprogo padanga', 'flat'), ('nuleista padanga', 'flat'), ('padanga sprogo', 'flat'), ('vairas užstrigo', 'steer'), ('vairas sunkiai sukasi', 'steer'), ('traukia į dešinę', 'steer'), ('teka alyva', 'leak'), ('alyva laša', 'leak'), ('teka dyzelis', 'leak'), ('bėga antifrizas', 'leak'), ('patekau į avariją', 'acc'), ('įvyko avarija', 'acc'), ('atsitrenkiau į sieną', 'acc'), ('kliudžiau automobilį', 'acc'), ('patekau į avariją, esu sužeistas', 'acc'), ('esu sužeistas', 'injury'), ('iškviečiau greitąją', 'injury'), ('variklis neužsiveda', 'nostart'), ('neužsiveda', 'nostart'), ('starteris neveikia', 'nostart'), ('veidrodis nulūžo', 'mirror'), ('sudaužytas veidrodis', 'mirror'), ('žibintai nešviečia', 'lights'), ('perdegė lemputė', 'lights'), ('posūkiai neveikia', 'lights'), ('dega variklio lemputė', 'warnlight'), ('užsidegė kontrolinė lemputė', 'warnlight'), ('mirksi lemputė', 'warnlight'), ('priekinis stiklas įskilo', 'glass'), ('įskilo stiklas', 'glass'), ('langas nesileidžia', 'window'), ('akumuliatorius išsikrovė', 'batt'), ('išsikrovė akumuliatorius', 'batt'), ('tachografas neskaito kortelės', 'tacho'), ('tachografas neveikia', 'tacho'), ('pamečiau vairuotojo kortelę', 'tacho'), ('kortelė užstrigo', 'tacho'), ('vairuotojo kortelė neveikia', 'tacho'), ('priekaba neprisikabina', 'coupling'), ('puspriekabė atsikabino', 'coupling'), ('balnas neužsidaro', 'coupling'), ('baigėsi kuras', 'dryfuel'), ('neturiu kuro', 'dryfuel'), ('pritrūko dyzelio', 'dryfuel'), ('variklis perkaista', 'engine'), ('variklis neturi galios', 'engine'), ('avarinis režimas', 'engine'), ('padanga pažeista', 'tyre'), ('padanga leidžia orą', 'tyre'), ('šaldytuvas nešaldo', 'reefer'), ('šaldymo agregatas neveikia', 'reefer'), ('oro pagalvė sprogo', 'susp'), ('priekaba pasvirusi', 'susp'), ('neįsijungia pavara', 'gear'), ('sankaba slysta', 'gear'), ('pavarų dėžė klaida', 'gear'), ('kondicionierius neveikia', 'climate'), ('šildymas nešildo', 'climate'), ('webasto neveikia', 'climate'), ('tentas suplyšęs', 'tarp'), ('skylė tente', 'tarp'), ('duslintuvas nukrito', 'exhaust'), ('išmetimo vamzdis kabo', 'exhaust'), ('valytuvai neveikia', 'visib'), ('stiklas rasoja', 'visib'), ('saugos diržas neužsisega', 'seat'), ('sėdynė sulūžo', 'seat'), ('rato varžtai atsilaisvino', 'wheel'), ('ratlankis įskilęs', 'wheel'), ('stebulė karšta', 'wheel'), ('įstrigau purve', 'stuck'), ('įklimpau sniege', 'stuck'), ('pamečiau raktus', 'lost'), ('negaliu rasti raktų', 'lost'), ('numeris nukrito', 'numplate'), ('juostos asistentas neveikia', 'adas'), ('stabdo pats be priežasties', 'adas'), ('durys neužsidaro', 'door'), ('hidraulinis bortas neveikia', 'door'), ('stabdžių žibintai neveikia', 'lights'), ('brzdy nefungují', 'brake'), ('спирачките не работят', 'brake')]
NO=['stabdžiai sutaisyti', 'padanga pakeista, viskas gerai', 'dūmai iš išmetimo vamzdžio', 'juodi dūmai iš duslintuvo', 'akmenukas įskėlė stiklą', 'akmuo kliudė stiklą', 'neturiu gesintuvo', 'sėdynės šildymas neveikia', 'kuro kortelė neveikia', 'pamečiau kuro kortelę', 'nežinau', 'variklis veikia normaliai', 'jau veikia', 'be problemų']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lt.inhaber','display_name':'LT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='lt.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLT-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('stabdžiai nev','šaldytuvas','pamečiau rakt')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lt-{txt[:5]}-{lang}-{w}.png')
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
