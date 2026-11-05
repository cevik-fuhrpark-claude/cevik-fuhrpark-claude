# [CLAUDE] UI-Test (05.11.2026, Backlog 1030): Prüftermine – Knopf „Kalender“ ist bei einer Auswahl ohne Termine mit Datum
# (z. B. Reiter „Pflichtprüfungen ohne Termin“ oder leerer Reiter) gesperrt und nennt den Grund; mit Terminen (Reiter „Alle“) aktiv,
# Kalendername der Auswahl (Backlog 1029). 390/820/1366 px, DE/UK/EN, kein Querscrollen, keine Skriptfehler.
# Verträge (Backlog 1031): Kalender bei einer Vertragsart ohne laufende Verträge gesperrt mit Hinweis, sonst aktiv.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT = """async (path) => (await (await fetch(path)).text()).replace(/\\r\\n[ \\t]/g, '')"""
HINT={'de':'keine Termine mit Datum','uk':'не містить термінів із датою','en':'no dated events'}
ALL={'de':'Alle','uk':'Усі','en':'All'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ka.inhaber','display_name':'KA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ka.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WDB96340310557322'; check(api('POST','/api/vehicles',{'vin':vin,'plate':'KA-ICS 1','site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt (synthetisch)')
    td=datetime.date.today()
    # Ölwechsel in ca. 200 Tagen fällig (außerhalb jeder Vorwarnung) – synthetische Testdaten
    r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'Ölwechsel','interval_months':12,'last_done_date':(td-datetime.timedelta(days=160)).isoformat(),'evidence':'UI-Test Beleg'})
    check(r['s'] in (200,201),f'Prüfregel (synthetisch) {r["s"]}')
    r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',{'kind':'leasing','partner':'UI-Test-Leasing','start_date':(td-datetime.timedelta(days=30)).isoformat(),
        'end_date':(td+datetime.timedelta(days=500)).isoformat(),'notice_months':3,'evidence':'UI-Test Kalender'})
    check(r['s'] in (200,201),f'Vertrag (synthetisch) {r["s"]}')
    for (w,h),lang in [((390,844),'de'),((820,1180),'uk'),((1366,900),'en')]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE',service_workers='block'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ka.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance?f=gaps'); q.reload(); q.wait_for_selector('#mics',timeout=15000); q.wait_for_timeout(400)
        check(q.locator('#mics').is_disabled(),f'{w}px/{lang}: Reiter „ohne Termin“ – Kalender gesperrt')
        check(HINT[lang] in q.inner_text('[data-mics-hint]'),f'{w}px/{lang}: Hinweis nennt den Grund')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{w}px/{lang}: kein waagrechtes Scrollen (gesperrt)')
        if SHOTS: q.locator('#mics').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kalender-auswahl_{lang}_{w}.png')
        q.locator('[data-mf="all"]').first.click(); q.wait_for_timeout(600)
        check(not q.locator('#mics').is_disabled() and q.locator('[data-mics-hint]').count()==0,f'{w}px/{lang}: Reiter „{ALL[lang]}“ – Kalender aktiv, kein Hinweis')
        cal=q.evaluate(TXT,'/api/maintenance?format=ics&filter=all')
        check('KA-ICS 1' in cal and 'X-WR-CALNAME:' in cal and ' · ' not in cal.split('X-WR-CALNAME:')[1].split('\r\n')[0],f'{w}px/{lang}: „Alle“ – Termin enthalten, Kalendername ohne Zusatz')
        part=q.evaluate(TXT,'/api/maintenance?format=ics&filter=all&kind=%C3%96lwechsel')
        check(' · ' in part.split('X-WR-CALNAME:')[1].split('\r\n')[0],f'{w}px/{lang}: Prüfart im Kalendernamen')
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctics',timeout=15000); q.wait_for_timeout(400)
        check(not q.locator('#ctics').is_disabled() and q.locator('[data-ctics-hint]').count()==0,f'{w}px/{lang}: Verträge – Kalender aktiv')
        q.select_option('#ctk','versicherung'); q.wait_for_timeout(700)
        check(q.locator('#ctics').is_disabled() and q.locator('[data-ctics-hint]').count()==1,f'{w}px/{lang}: Vertragsart ohne Verträge – Kalender gesperrt mit Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{w}px/{lang}: Verträge kein waagrechtes Scrollen')
        if SHOTS: q.locator('#ctics').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kalender-vertraege_{lang}_{w}.png')
        q.select_option('#ctk',''); q.wait_for_timeout(500)
        check(not errs,f'{w}px/{lang}: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('Kalender-Auswahl: alles grün' if not fails else f'FEHLER: {len(fails)}'); raise SystemExit(1 if fails else 0)
