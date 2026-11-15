# [CLAUDE] UI-Test (15.11.2026, Backlog 1502, Blickwinkel „Fahrer schreibt die Meldung auf Georgisch“):
# Meldeformular zeigt bei georgischen Stichwörtern (Tabelle GE_KINDS im still nachgeladenen Modul app-sprachen.js) dieselben Hinweise wie bei den anderen
# Sprachen und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, Verneinung, Feuerlöscher, Stau, „ყველაფერი რიგზეა“ ohne;
# „მაყუჩიდან კვამლი გამოდის“ zeigt den Motor-Hinweis statt Brand. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["მუხრუჭები არ მუშაობს","brake"],["ᲛᲣᲮᲠᲣᲭᲔᲑᲘ ᲐᲠ ᲛᲣᲨᲐᲝᲑᲡ","brake"],["მუხრუჭი სუსტად იჭერს","brake"],["ჰაერის წნევა ეცემა","brake"],["ხელის მუხრუჭი არ იჭერს","parkbrake"], ["საბურავი გასკდა","flat"],["საბურავი დაეშვა","flat"],["ბორბალი გაიხვრიტა","flat"],["საბურავი გაცვეთილია","tyre"], ["ძრავი არ ირთვება","nostart"],["მანქანა არ იქოქება","nostart"],["ძრავი ხურდება","engine"],["მაყუჩიდან კვამლი გამოდის","engine"], ["კაბინა იწვის","fire"],["კაბინიდან კვამლი გამოდის","fire"],["ზეთი ჟონავს","leak"],["საწვავი ჟონავს","leak"],["ავარიაში მოვყევი","acc"],["ბოძს დავეჯახე","acc"],["მძღოლი დაშავდა","injury"],["ავარიაში მოვყევი, მძღოლი დაშავდა","acc"], ["ძრავის ნათურა აინთო","warnlight"],["პანელზე შეცდომა წერს","warnlight"],["საქარე მინა გაიბზარა","glass"],["ქვა მოხვდა საქარე მინას","glass"],["სარკე გატყდა","mirror"],["ფარები არ ანათებს","lights"],["ნათურა დაიწვა","lights"], ["აკუმულატორი დაჯდა","batt"],["ტახოგრაფი არ კითხულობს ბარათს","tacho"],["მძღოლის ბარათი დავკარგე","tacho"],["საწვავის ბარათი არ მუშაობს","fuelcard"],["გასაღები დავკარგე","lost"], ["მისაბმელი არ ებმება","coupling"],["საწვავი გამითავდა","dryfuel"],["მაცივარი არ აციებს","reefer"],["პნევმობალიში უშვებს","susp"],["სიჩქარე არ ერთვება","gear"],["სცეპლენია ბუქსაობს","gear"], ["გათბობა არ მუშაობს","climate"],["კონდიციონერი არ ირთვება","climate"],["სავარძლის გათბობა არ მუშაობს","cabkit"],["ტენტი გაიხა","tarp"],["მაყუჩი ჩამოვარდა","exhaust"],["საწმენდები არ მუშაობს","visib"], ["ღვედი არ იკვრება","seat"],["ჭანჭიკები მოეშვა","wheel"],["კარი გაფუჭდა","door"],["ძრავი ხმაურობს","engine"],["ბორბალი ბუქსაობს","stuck"],["ძრავი ჩაქრა","nostart"],["ავტონომკა არ ირთვება","climate"],["ტორმოზი არ მუშაობს","brake"],["ტალახში ჩავრჩი","stuck"],["ნომერი ჩამოვარდა","numplate"],["კამერა არ მუშაობს","adas"],["კარი არ იკეტება","door"],["ჰიდრობორტი არ მუშაობს","door"], ["ფანჯარა არ ეშვება","window"],["საჭე მძიმედ ტრიალებს","steer"],["მარჯვნივ მიაქვს","steer"]]
NO=["ყველაფერი რიგზეა","მუხრუჭები შეაკეთეს","საბურავი შევცვალეთ","ისევ მუშაობს","მუხრუჭები ნორმალურად მუშაობს","ცეცხლმაქრი არ არის","კაბინა დაზიანებულია","საბურავი არ გასკდა","სარკე არ გატყდა","ზეთი არ ჟონავს","პრობლემა არ არის","საცობში ჩავრჩი","ავარიული შუქი ჩავრთე","კაბინა არ იწვის","შუქი ჩავრთე","мухручи не работают"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ge.inhaber','display_name':'GE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='ge.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nGE-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('მუხრუჭები არ მუშაობს','მაცივარი არ აციებს','გასაღები დავკარგე'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ge-{CASES.index([txt,want])}-{lang}-{w}.png')
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
