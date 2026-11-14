# [CLAUDE] UI-Test (14.11.2026, Backlog 1488, Blickwinkel „Fahrer schreibt die Meldung auf Belarussisch“):
# Meldeformular zeigt bei belarussischen Stichwörtern (kyrillisch mit і/ў/ы, Tabelle BE_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben
# Hinweise wie bei den anderen Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, Verneinung, Feuerlöscher, „усё ў парадку“ ohne;
# „дым з глушыцеля“ zeigt den Motor-Hinweis statt Brand, „счапленне буксуе“ Getriebe statt festgefahren. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("тармазы не працуюць","brake"),("ТОРМАЗЫ НЕ ПРАЦУЮЦЬ","brake"),("падае ціск паветра","brake"),("ручны тормаз не трымае","parkbrake"),("лопнула шына","flat"),("прабіта кола","flat"),
 ("рухавік не заводзіцца","nostart"),("рухавік перагразаецца","engine"),("дым з глушыцеля","engine"),("кабіна гарыць","fire"),("дым з кабіны","fire"),("цячэ масла","leak"),("трапіў у аварыю","acc"),("у мяне ДТЗ","acc"),("кіроўца паранены","injury"),
 ("трапіў у аварыю, кіроўца паранены","acc"),("гарыць лямпачка рухавіка","warnlight"),("загарэўся чэк","warnlight"),("лабавое шкло трэснула","glass"),("камень трапіў у лабавое шкло","glass"),("люстэрка разбітае","mirror"),("фары не працуюць","lights"),
 ("акумулятар сеў","batt"),("тахограф не чытае картку","tacho"),("паліўная картка не працуе","fuelcard"),("згубіў ключы","lost"),("прычэп не счапляецца","coupling"),("скончылася паліва","dryfuel"),("халадзільнік не халодзіць","reefer"),
 ("пнеўмападушка спускае","susp"),("перадача не ўключаецца","gear"),("счапленне буксуе","gear"),("ацяпленне не працуе","climate"),("падагрэў сядзення не працуе","cabkit"),("тэнт парваны","tarp"),("глушыцель адваліўся","exhaust"),
 ("дворнікі не працуюць","visib"),("рэмень бяспекі не зашпільваецца","seat"),("гайкі кола аслабелі","wheel"),("захраснуў у гразі","stuck"),("нумарны знак адваліўся","numplate"),("камера не працуе","adas"),("дзверы не зачыняюцца","door"),
 ("гідраборт не працуе","door"),("акно не апускаецца","window"),("руль цяжка круціцца","steer")]
NO=["усё ў парадку","тармазы адрамантавалі","шыну замянілі","зноў працуе","тармазы працуюць нармальна","няма вогнетушыцеля","кабіна пашкоджана","кола не прабітае","люстэрка не разбітае","масла не цячэ"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'be.inhaber','display_name':'BE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='be.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nBE-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('тармазы не працуюць','халадзільнік не халодзіць','згубіў ключы'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/be-{CASES.index((txt,want))}-{lang}-{w}.png')
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
