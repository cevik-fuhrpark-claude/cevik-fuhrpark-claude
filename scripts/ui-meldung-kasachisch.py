# [CLAUDE] UI-Test (15.11.2026, Backlog 1508, Blickwinkel „Fahrer schreibt die Meldung auf Kasachisch“):
# Meldeformular zeigt bei kasachischen Stichwörtern (kyrillisch, lateinisch, Mischform „работать етпейді“; Tabelle KZ_KINDS im still nachgeladenen Modul app-sprachen.js)
# dieselben Hinweise wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, „…ған жоқ“, Stau ohne;
# „глушительден қара түтін шығып жатыр“ zeigt den Motor-Hinweis statt Brand;
# „антифриз …“ zeigt wie auf Russisch zusätzlich den Motor-Hinweis (Muster im Start-Modul). DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["тежегіш істемейді", "brake"], ["тежегіштер ұстамайды", "brake"], ["тормоз істемейді", "brake"], ["тормоз работать етпейді", "brake"], ["tejegish istemeydi", "brake"], ["ауа қысымы түсіп жатыр", "brake"], ["қол тежегіші ұстамайды", "parkbrake"], ["машина өздігінен жүріп кетті", "parkbrake"], ["дөңгелек жарылды", "flat"], ["шина тесілді", "flat"], ["дөңгелектің ауасы шығып кетті", "flat"], ["алдыңғы сол дөңгелек тесіліп қалды", "flat"], ["dongelek jaryldy", "flat"], ["дөңгелек тозып кеткен", "tyre"], ["шина ісініп кетті", "tyre"], ["руль ауыр", "steer"], ["руль айналмайды", "steer"], ["машина оңға тартады", "steer"], ["көлік солға тартып тұр", "steer"], ["май ағып жатыр", "leak"], ["қозғалтқыштан май ағады", "leak"], ["антифриз тамшылап тұр", "engine,leak"], ["солярка ағып жатыр", "leak"], ["радиатордан антифриз ағып жатыр", "engine,leak"], ["кабина жанып жатыр", "fire"], ["кабинадан түтін шығып жатыр", "fire"], ["өрт шықты", "fire"], ["апатқа түстім", "acc"], ["авария болды", "acc"], ["көлікті соғып алдым", "acc"], ["жараландым", "injury"], ["жедел жәрдем шақырыңыз", "injury"], ["қозғалтқыш от алмайды", "nostart"], ["машина оталмай тұр", "nostart"], ["мотор от алмайды", "nostart"], ["стартер істемейді", "nostart"], ["қозғалтқыш қызып кетті", "engine"], ["мотор қатты қызады", "engine"], ["қозғалтқыш тартпайды", "engine"], ["қозғалтқыштан бөгде дыбыс шығады", "engine"], ["глушительден қара түтін шығып жатыр", "engine"], ["апаттық режимге түсті", "engine"], ["айна сынды", "mirror"], ["оң жақ айна жұлынып кетті", "mirror"], ["фара жанбайды", "lights"], ["стоп шам жанбайды", "lights"], ["оң фара сынып қалды", "lights"], ["лампочка жанбайды", "lights"], ["қозғалтқыш шамы жанып тұр", "warnlight"], ["abs шамы жанды", "warnlight"], ["панельде қате шықты", "warnlight"], ["алдыңғы әйнек жарылды", "glass"], ["әйнекте жарықшақ бар", "glass"], ["әйнек сынды", "glass"], ["әйнекке тас тиді", "glass"], ["терезе түспейді", "window"], ["терезе көтерілмейді", "window"], ["аккумулятор отырып қалды", "batt"], ["аккумуляторда заряд жоқ", "batt"], ["тахограф картаны оқымайды", "tacho"], ["жүргізуші картасы жоғалды", "tacho"], ["жанармай картасы істемейді", "fuelcard"], ["кілтті жоғалттым", "lost"], ["кілт жоғалды", "lost"], ["тіркеме ілінбейді", "coupling"], ["солярка бітті", "dryfuel"], ["тоңазытқыш суытпайды", "reefer"], ["агрегат істемейді", "reefer"], ["подушка жарылды", "susp"], ["беріліс қосылмайды", "gear"], ["сцепление тайып жатыр", "gear"], ["кондиционер істемейді", "climate"], ["пеш жылытпайды", "climate"], ["орындық жылытқышы істемейді", "cabkit"], ["тент жыртылып кетті", "tarp"], ["глушитель түсіп қалды", "exhaust"], ["дворник істемейді", "visib"], ["белдік тағылмайды", "seat"], ["гайка босап кетті", "wheel"], ["батпаққа батып қалдым", "stuck"], ["нөмір түсіп қалды", "numplate"], ["камера істемейді", "adas"], ["есік жабылмайды", "door"], ["есік ашылмайды", "door"], ["тоқта, дөңгелек жарылды және руль ауыр", "flat,steer"], ["тежегіш істемейді. қозғалтқыш қызып кетті", "brake,engine"]]
NO=["тежегіш жөнделді", "дөңгелек ауыстырылды", "қайтадан істеп тұр", "бәрі дұрыс", "мәселе жоқ", "май ақпайды", "әйнек сынған жоқ", "дөңгелек жарылмады", "апатсыз жеттім", "кептелісте тұрмын", "жүкті тапсырдым", "ертең сағат сегізде жетемін", "жанармай құйдым", "еш мәселе жоқ", "дөңгелектерге ауа толтырдым", "фара жанып тұр", "қозғалтқыш істеп тұр", "дөңгелек жақсы", "кабинада сигарет түтіні", "қозғалтқыш шамы сөнді"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kz.inhaber','display_name':'KZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='kz.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKZ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(sorted(shown)==want.split(','),f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('тежегіш істемейді','тоңазытқыш суытпайды','кілтті жоғалттым'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kz-{CASES.index([txt,want])}-{lang}-{w}.png')
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
