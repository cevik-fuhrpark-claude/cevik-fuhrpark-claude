# [CLAUDE] UI-Test (14.11.2026, Backlog 1464, Blickwinkel „Fahrer schreibt Ukrainisch in lateinischen Buchstaben“):
# Meldeformular zeigt bei ukrainischen Stichwörtern in Umschrift (y/i, kh/h, g/h) (Handy ohne kyrillische Tastatur) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1463) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein Fehltreffer anderer Tabellen); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte, Keilriemen, „vse harazd“ ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("halma ne pratsyuyut","brake"),("HALMA NE PRATSIUIUT","brake"),("galma ne pracyuyut","brake"),("ne halmuie","brake"),("halma slabki","brake"),("padaie tysk povitria","brake"),("travyt povitria","brake"),("ruchnyk ne trymaie","parkbrake"),("mashyna pokotylas sama","parkbrake"),("dym z kabiny","fire"),("ide dym z kabiny","fire"),("horyt kabina","fire"),("kabina horyt","fire"),("pozhezha v kabini","fire"),("pakhne horilym","fire"),("probyv koleso","flat"),("koleso spustylo","flat"),("lopnula shyna","flat"),("prokol","flat"),("kermo zaklynylo","steer"),("kermo tuho krutytsia","steer"),("tiahne vpravo","steer"),("teche olyva","leak"),("olyva kapaie","leak"),("pidtikaie antyfryz","leak"),("potrapyv v avariiu","acc"),("dtp na trasi","acc"),("vrizavsia v stovp","acc"),("avariia, vodii poranenyi","acc"),("vodii poranenyi","injury"),("vyklykaly shvydku","injury"),("dvyhun ne zavodytsia","nostart"),("ne zavodytsia","nostart"),("starter ne krutyt","nostart"),("dzerkalo rozbyte","mirror"),("zlamav dzerkalo","mirror"),("fary ne horiat","lights"),("perehorila lampochka","lights"),("povorotnyky ne pratsiuiut","lights"),("stopy ne horiat","lights"),("horyt lampochka dvyhuna","warnlight"),("zasvitylas pomylka","warnlight"),("blymaie indykator","warnlight"),("lobove sklo trisnulo","glass"),("trishchyna na lobovomu","glass"),("vikno ne opuskaietsia","window"),("sklopidiomnyk ne pratsiuie","window"),("akumuliator siv","batt"),("siv akumuliator","batt"),("takhohraf ne chytaie kartku","tacho"),("tahograf pomylka","tacho"),("kartka zastriahla","tacho"),("zahubyv kartku vodiia","tacho"),("prychip vidchepyvsia","coupling"),("sidlo ne zakryvaietsia","coupling"),("zakinchylosia palne","dryfuel"),("nemaie palnoho","dryfuel"),("dvyhun perehrivaietsia","engine"),("ne tiahne","engine"),("avariinyi rezhym","engine"),("shyna poshkodzhena","tyre"),("shyna travyt","tyre"),("hryzha na shyni","tyre"),("refryzherator ne morozyt","reefer"),("ahrehat pomylka","reefer"),("pnevmopodushka lopnula","susp"),("prychip perekosylo","susp"),("peredacha ne vmykaietsia","gear"),("ne vmykaietsia peredacha","gear"),("korobka pomylka","gear"),("zcheplennia buksuie","gear"),("kondytsioner ne pratsiuie","climate"),("pichka ne hriie","climate"),("webasto ne zavodytsia","climate"),("tent porvanyi","tarp"),("dirka v tenti","tarp"),("hlushnyk vidvalyvsia","exhaust"),("dvirnyky ne pratsiuiut","visib"),("vikna zapotivaiut","visib"),("remin bezpeky ne zastibaietsia","seat"),("sydinnia zlamalosia","seat"),("haiky kolesa vidkrutylysia","wheel"),("dysk trisnuv","wheel"),("pidshypnyk hriietsia","wheel"),("zastriah u hriazi","stuck"),("zastriah v snihu","stuck"),("zahubyv kliuchi","lost"),("kliuchi propaly","lost"),("nomer vidvalyvsia","numplate"),("asystent ne pratsiuie","adas"),("datchyk pomylka","adas"),("halmuie sam","adas"),("dveri ne zakryvaiutsia","door"),("hidrobort ne pratsiuie","door"),
 ("halma ne pratsyuyut","brake"),("kermo zaklinilo","steer"),("dvigun ne zavodytsya","nostart"),("akumulyator sil","batt"),("zagubyv klyuchi","lost"),("refrigerator ne morozyt","reefer"),("kolesa probyto","flat")]
NO=["halma vidremontuvaly","koleso zaminyly, vse v poriadku","dym z vykhlopnoi truby","chornyi dym z hlushnyka","kamin potrapyv u sklo","nemaie vohnehasnyka","pidihriv sydinnia ne pratsiuie","palyvna kartka ne pratsiuie","zahubyv palyvnu kartku","ne znaiu","dvyhun pratsiuie normalno","znovu pratsiuie","bez problem","avariika","avariinyi znak zahubyv","remin heneratora porvavsia","pidsvitka nomera ne horyt","vse harazd"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ul.inhaber','display_name':'UL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ul.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nUL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('halma ne p','refryzherator','zahubyv kl')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ul-{txt[:5]}-{lang}-{w}.png')
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
