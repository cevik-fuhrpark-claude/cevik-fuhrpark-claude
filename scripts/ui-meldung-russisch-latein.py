# [CLAUDE] UI-Test (14.11.2026, Backlog 1463, Blickwinkel „Fahrer schreibt Russisch in lateinischen Buchstaben“):
# Meldeformular zeigt bei russischen Stichwörtern in Umschrift (Handy ohne kyrillische Tastatur) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1462) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein Fehltreffer anderer Tabellen); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte, Keilriemen ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("tormoza ne rabotayut", "brake"), ("TORMOZA NE RABOTAYUT", "brake"), ("ne tormozit", "brake"), ("tormoza slabye", "brake"), ("padaet davlenie vozduha", "brake"), ("travit vozduh", "brake"), ("ruchnik ne derzhit", "parkbrake"), ("mashina pokatilas sama", "parkbrake"), ("dym iz kabiny", "fire"), ("idet dym iz kabiny", "fire"), ("gorit kabina", "fire"), ("kabina gorit", "fire"), ("pozhar v kabine", "fire"), ("pahnet garyu", "fire"), ("probil koleso", "flat"), ("koleso lopnulo", "flat"), ("lopnula shina", "flat"), ("prokol", "flat"), ("rul zaklinilo", "steer"), ("rul tugo krutitsya", "steer"), ("tyanet vpravo", "steer"), ("techet maslo", "leak"), ("maslo kapaet", "leak"), ("podtekaet antifriz", "leak"), ("popal v avariyu", "acc"), ("dtp na trasse", "acc"), ("vrezalsya v stolb", "acc"), ("avariya, voditel ranen", "acc"), ("voditel ranen", "injury"), ("vyzval skoruyu", "injury"), ("dvigatel ne zavoditsya", "nostart"), ("ne zavoditsya", "nostart"), ("starter ne krutit", "nostart"), ("zerkalo razbito", "mirror"), ("slomal zerkalo", "mirror"), ("fary ne goryat", "lights"), ("peregorela lampochka", "lights"), ("povorotniki ne rabotayut", "lights"), ("stop signaly ne goryat", "lights"), ("gorit lampochka dvigatelya", "warnlight"), ("zagorelsya chek", "warnlight"), ("migaet indikator", "warnlight"), ("lobovoe steklo tresnulo", "glass"), ("treschina na lobovom", "glass"), ("okno ne opuskaetsya", "window"), ("steklopodemnik ne rabotaet", "window"), ("akkumulyator sel", "batt"), ("sel akkumulyator", "batt"), ("takhograf ne chitaet kartu", "tacho"), ("tahograf oshibka", "tacho"), ("karta zastryala", "tacho"), ("poteryal kartu voditelya", "tacho"), ("pricep otcepilsya", "coupling"), ("sedlo ne zakryvaetsya", "coupling"), ("konchilos toplivo", "dryfuel"), ("net topliva", "dryfuel"), ("dvigatel peregrevaetsya", "engine"), ("ne tyanet", "engine"), ("avariynyy rezhim", "engine"), ("shina povrezhdena", "tyre"), ("shina travit", "tyre"), ("gryzha na shine", "tyre"), ("refrizherator ne morozit", "reefer"), ("agregat oshibka", "reefer"), ("pnevmopodushka lopnula", "susp"), ("pricep perekosilo", "susp"), ("peredacha ne vklyuchaetsya", "gear"), ("ne vklyuchaetsya peredacha", "gear"), ("korobka oshibka", "gear"), ("stseplenie buksuet", "gear"), ("konditsioner ne rabotaet", "climate"), ("pechka ne greet", "climate"), ("webasto ne zavoditsya", "climate"), ("tent porvan", "tarp"), ("dyra v tente", "tarp"), ("glushitel otvalilsya", "exhaust"), ("dvorniki ne rabotayut", "visib"), ("stekla zapotevayut", "visib"), ("remen bezopasnosti ne zastegivaetsya", "seat"), ("sidenie slomalos", "seat"), ("gaiki kolesa otkrutilis", "wheel"), ("disk tresnul", "wheel"), ("podshipnik greetsya", "wheel"), ("zastryal v gryazi", "stuck"), ("zastryal v snegu", "stuck"), ("poteryal klyuchi", "lost"), ("klyuchi propali", "lost"), ("nomer otvalilsya", "numplate"), ("assistent ne rabotaet", "adas"), ("datchik oshibka", "adas"), ("tormozit sam", "adas"), ("dver ne zakryvaetsya", "door"), ("gidrobort ne rabotaet", "door")]
NO=["tormoza otremontirovali", "koleso zamenili, vse v poryadke", "dym iz vyhlopnoy truby", "chernyy dym iz glushitelya", "kamen popal v steklo", "net ognetushitelya", "podogrev sideniya ne rabotaet", "toplivnaya karta ne rabotaet", "poteryal toplivnuyu kartu", "ne znayu", "dvigatel rabotaet normalno", "snova rabotaet", "bez problem", "avariyka", "avariynyy znak poteryal", "remen generatora porvalsya", "podsvetka nomera ne gorit"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rl.inhaber','display_name':'RL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='rl.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nRL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('tormoza ne r','refrizherator','poteryal kl')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rl-{txt[:5]}-{lang}-{w}.png')
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
