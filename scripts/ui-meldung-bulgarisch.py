# [CLAUDE] UI-Test (13.11.2026, Backlog 1458, Blickwinkel „Fahrer schreibt die Meldung auf Bulgarisch“):
# Meldeformular zeigt bei bulgarischen Stichwörtern (kyrillisch oder lateinisch umschrieben) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1457) – Tabelle aus dem still
# nachgeladenen Modul app-sprachen.js – und keine weiteren (geprüft: genau die erwarteten Hinweise sichtbar; „съединителят буксува“ nicht mehr als „festgefahren“, „имах катастрофа, ранен съм“
# nur Unfall); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung, Tankkarte, „масло не тече“, „фаровете горят“ ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("спирачките не работят", "brake"), ("СПИРАЧКИТЕ НЕ РАБОТЯТ", "brake"), ("не спира добре", "brake"), ("спада налягането на въздуха", "brake"), ("спирачките са слаби", "brake"), ("ръчната спирачка не държи", "parkbrake"), ("камионът тръгна сам", "parkbrake"), ("излиза дим от кабината", "fire"), ("дим от кабината", "fire"), ("кабината гори", "fire"), ("мирише на изгоряло", "fire"), ("пожар в кабината", "fire"), ("спуках гума", "flat"), ("спукана гума", "flat"), ("гумата се спука", "flat"), ("гумата избухна", "flat"), ("воланът е блокирал", "steer"), ("воланът е заключен", "steer"), ("тегли надясно", "steer"), ("дърпа наляво", "steer"), ("тече масло", "leak"), ("капе масло", "leak"), ("тече нафта", "leak"), ("изтича антифриз", "engine,leak"), ("катастрофирах", "acc"), ("имах катастрофа", "acc"), ("блъснаха ме отзад", "acc"), ("блъснах кола", "acc"), ("имах катастрофа, ранен съм", "acc"), ("ранен съм", "injury"), ("извиках линейка", "injury"), ("двигателят не пали", "nostart"), ("не запалва", "nostart"), ("стартерът не работи", "nostart"), ("огледалото е счупено", "mirror"), ("счупено огледало", "mirror"), ("фаровете не светят", "lights"), ("изгоряла крушка", "lights"), ("мигачът не работи", "lights"), ("свети лампичка", "warnlight"), ("светна контролната лампа на двигателя", "warnlight"), ("предното стъкло е пукнато", "glass"), ("пукнато стъкло", "glass"), ("прозорецът не се вдига", "window"), ("акумулаторът е паднал", "batt"), ("изтощен акумулатор", "batt"), ("тахографът не чете картата", "tacho"), ("загубих картата на водача", "tacho"), ("ремаркето не се закача", "coupling"), ("полуремаркето се откачи", "coupling"), ("седлото не заключва", "coupling"), ("свърши ми горивото", "dryfuel"), ("свърши нафтата", "dryfuel"), ("нямам гориво", "dryfuel"), ("двигателят прегрява", "engine"), ("моторът няма мощност", "engine"), ("аварийен режим", "engine"), ("гумата губи въздух", "tyre"), ("гумата е срязана", "tyre"), ("гумата е повредена", "tyre"), ("хладилният агрегат не охлажда", "reefer"), ("агрегатът не работи", "reefer"), ("въздушната възглавница се спука", "susp"), ("ремаркето се накланя", "susp"), ("не влиза скорост", "gear"), ("съединителят буксува", "gear"), ("климатикът не работи", "climate"), ("парното не работи", "climate"), ("печката не топли", "climate"), ("брезентът е скъсан", "tarp"), ("дупка в брезента", "tarp"), ("ауспухът падна", "exhaust"), ("ауспухът виси", "exhaust"), ("чистачките не работят", "visib"), ("стъклото се запотява", "visib"), ("коланът не закопчава", "seat"), ("седалката е счупена", "seat"), ("болтовете на колелото са разхлабени", "wheel"), ("джантата е пукната", "wheel"), ("заседнах в калта", "stuck"), ("затънах в снега", "stuck"), ("загубих ключовете", "lost"), ("не мога да намеря ключа", "lost"), ("регистрационният номер падна", "numplate"), ("асистентът за лентата не работи", "adas"), ("спира сам без причина", "adas"), ("вратата не се затваря", "door"), ("падащият борд не работи", "door"), ("spirachkite ne rabotyat", "brake"), ("dvigatelyat ne pali", "nostart"), ("imah katastrofa", "acc"), ("спирачките не работят и воланът е блокирал", "brake,steer")]
NO=["спирачките са оправени", "гумата е сменена, всичко е наред", "дим от ауспуха", "черен дим от ауспуха", "камъче удари стъклото", "нямам пожарогасител", "подгряването на седалката не работи", "картата за гориво не работи", "не знам", "двигателят работи нормално", "вече работи", "няма проблем", "масло не тече", "фаровете горят"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bg.inhaber','display_name':'BG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='bg.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nBG-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('спирачките не','агрегатът','загубих ключ')): q.locator('#'+want.split(',')[0]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/bg-{txt[:5]}-{lang}-{w}.png')
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
