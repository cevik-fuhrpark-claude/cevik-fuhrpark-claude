# [CLAUDE] UI-Test (13.11.2026, Backlog 1460, Blickwinkel „Fahrer schreibt die Meldung auf Lettisch“):
# Meldeformular zeigt bei lettischen Stichwörtern (auch ohne Häkchen/Striche getippt) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1459) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('bremzes nedarbojas', 'brake'), ('BREMZES NEDARBOJAS', 'brake'), ('bremzes nestrādā', 'brake'), ('nebremzē', 'brake'), ('vājas bremzes', 'brake'), ('krīt gaisa spiediens', 'brake'), ('pūš gaisu', 'brake'), ('rokas bremze neturas', 'parkbrake'), ('stāvbremze nedarbojas', 'parkbrake'), ('mašīna aizripoja pati', 'parkbrake'), ('nāk dūmi no kabīnes', 'fire'), ('dūmi no kabīnes', 'fire'), ('deg kabīne', 'fire'), ('kabīne deg', 'fire'), ('aizdegās dzinējs', 'fire'), ('smird pēc deguma', 'fire'), ('ugunsgrēks kabīnē', 'fire'), ('pārdūru riepu', 'flat'), ('pārsprāga riepa', 'flat'), ('nolaista riepa', 'flat'), ('riepa pārsprāga', 'flat'), ('stūre iestrēgusi', 'steer'), ('stūre griežas grūti', 'steer'), ('velk pa labi', 'steer'), ('tek eļļa', 'leak'), ('eļļa pil', 'leak'), ('tek dīzelis', 'leak'), ('sūcas antifrīzs', 'leak'), ('notika avārija', 'acc'), ('iekļuvu avārijā', 'acc'), ('ietriecos sienā', 'acc'), ('aizķēru automašīnu', 'acc'), ('notika avārija, esmu ievainots', 'acc'), ('esmu ievainots', 'injury'), ('izsaucu ātro palīdzību', 'injury'), ('dzinējs neiedarbojas', 'nostart'), ('neiedarbojas', 'nostart'), ('starteris nedarbojas', 'nostart'), ('spogulis nolūzis', 'mirror'), ('saplīsis spogulis', 'mirror'), ('lukturi nespīd', 'lights'), ('izdegusi spuldze', 'lights'), ('virzienrādītāji nedarbojas', 'lights'), ('bremžu lukturi nedeg', 'lights'), ('deg dzinēja lampiņa', 'warnlight'), ('iedegās kontrollampiņa', 'warnlight'), ('mirgo lampiņa', 'warnlight'), ('vējstikls ieplīsis', 'glass'), ('ieplīsa vējstikls', 'glass'), ('logs nenolaižas', 'window'), ('akumulators izlādējies', 'batt'), ('izlādējās akumulators', 'batt'), ('tahogrāfs nenolasa karti', 'tacho'), ('tahogrāfs nedarbojas', 'tacho'), ('pazaudēju vadītāja karti', 'tacho'), ('karte iestrēgusi', 'tacho'), ('vadītāja karte nedarbojas', 'tacho'), ('piekabe atkabinājās', 'coupling'), ('puspiekabe nesakabinās', 'coupling'), ('seglu sakabe nenoslēdzas', 'coupling'), ('beidzās degviela', 'dryfuel'), ('nav degvielas', 'dryfuel'), ('pietrūka dīzeļa', 'dryfuel'), ('dzinējs pārkarst', 'engine'), ('dzinējs nevelk', 'engine'), ('avārijas režīms', 'engine'), ('riepa bojāta', 'tyre'), ('riepa laiž gaisu', 'tyre'), ('saldētājs nedzesē', 'reefer'), ('refrižerators nedarbojas', 'reefer'), ('agregāts nedarbojas', 'reefer'), ('gaisa spilvens plīsis', 'susp'), ('piekabe sašķiebusies', 'susp'), ('neieslēdzas pārnesums', 'gear'), ('sajūgs slīd', 'gear'), ('ātrumkārba kļūda', 'gear'), ('kondicionieris nedarbojas', 'climate'), ('apkure nesilda', 'climate'), ('webasto nedarbojas', 'climate'), ('tents saplēsts', 'tarp'), ('caurums tentā', 'tarp'), ('izpūtējs nokrita', 'exhaust'), ('izpūtējs karājas', 'exhaust'), ('slotiņas nedarbojas', 'visib'), ('stikls aizsvīst', 'visib'), ('drošības josta neaizsprādzējas', 'seat'), ('sēdeklis salūzis', 'seat'), ('riteņa skrūves vaļīgas', 'wheel'), ('disks ieplīsis', 'wheel'), ('rumba karsta', 'wheel'), ('iestrēgu dubļos', 'stuck'), ('iegrimu sniegā', 'stuck'), ('pazaudēju atslēgas', 'lost'), ('nevaru atrast atslēgas', 'lost'), ('numurzīme nokrita', 'numplate'), ('joslu asistents nedarbojas', 'adas'), ('bremzē pats bez iemesla', 'adas'), ('durvis neaizveras', 'door'), ('hidrauliskais borts nedarbojas', 'door'), ('stabdžiai neveikia', 'brake'), ('brzdy nefungují', 'brake')]
NO=['bremzes salabotas', 'riepa nomainīta, viss kārtībā', 'dūmi no izpūtēja', 'melni dūmi no izpūtēja', 'akmens ieplēsa vējstiklu', 'šķemba vējstiklā', 'nav ugunsdzēšamā aparāta', 'sēdekļa apsilde nedarbojas', 'degvielas karte nedarbojas', 'pazaudēju degvielas karti', 'nezinu', 'dzinējs strādā normāli', 'jau darbojas', 'bez problēmām', 'avārijas gaismas', 'avārijas zīme pazudusi', 'deg tuvās gaismas']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lv.inhaber','display_name':'LV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='lv.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLV-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('bremzes ned','saldētājs','pazaudēju at')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lv-{txt[:5]}-{lang}-{w}.png')
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
