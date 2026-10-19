# [CLAUDE] UI-Test: Zahlen und Beträge im Format der Oberflächensprache – Fahrzeugakte mit km-Stand und Vertragsrate:
# Deutsch „123.456 km“/„1.234,50 €“, Englisch „123,456 km“/„€1,234.50“, Ukrainisch „123 456 км“/„1 234,50 €“.
# Fahrer-Aushang: Druckdatum in der Sprache des Aushangs (DE/UK „TT.MM.JJJJ“, EN „TT/MM/JJJJ“).
# Eingabefeld „Rate“ bleibt mit Komma vorbelegt (Server liest Komma und Punkt). 390/820/1366 px, keine Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, re, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':(r'123\.456 km',r'1\.234,50\s€'),'en':(r'123,456 km',r'€1,234\.50'),'uk':(r'123\s456 км',r'1\s234,50\s€')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WDB96340310557001'; check(api('POST','/api/vehicles',{'vin':vin,'plate':'FM-ZF 1','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    vid='VIN:'+vin; td=datetime.date.today()
    check(api('POST',f'/api/vehicles/{vid}/odometer',{'km':123456,'measured_on':td.isoformat()})['s'] in (200,201),'km-Stand 123456 (synthetisch)')
    r=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'UI-Test-Leasing','contract_no':'ZF-1','start_date':(td-datetime.timedelta(days=30)).isoformat(),
        'end_date':(td+datetime.timedelta(days=700)).isoformat(),'notice_months':3,'monthly_rate_net':'1234,5','evidence':'UI-Test Zahlenformat'})
    check(r['s'] in (200,201),f'Vertrag mit Rate 1234,5 (synthetisch) {r["s"]}')
    for (w,h),lang in zip([(390,844),(820,1180),(1366,900)],['de','en','uk']):
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{vid}'); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(800)
        txt=q.inner_text('#app') if q.locator('#app').count() else q.inner_text('body')
        km,eu=EXP[lang]
        check(re.search(km,txt) is not None,f'{w}px/{lang}: km-Stand im Sprachformat ({km})')
        check(re.search(eu,txt) is not None,f'{w}px/{lang}: Rate im Sprachformat ({eu})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zahlenformat_{lang}_{w}.png',full_page=True)
        # Fahrer-Aushang: Druckdatum in der Sprache des Aushangs (unabhängig von der App-Sprache), nie handgebautes TT.MM.JJJJ auf Englisch
        bd=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()  # die App rechnet mit Berliner Kalendertag (nach Mitternacht MEZ ≠ UTC-Datum)
        dd=bd.strftime('%d'); mm=bd.strftime('%m'); yy=bd.strftime('%Y')
        for gl,pat in (('de',rf'{dd}\.{mm}\.{yy}'),('uk',rf'{dd}\.{mm}\.{yy}'),('en',rf'{dd}/{mm}/{yy}')):
            q.goto(B+f'/#/guide?l={gl}'); q.wait_for_selector('article.guide',timeout=15000); q.wait_for_timeout(300)
            last=q.locator('article.guide > p.small.muted').last.inner_text()
            check(re.search(pat,last) is not None,f'{w}px/App {lang}: Aushang {gl} Druckdatum {last.split("·")[0].strip()}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/aushang_en_{w}.png',full_page=True)
        check(not errs,f'{w}px/{lang}: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
