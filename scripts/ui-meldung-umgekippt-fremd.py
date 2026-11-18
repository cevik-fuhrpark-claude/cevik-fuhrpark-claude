# [CLAUDE] UI-Test (17.11.2026, Backlog 1563; Stufe 3 Graben UZ/AZ/KZ/KY/TJ/KU/SO/AR/FA/Hinglish Backlog 1569; Stufe 2 Backlog 1564: BG/LT/LV/SQ/ET/SL/UZ/AZ/KZ/KY/TJ/KU/SO/AR/FA/Hinglish/Tagalog, Blickwinkel „Lkw umgekippt / von der Straße abgekommen“ in Fremdsprachen): Meldeformular zeigt bei
# „tır devrildi“, „fura przewróciła się“, „camionul s-a răsturnat“, „kamion se prevrnuo“, „a kamion felborult“, „kamion se převrátil“, „el camión volcó“, „saí da estrada“,
# „το φορτηγό ανατράπηκε“, „მანქანა გზიდან გადავარდა“, „բեռնատարը շուռ է եկել“ den Unfall-Hinweis (wie „Lkw ist umgekippt“); umgekippte Ladung zeigt nur den
# Ladungs-Hinweis, Verneinung keinen. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["tır devrildi", "acc"], ["yoldan çıktım", "acc"], ["fura przewróciła się", "acc"], ["wpadłem do rowu", "acc,stuck"], ["camionul s-a răsturnat", "acc"], ["kamion se prevrnuo", "acc"],
       ["sletio sam s ceste", "acc"], ["a kamion felborult", "acc"], ["kamion se převrátil", "acc"], ["el camión volcó", "acc"], ["saí da estrada", "acc"], ["το φορτηγό ανατράπηκε", "acc"],
       ["მანქანა გზიდან გადავარდა", "acc"], ["բեռնատարը շուռ է եկել", "acc"], ["yükler devrildi", "load"], ["ładunek się przewrócił", "load"], ["το φορτίο ανατράπηκε", "load"],
       ["камионът се преобърна", "acc"], ["kravas auto apgāzās", "acc"], ["kamioni u përmbys", "acc"], ["tovornjak se je prevrnil", "acc"], ["жүк көлігі аударылып кетті", "acc"], ["الشاحنة انقلبت", "acc"], ["کامیون واژگون شد", "acc"], ["truck palat gaya", "acc"], ["tumaob ang trak", "acc"], ["krava apgāzās", "load"],
       ["krovinys apsivertė", "load"], ["paletes apvēlās", "load"], ["kastid läksid ümber", "load"], ["yük ters döndü", "load"], ["saman ulta ho gaya", "load"], ["tumaob ang mga pallet", "load"], ["tır ters döndü", "acc"], ["truck ulta ho gaya", "acc"],  # Backlog 1565
       ["le camion est dans le fossé", "acc,stuck"], ["il camion è finito nel fosso", "acc,stuck"], ["a kamion az árokban van", "stuck"], ["kamion je zapeo u blatu", "stuck"], ["tır hendeğe düştü", "acc,stuck"],  # Backlog 1566, 1567
       ["камионът падна в канавката", "acc,stuck"], ["mašīna ir grāvī", "acc,stuck"], ["veok sõitis kraavi", "acc,stuck"], ["το φορτηγό έπεσε στο χαντάκι", "acc,stuck"], ["nahulog sa kanal ang trak", "acc,stuck"],  # Backlog 1568
       ["yuk mashinasi ariqqa tushib ketdi", "acc,stuck"], ["maşın xəndəyə düşdü", "acc,stuck"], ["машина арыкта турат", "acc,stuck"], ["мошин ба ҷӯй афтод", "acc,stuck"], ["kamyon ket nav xendekê", "acc,stuck"], ["بارهەڵگرەکە کەوتە ناو جۆگەڵەکە", "acc,stuck"], ["الشاحنة سقطت في الخندق", "acc,stuck"], ["کامیون افتاد توی جوی", "acc,stuck"], ["truck khaai mein gir gaya", "acc,stuck"], ["maal khaai mein gir gaya", "load"]]  # Backlog 1569
NO=["kamyon devrilmedi", "ciężarówka się nie przewróciła", "camionul nu s-a răsturnat", "kamion se nije prevrnuo", "a kamion nem borult fel", "el camión no volcó", "το φορτηγό δεν ανατράπηκε", "բեռնատարը չի շրջվել", "sürət həddini aşdı", "الشاحنة ما انقلبت", "gaadi palat lo", "krovinys neapsivertė", "yük ters dönmedi",
    "tır şarampole düşmedi", "el camión no está en la cuneta", "il camion non è finito nel fosso", "le camion n’est pas dans le fossé", "de vrachtwagen is niet in de sloot", "camionul nu a intrat în șanț", "kamion není v příkopu", "a kamion nincs az árokban", "ciężarówka nie stoi w rowie",  # Backlog 1567
    "камионът не падна в канавката", "το φορτηγό δεν έπεσε στο χαντάκι", "hindi nahulog sa kanal ang trak", "televizori është në kanal 5",  # Backlog 1568
    "mashina ariqqa tushmadi", "maşın xəndəyə düşmədi", "машина арыкка түшкөн жок", "мошин ба ҷӯй наафтод", "الشاحنة لم تسقط في الخندق", "کامیون توی جوی نیفتاد", "truck khaai mein nahi gira", "ariqda suv yoq"]  # Backlog 1569
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'umk.inhaber','display_name':'UMK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='umk.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nUK-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(','.join(sorted(shown))==want,f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('tır devrildi','το φορτηγό ανατράπηκε','yükler devrildi','الشاحنة انقلبت','krovinys apsivertė','truck ulta ho gaya','le camion est dans le fossé','tır hendeğe düştü','το φορτηγό έπεσε στο χαντάκι','الشاحنة سقطت في الخندق'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/umk-{CASES.index([txt,want])}-{lang}-{w}.png')
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
