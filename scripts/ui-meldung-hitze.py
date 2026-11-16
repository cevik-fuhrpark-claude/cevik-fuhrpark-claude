# [CLAUDE] UI-Test (16.11.2026, Backlog 1535, Blickwinkel „Hitzewelle im Sommer“):
# Meldeformular zeigt bei „Motor wird bei der Hitze zu heiß“, „Kühlauflieger hält die Temperatur nicht“, „Kältemittel leer“, „Retarder überhitzt“,
# „Getriebe überhitzt“, „Reifen hinten rechts bei Hitze geplatzt“, „Sonnenrollo kaputt“ u. a. genau den erwarteten Hinweis (HEAT_KINDS im Start-Modul);
# Verneinung und Reparaturvermerk ohne. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["Motor wird bei der Hitze zu heiß", "engine"], ["Motor heiß gelaufen", "engine"], ["Lüfter vom Motor geht nicht an", "engine"], ["Kühlauflieger hält die Temperatur nicht", "reefer"], ["Kältemittel leer", "climate"], ["Klimaanlage hat kein Kältemittel mehr", "climate"], ["Klima muss neu befüllt werden", "climate"], ["Kondenswasser tropft aus der Klima", "climate"], ["Retarder überhitzt", "brake"], ["Retarder Temperatur Warnung", "brake"], ["Getriebeöltemperatur Warnung", "gear"], ["Getriebe überhitzt", "gear"], ["Reifen hinten rechts bei Hitze geplatzt", "flat"], ["Reifen am Auflieger hinten rechts außen geplatzt", "flat"], ["Sonnenrollo kaputt", "cabkit"]]
NO=["Motor ist nicht zu heiß", "Motor ist nicht überhitzt", "Motor wird nicht heiß", "Getriebe nicht überhitzt", "Kältemittel nachgefüllt, Klima geht wieder", "Klima wurde neu befüllt", "Kühlauflieger hält die Temperatur gut", "Retarder überhitzt, Werkstatt hat Retarder getauscht", "Sonnenrollo repariert", "Reifen hinten rechts bei Hitze nicht geplatzt", "Reifen hinten rechts bei Hitze geplatzt, neuer Reifen montiert", "Wir haben kein Kältemittel im Lager", "Motorraum heiß", "Retarder überhitzt nicht"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hitze.inhaber','display_name':'Hitze Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='hitze.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHZ-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
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
            if SHOTS and txt in ('Kühlauflieger hält die Temperatur nicht','Getriebe überhitzt'): q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hitze-{CASES.index([txt,want])}-{lang}-{w}.png')
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
