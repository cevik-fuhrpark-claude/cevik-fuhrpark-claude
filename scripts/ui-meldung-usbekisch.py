# [CLAUDE] UI-Test (15.11.2026, Backlog 1506, Blickwinkel „Fahrer schreibt die Meldung auf Usbekisch“):
# Meldeformular zeigt bei usbekischen Stichwörtern (lateinisch und kyrillisch; Tabelle UZ_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise
# wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, verneintes Verb, „… emas“, Stau, „hammasi joyida“ ohne;
# „glushiteldan qora tutun chiqyapti“ zeigt den Motor-Hinweis statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["tormoz ishlamayapti", "brake"], ["tormoz ushlamayapti", "brake"], ["tormozlar yaxshi ushlamayapti", "brake"], ["tormoz yo'q", "brake"], ["tormoz kuchsiz", "brake"], ["havo bosimi tushyapti", "brake"], ["тормоз ишламаяпти", "brake"], ["qo'l tormozi ushlamayapti", "parkbrake"], ["ruchnik ishlamayapti", "parkbrake"], ["mashina o'zi yurib ketdi", "parkbrake"], ["shina teshildi", "flat"], ["balon portladi", "flat"], ["orqa g'ildirak teshildi", "flat"], ["shinaning dami chiqib ketdi", "flat"], ["ballon yorildi", "flat"], ["ғилдирак тешилди", "flat"], ["shina yeyilib ketgan", "tyre"], ["shinada grija bor", "tyre"], ["shina kesilgan", "tyre"], ["rul qattiq bo'lib qoldi", "steer"], ["rul og'ir", "steer"], ["mashina o'ngga tortyapti", "steer"], ["рул ишламаяпти", "steer"], ["moy oqyapti", "leak"], ["motordan moy oqyapti", "leak"], ["solyarka tomchilayapti", "leak"], ["antifriz ketyapti", "leak"], ["gidravlika moyi oqyapti", "leak"], ["мой оқяпти", "leak"], ["kabina yonyapti", "fire"], ["kabinadan tutun chiqyapti", "fire"], ["yong'in chiqdi", "fire"], ["motor yonib ketdi", "fire"], ["g'ildirak yonyapti", "fire"], ["avariyaga uchradim", "acc"], ["avariya bo'ldi", "acc"], ["boshqa mashina bilan to'qnashdim", "acc"], ["orqaga yurib ustunga urildim", "acc"], ["darvozaga tegib ketdim", "acc"], ["авария бўлди", "acc"], ["avariya bo'ldi haydovchi yaralandi", "acc"], ["haydovchi yaralandi", "injury"], ["qo'limni kesib oldim", "injury"], ["tez yordam kerak", "injury"], ["motor o't olmayapti", "nostart"], ["mashina zavod bo'lmayapti", "nostart"], ["starter aylanmayapti", "nostart"], ["motor ishlamayapti", "nostart"], ["мотор ўт олмаяпти", "nostart"], ["motor qizib ketdi", "engine"], ["dvigatel qizib ketyapti", "engine"], ["motor tortmayapti", "engine"], ["kuch yo'q", "engine"], ["glushiteldan qora tutun chiqyapti", "engine"], ["temperatura ko'tarildi", "engine"], ["motor o'chib qolyapti", "engine"], ["ko'zgu sindi", "mirror"], ["zerkalo singan", "mirror"], ["chap ko'zgu osilib qoldi", "mirror"], ["chiroq yonmayapti", "lights"], ["orqa fara yonmayapti", "lights"], ["povorotnik ishlamayapti", "lights"], ["lampochka kuydi", "lights"], ["stop chiroq ishlamayapti", "lights"], ["motor chirog'i yonyapti", "warnlight"], ["panelda xato chiqdi", "warnlight"], ["check yonyapti", "warnlight"], ["ekranda oshibka chiqyapti", "warnlight"], ["qizil chiroq yonib turibdi", "warnlight"], ["lobovoy oyna yorildi", "glass"], ["oldingi oyna darz ketdi", "glass"], ["tosh oynaga urildi", "glass"], ["oyna tushmayapti", "window"], ["eshik oynasi ko'tarilmayapti", "window"], ["akkumulyator o'tirib qoldi", "batt"], ["akkumulyator zaryad olmayapti", "batt"], ["akum tugadi", "batt"], ["taxograf kartani o'qimayapti", "tacho"], ["haydovchi kartasini yo'qotdim", "tacho"], ["karta taxografda qolib ketdi", "tacho"], ["yoqilg'i kartasi ishlamayapti", "fuelcard"], ["zapravka kartasi bloklandi", "fuelcard"], ["kalitni yo'qotdim", "lost"], ["texpasport yo'qoldi", "lost"], ["pritsep ulanmayapti", "coupling"], ["sedelka yopilmayapti", "coupling"], ["pritsep uzilib ketdi", "coupling"], ["solyarka tugadi", "dryfuel"], ["yo'lda yoqilg'i tugab qoldi", "dryfuel"], ["xolodilnik sovutmayapti", "reefer"], ["refrijerator ishlamayapti", "reefer"], ["podushka yorildi", "susp"], ["pritsep bir tomonga qiyshayib qoldi", "susp"], ["amortizator singan", "susp"], ["peredacha tushmayapti", "gear"], ["korobka buzildi", "gear"], ["sseplenie kuyib qoldi", "gear"], ["pechka isitmayapti", "climate"], ["konditsioner ishlamayapti", "climate"], ["o'rindiq isitgichi ishlamayapti", "cabkit"], ["tent yirtildi", "tarp"], ["tentda teshik bor", "tarp"], ["glushitel tushib ketdi", "exhaust"], ["dvornik ishlamayapti", "visib"], ["oyna tozalagich suv sepmayapti", "visib"], ["xavfsizlik kamari taqilmayapti", "seat"], ["o'rindiq singan", "seat"], ["g'ildirak gaykalari bo'shab qoldi", "wheel"], ["podshipnik qizib ketyapti", "wheel"], ["loyga botib qoldim", "stuck"], ["qorga tiqilib qoldik", "stuck"], ["nomer tushib qoldi", "numplate"], ["orqa kamera ishlamayapti", "adas"], ["mashina o'zi tormoz beryapti", "adas"], ["eshik yopilmayapti", "door"], ["gidrobort ko'tarilmayapti", "door"], ["tormoz ishlamayapti motor qizib ketdi", "brake,engine"], ["shina teshildi, ko'zgu sindi", "flat,mirror"], ["tormoz ishlamayapti. motor o't olmayapti", "brake,nostart"]]
NO=["tormoz tuzatildi", "shina almashtirildi", "yana ishlayapti", "hammasi joyida", "muammo yo'q", "moy oqmayapti", "oyna singan emas", "tutun chiqmayapti", "hech qanday muammo yo'q", "shina teshilmagan", "probkada tiqilib qoldim", "yukni topshirdim", "ertaga soat sakkizda yetib boraman", "avariyasiz yetib keldim", "shinalarga havo damladim", "o't o'chirgich yo'q", "mashina soz", "tormoz endi yaxshi ishlayapti", "yoqilg'i quydim"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uz.inhaber','display_name':'UZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='uz.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nUZ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('tormoz ishlamayapti','xolodilnik sovutmayapti','kalitni yo\'qotdim'): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/uz-{CASES.index([txt,want])}-{lang}-{w}.png')
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
