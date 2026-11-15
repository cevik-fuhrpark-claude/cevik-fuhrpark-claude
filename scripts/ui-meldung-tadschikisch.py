# [CLAUDE] UI-Test (15.11.2026, Backlog 1511, Blickwinkel „Fahrer schreibt die Meldung auf Tadschikisch“):
# Meldeformular zeigt bei tadschikischen Stichwörtern (kyrillisch, lateinisch, Mischform „работать намекунад“; Tabelle TJ_KINDS im still nachgeladenen Modul app-sprachen.js)
# dieselben Hinweise wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, „… нест“, „бе садама“, Stau ohne;
# „аз глушитель дуди сиёҳ мебарояд“ zeigt den Motor-Hinweis statt Brand; Kontrollleuchte „месӯзад“ kein Brand; Präposition „дар“ keine Tür.
# Zusätzliche Hinweise aus dem Start-Modul (russische Lehnwörter) stehen in der Erwartung. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["тормоз кор намекунад", "brake"], ["тормоз намегирад", "brake"], ["тормоз работать намекунад", "brake"], ["tormoz kor namekunad", "brake"], ["фишори ҳаво паст шуд", "brake"], ["тормози дастӣ намегирад", "parkbrake"], ["мошин худ ба худ ҳаракат кард", "parkbrake"], ["чарх таркид", "flat"], ["шина сӯрох шуд", "flat"], ["ҳавои чарх баромад", "flat"], ["чархи пеши чап таркид", "flat"], ["charh tarkid", "flat"], ["шина хӯрда шуд", "tyre"], ["шина варам кард", "tyre"], ["руль вазнин шуд", "steer"], ["руль намегардад", "steer"], ["мошин ба тарафи рост мекашад", "steer"], ["равған мерезад", "leak"], ["аз мотор равған мерезад", "leak"], ["антифриз мечакад", "engine,leak"], ["солярка мерезад", "leak"], ["кабина месӯзад", "fire"], ["аз кабина дуд мебарояд", "fire"], ["мошин оташ гирифт", "fire"], ["садама шуд", "acc"], ["ба садама дучор шудам", "acc"], ["ба мошин задам", "acc"], ["бархӯрдам", "acc"], ["захмӣ шудам", "injury"], ["ёрии таъҷилӣ даркор", "injury"], ["мошин сар намешавад", "nostart"], ["мотор заводка намешавад", "nostart"], ["стартер кор намекунад", "nostart"], ["мотор гарм шуд", "engine"], ["мотор кашиш надорад", "engine"], ["мотор овози бегона мебарорад", "engine"], ["аз глушитель дуди сиёҳ мебарояд", "engine"], ["ба аварийный режим гузашт", "engine"], ["оина шикаст", "mirror"], ["оинаи рост канда шуд", "mirror"], ["фара намесӯзад", "lights"], ["стоп чароғ намесӯзад", "lights"], ["лампочка сӯхт", "lights"], ["чароғи мотор месӯзад", "warnlight"], ["дар панел хато баромад", "warnlight"], ["чароғи abs даргирифт", "warnlight"], ["шишаи пеш кафид", "glass"], ["ба шиша санг зад", "glass"], ["лобовой шикаст", "glass"], ["тиреза поён намеравад", "window"], ["тиреза боло намеравад", "window"], ["аккумулятор нишаст", "batt"], ["аккумулятор заряд надорад", "batt"], ["тахограф картаро намехонад", "tacho"], ["корти ронанда гум шуд", "tacho"], ["корти сӯзишворӣ кор намекунад", "fuelcard"], ["калид гум шуд", "lost"], ["калидро гум кардам", "lost"], ["техпаспорт гум шуд", "lost"], ["прицеп ҷудо шуд", "coupling"], ["седелка қулф намешавад", "coupling"], ["солярка тамом шуд", "dryfuel"], ["солярка намонд", "dryfuel"], ["холодильник хунук намекунад", "reefer"], ["агрегат кор намекунад", "reefer"], ["подушка таркид", "susp"], ["прицеп ба як тараф каҷ шуд", "susp"], ["передача намедарояд", "gear"], ["сцепление сӯхт", "gear"], ["печка гарм намекунад", "climate"], ["кондиционер кор намекунад", "climate"], ["подогрев кор намекунад", "cabkit"], ["тент дарида шуд", "tarp"], ["тент сӯрох шуд", "tarp"], ["глушитель афтод", "exhaust"], ["дворник тоза намекунад", "visib"], ["шиша буғ кард", "visib"], ["камарбанд баста намешавад", "seat"], ["курсӣ шикаст", "seat"], ["гайка суст шуд", "wheel"], ["гайкаи чарх нест", "wheel"], ["подшипник гарм шуд", "wheel"], ["дар лой мондам", "stuck"], ["дар барф ғарқ шудем", "stuck"], ["рақами мошин афтод", "numplate"], ["номер гум шуд", "numplate"], ["датчик хато медиҳад", "adas"], ["камера кор намекунад", "adas"], ["дари кабина пӯшида намешавад", "door"], ["гидроборт кор намекунад", "door"], ["замок вайрон шуд", "door"], ["mashin sar nameshavad", "nostart"], ["ravghan merezad", "leak"], ["kabina mesūzad", "fire"], ["sadama shud", "acc"], ["kalid gum shud", "lost"], ["charogi motor mesuzad", "warnlight"], ["holodilnik khunuk namekunad", "reefer"], ["xolodilnik xunuk namekunad", "reefer"], ["истед, чарх таркид ва руль вазнин шуд", "flat,steer"], ["тормоз кор намекунад. мотор гарм шуд", "brake,engine"]]
NO=["тормоз таъмир шуд", "чарх иваз карданд", "боз кор мекунад", "ҳамааш хуб", "мушкил нест", "равған намерезад", "шиша шикаста нест", "чарх натаркид", "бе садама расидам", "дар пробка истодаам", "борро супоридам", "пагоҳ соати ҳашт мерасам", "равған рехтам", "ҳеҷ мушкил нест", "ба чархҳо ҳаво пур кардам", "фара месӯзад", "мотор кор мекунад", "чарх хуб аст", "дар кабина дуди сигарет", "чароғи мотор хомӯш шуд", "дар роҳ ҳастам", "ба диспетчер занг задам", "солярка рехтам", "дар Тошкент ҳастам", "калидро ёфтам", "ta'mir shud", "hamaash xub", "boz kor mekunad"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tj.inhaber','display_name':'TJ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='tj.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nTJ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('тормоз кор намекунад','холодильник хунук намекунад','калидро гум кардам'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tj-{CASES.index([txt,want])}-{lang}-{w}.png')
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
