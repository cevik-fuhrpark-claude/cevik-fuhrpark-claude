# [CLAUDE] UI-Test (13.11.2026, Backlog 1455, Blickwinkel „Fahrer schreibt die Meldung auf Serbisch/Kroatisch/Bosnisch“):
# Meldeformular zeigt bei serbischen/kroatischen/bosnischen Stichwörtern (auch ohne č/ć/đ/š/ž getippt) dieselben Hinweise wie bei rumänischen (Backlog 1454) – Tabellen aus dem still nachgeladenen Modul app-sprachen.js – und keine weiteren
# (geprüft: genau der erwartete Hinweis sichtbar, kein deutscher/englischer/russischer Muster-Fehltreffer); Reparaturvermerk, Auspuffrauch, Steinschlag, Sitzheizung ohne Hinweis.
# DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[('kočnice ne rade','brake'),('kocnice ne rade','brake'),('pada pritisak zraka','brake'),('ručna kočnica ne drži','parkbrake'),('izlazi dim iz kabine','fire'),('pukla guma','flat'),('guma probušena','flat'),
 ('volan blokiran','steer'),('curi ulje','leak'),('imao sam udes','acc'),('povrijeđen sam','injury'),('motor ne pali','nostart'),('retrovizor slomljen','mirror'),('svjetla ne rade','lights'),
 ('upalila se lampica motora','warnlight'),('vjetrobransko staklo puklo','glass'),('prozor se ne spušta','window'),('akumulator prazan','batt'),('tahograf ne čita karticu','tacho'),('prikolica se ne kači','coupling'),
 ('nestalo goriva','dryfuel'),('motor se pregrijava','engine'),('guma oštećena','tyre'),('agregat ne hladi','reefer'),('jastuk pukao','susp'),('brzina ne ulazi','gear'),('klima ne radi','climate'),
 ('cerada pocijepana','tarp'),('auspuh otpao','exhaust'),('brisači ne rade','visib'),('pojas ne kopča','seat'),('matice točka olabavljene','wheel'),('zaglavio sam se u blatu','stuck'),('izgubio sam ključeve','lost'),
 ('registarska tablica otpala','numplate'),('asistent za traku ne radi','adas'),('vrata se ne zatvaraju','door'),('lift ne radi','door'),
 ('frânele nu funcționează','brake'),('hamulce nie działają','brake')]
NO=['kočnice popravljene','guma zamijenjena, sve ok','dim iz auspuha','kamen udario u staklo','nema aparata za gašenje','grijanje sjedišta ne radi','zvao sam pomoć na cesti','ne znam']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hr.inhaber','display_name':'HR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='hr.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHR-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt.startswith(('kočnice ne','agregat','izgubio')): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/bks-{txt[:5]}-{lang}-{w}.png')
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
