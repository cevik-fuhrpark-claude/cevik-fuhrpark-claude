# [CLAUDE] UI-Test (01.11.2026, Backlog 843, Blickwinkel „Wartungsplan-Import: km der letzten Prüfung mit einer Ziffer zu viel“): Importvorschau
# zeigt „Ziffern prüfen“ nur in der betroffenen Zeile; Formular „Prüftermin anlegen“ in der Fahrzeugakte warnt beim Tippen von km der letzten
# Durchführung mit mehr Stellen als der letzte Stand. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wi.inhaber','display_name':'WI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wi.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    VA='VIN:WDB96340310843001'
    for vin,plate in [('WDB96340310843001','WI-ON 843'),('WDB96340310843002','WI-ON 844')]:
        api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'})
        check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':140000})['s']==201,'km '+plate)
    d=str(today-datetime.timedelta(days=20))
    csv=f'Kennzeichen;Art;Letzte Prüfung;km bei letzter Prüfung;Intervall km;Nachweis\nWI-ON 843;Ölwechsel;{d};1351000;100000;Rechnung UI 843\nWI-ON 844;Ölwechsel;{d};135100;100000;Rechnung UI 843\n'
    path=os.path.join(SHOTS or '/tmp','ui-843-import.csv'); open(path,'w',encoding='utf-8').write(csv)
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'wi.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance'); q.reload(); q.wait_for_selector('#mimp', state='attached', timeout=15000)
        q.set_input_files('#mimp', path); q.wait_for_selector('#mimpr table', timeout=15000)
        n=q.locator('[data-impkmdigits]').count()
        check(n==1,f'{lang} {w}: Vorschau genau ein Hinweis ({n})')
        if n:
            row=q.locator('#mimpr tr:has([data-impkmdigits])').inner_text()
            check('843' in row and '140' in row and '844' not in row,f'{lang} {w}: richtige Zeile, nennt letzten Stand')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Vorschau ohne Querscrollen')
        if SHOTS and n: q.locator('[data-impkmdigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wimpkm-{lang}-{w}.png')
        q.goto(B+'/#/vehicles/'+VA); q.wait_for_selector('#mf', state='attached', timeout=15000)
        q.wait_for_load_state('networkidle'); q.wait_for_timeout(400)
        q.evaluate("() => { const f = document.getElementById('mf'); const dd = f && f.closest('details'); if (dd) dd.open = true; }")
        q.fill('#mf [name=last_done_km]','135100'); check(q.locator('#mfkmdigits').count()==0,f'{lang} {w}: plausibler Wert ohne Hinweis')
        q.fill('#mf [name=last_done_km]','1351000'); q.wait_for_selector('#mfkmdigits', timeout=5000)
        check('140' in q.inner_text('#mfkmdigits'),f'{lang} {w}: Formular warnt mit letztem Stand')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Akte ohne Querscrollen')
        if SHOTS: q.locator('#mfkmdigits').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wimpkm-akte-{lang}-{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
