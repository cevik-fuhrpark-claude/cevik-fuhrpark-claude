# [CLAUDE] UI-Test (14.11.2026, Backlog 1467, Blickwinkel „Fahrer schreibt die Meldung auf Slowenisch“):
# Meldeformular zeigt bei slowenischen Stichwörtern (auch ohne č/š/ž) dieselben Hinweise wie bei den anderen Sprachen (Backlog 1453–1466) – Tabelle aus dem
# still nachgeladenen Modul app-sprachen.js – und keine weiteren (genau der erwartete Hinweis sichtbar); Reparaturvermerk, Auspuffrauch, Steinschlag, Feuerlöscher,
# Sitzheizung, Tankkarte, Verbandskasten, „vse je v redu“ ohne Hinweis; „guma je poškodovana“ nur Reifen. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[("zavore ne delajo","brake"),("ZAVORE NE DELAJO","brake"),("zavora slabo zavira","brake"),("rocna zavora ne drzi","parkbrake"),("ročna zavora ne drži","parkbrake"),("tovornjak se je sam odkotalil","parkbrake"),
 ("iz kabine se kadi","fire"),("dim iz motorja","fire"),("kabina gori","fire"),("počila mi je guma","flat"),("pnevmatika predrta","flat"),("volan je blokiran","steer"),("vleče v desno","steer"),("pušča olje","leak"),("olje kaplja pod motorjem","leak"),
 ("imel sem prometno nesrečo","acc"),("trčil sem v drug tovornjak","acc"),("voznik je ranjen","injury"),("pokličite rešilca","injury"),("motor ne vžge","nostart"),("tovornjak noče vžgati","nostart"),("akumulator je prazen","batt"),("izgubil sem ključe","lost"),
 ("ogledalo je razbito","mirror"),("luči ne delajo","lights"),("sveti lučka za motor","warnlight"),("gori lučka","warnlight"),("vetrobransko steklo je počilo","glass"),("okno se ne spušča","window"),("tahograf ne bere kartice","tacho"),("priklopnik se ne zapne","coupling"),
 ("zmanjkalo mi je goriva","dryfuel"),("motor se pregreva","engine"),("guma izgublja zrak","tyre"),("guma je poškodovana","tyre"),("hladilni agregat ne hladi","reefer"),("zračna blazina pušča","susp"),("prestava ne gre noter","gear"),("ogrevanje ne dela","climate"),
 ("cerada je strgana","tarp"),("izpuh je odpadel","exhaust"),("brisalci ne delajo","visib"),("pas se ne zapne","seat"),("vijaki kolesa so razrahljani","wheel"),("obtičal sem v blatu","stuck"),("registrska tablica je odpadla","numplate"),("kamera ne dela","adas"),("vrata se ne zaprejo","door")]
NO=["zavore popravljene","guma zamenjana","dim iz izpuha","kamen je zadel steklo","ni gasilnega aparata","gretje sedeža ne dela","kartica za gorivo ne dela","vse je v redu","motor dela normalno","manjka torbica za prvo pomoč","kabina je poškodovana","ogledalo spet dela"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sl.inhaber','display_name':'SL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sl.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSL-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('zavore ne delajo','hladilni agregat ne hladi','izgubil sem ključe'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sl-{CASES.index((txt,want))}-{lang}-{w}.png')
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
