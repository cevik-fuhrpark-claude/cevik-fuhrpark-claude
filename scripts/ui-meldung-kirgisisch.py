# [CLAUDE] UI-Test (15.11.2026, Backlog 1509, Blickwinkel „Fahrer schreibt die Meldung auf Kirgisisch“):
# Meldeformular zeigt bei kirgisischen Stichwörtern (kyrillisch, lateinisch, Mischform „работать этпейт“; Tabelle KY_KINDS im still nachgeladenen Modul app-sprachen.js)
# dieselben Hinweise wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, „…ган жок“, Stau ohne;
# „глушителден кара түтүн чыгып жатат“ zeigt den Motor-Hinweis statt Brand; Kontrollleuchte „күйүп турат“ kein Brand.
# Zusätzliche Hinweise aus dem Start-Modul (russische Lehnwörter) stehen in der Erwartung. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["тормоз иштебей жатат", "brake"], ["тормоз иштебейт", "brake"], ["тормоз кармабай жатат", "brake"], ["тормоз работать этпейт", "brake"], ["tormoz ishtebey jatat", "brake"], ["аба басымы түшүп жатат", "brake"], ["кол тормоз кармабай жатат", "parkbrake"], ["машина өзүнөн өзү жылып кетти", "parkbrake"], ["дөңгөлөк жарылды", "flat"], ["шина тешилди", "flat"], ["дөңгөлөктүн абасы чыгып кетти", "flat"], ["алдыңкы сол дөңгөлөк тешилип калды", "flat"], ["dongolok jaryldy", "flat"], ["шина жешилип калды", "tyre"], ["шина шишип кетти", "tyre"], ["руль оор", "steer"], ["руль бурулбай жатат", "steer"], ["машина оңго тартып жатат", "steer"], ["унаа солго тартат", "steer"], ["май агып жатат", "leak"], ["мотордон май агат", "leak"], ["антифриз тамчылап жатат", "engine,leak"], ["солярка агып жатат", "leak"], ["кабина күйүп жатат", "fire"], ["кабинадан түтүн чыгып жатат", "fire"], ["өрт чыкты", "fire"], ["авария болду", "acc"], ["кырсыкка кабылдым", "acc"], ["машинаны кагып алдым", "acc"], ["урунуп алдым", "acc"], ["жаракат алдым", "injury"], ["тез жардам чакыргыла", "injury"], ["мотор от албай жатат", "nostart"], ["машина оталбай жатат", "nostart"], ["стартер иштебейт", "nostart"], ["мотор кызып кетти", "engine"], ["кыймылдаткыч тартпай жатат", "engine"], ["мотордон башка добуш чыгып жатат", "engine"], ["глушителден кара түтүн чыгып жатат", "engine"], ["авариялык режимге түштү", "engine"], ["күзгү сынды", "mirror"], ["оң жактагы күзгү жулунуп кетти", "mirror"], ["фара күйбөй жатат", "lights"], ["стоп чырак күйбөйт", "lights"], ["оң фара сынып калды", "lights"], ["лампочка күйүп кетти", "lights"], ["мотор чырагы күйүп турат", "warnlight"], ["abs чырагы күйдү", "warnlight"], ["панелде ката чыкты", "warnlight"], ["алдыңкы айнек жарылды", "glass"], ["айнекке таш тийди", "glass"], ["айнек сынды", "glass"], ["терезе түшпөй жатат", "window"], ["терезе көтөрүлбөй жатат", "window"], ["аккумулятор отуруп калды", "batt"], ["аккумулятордо заряд жок", "batt"], ["тахограф картаны окубай жатат", "tacho"], ["айдоочунун картасы жоголду", "tacho"], ["күйүүчү май картасы иштебейт", "fuelcard"], ["ачкычты жоготуп алдым", "lost"], ["ачкыч жоголду", "lost"], ["прицеп илинбей жатат", "coupling"], ["солярка бүттү", "dryfuel"], ["муздаткыч муздатпай жатат", "reefer"], ["агрегат иштебейт", "reefer"], ["подушка жарылды", "susp"], ["передача кирбей жатат", "gear"], ["сцепление тайгаланып жатат", "gear"], ["кондиционер иштебейт", "climate"], ["печка жылытпай жатат", "climate"], ["отургучтун жылыткычы иштебейт", "cabkit"], ["тент айрылып кетти", "tarp"], ["глушитель түшүп калды", "exhaust"], ["дворник иштебейт", "visib"], ["коопсуздук куру тагылбай жатат", "seat"], ["гайка бошоп кетти", "wheel"], ["баткакка батып калдым", "stuck"], ["номер түшүп калды", "numplate"], ["камера иштебейт", "adas"], ["эшик жабылбай жатат", "door"], ["эшик ачылбай жатат", "door"], ["токто, дөңгөлөк жарылды жана руль оор", "flat,steer"], ["тормоз иштебейт. мотор кызып кетти", "brake,engine"]]
NO=["тормоз оңдолду", "дөңгөлөк алмаштырылды", "кайра иштеп жатат", "баары жакшы", "көйгөй жок", "май акпайт", "айнек сынган жок", "дөңгөлөк жарылбады", "авариясыз жеттим", "тыгында турам", "жүктү тапшырдым", "эртең саат сегизде жетем", "май куйдум", "эч көйгөй жок", "дөңгөлөктөргө аба толтурдум", "фара күйүп турат", "мотор иштеп жатат", "дөңгөлөк жакшы", "кабинада тамеки түтүнү", "мотор чырагы өчтү", "фара сынган эмес"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ky.inhaber','display_name':'KY Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ky.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nKY-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('тормоз иштебей жатат','муздаткыч муздатпай жатат','ачкычты жоготуп алдым'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ky-{CASES.index([txt,want])}-{lang}-{w}.png')
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
