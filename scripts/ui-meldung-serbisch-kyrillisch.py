# [CLAUDE] UI-Test (14.11.2026, Backlog 1465, Blickwinkel „Fahrer schreibt Serbisch/Mazedonisch in kyrillischer Schrift“):
# Meldeformular zeigt bei serbischen/montenegrinischen/mazedonischen Stichwörtern in kyrillischer Schrift dieselben Hinweise wie bei den anderen Sprachen
# (Backlog 1453–1464) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren (genau der erwartete Hinweis sichtbar);
# Reparaturvermerk, Auspuffrauch, Steinschlag, Feuerlöscher, Sitzheizung, Tankkarte, „све је у реду“/„сè е во ред“ ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("кочнице не раде","brake"),("КОЧНИЦЕ НЕ РАДЕ","brake"),("сопирачките не работат","brake"),("kocnicite ne rabotat","brake"),("ручна кочница не држи","parkbrake"),("шлепер се откотрљао","parkbrake"),("рачната сопирачка не држи","parkbrake"),("дим из кабине","fire"),("кабина гори","fire"),("пожар у кабини","fire"),("чад од кабината","fire"),
 ("пукла гума","flat"),("гумата пукна","flat"),("волан блокиран","steer"),("воланот е заглавен","steer"),("цури уље","leak"),("тече масло","leak"),("имао сам саобраћајну несрећу","acc"),("имав сообраќајна несреќа","acc"),("возачот е повреден","injury"),("возач је повређен","injury"),
 ("мотор неће да упали","nostart"),("моторот не пали","nostart"),("акумулатор празан","batt"),("акумулаторот е празен","batt"),("изгубио сам кључеве","lost"),("ги изгубив клучевите","lost"),("огледало разбијено","mirror"),("огледалото е скршено","mirror"),
 ("лампица гори","warnlight"),("гори лампица за мотор","warnlight"),("свети лампичка","warnlight"),("тахограф не чита картицу","tacho"),("тахографот не ја чита картичката","tacho"),("хладњак не хлади","reefer"),("ладилникот не лади","reefer"),("мењач не убацује","gear"),("менувачот не влегува","gear")]
NO=["povredena guma","guma povrijeđena","кабината е повредена","гума повређена","кочнице поправљене","сопирачките се поправени","дим из ауспуха","чад од ауспухот","камен ударио у стакло","камен удри во стаклото","нема апарата за гашење пожара","нема противпожарен апарат","грејање седишта не ради","греењето на седиштето не работи","картица за гориво не ради","картичката за гориво не работи","све је у реду","сè е во ред","мотор ради нормално","моторот пак работи"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sr.inhaber','display_name':'SR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sr.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSR-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('кочнице не раде','ладилникот не лади','изгубио сам кључеве'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sr-{CASES.index((txt,want))}-{lang}-{w}.png')
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
