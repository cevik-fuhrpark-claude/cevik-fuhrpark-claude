# [CLAUDE] UI-Test: Kalenderdateien (.ics) in der App-Sprache der Person. Prüftermin- und Vertragskalender werden über die Knöpfe/Adressen
# der App geladen (Sitzung des Browsers) und auf Sprache, Datumsformat und deutsche Reste geprüft; Hilfe „Ausdrucke & Exporte“ nennt die Sprache.
# 390/820/1366 px, DE/UK/EN, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, re, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT = """async (path) => (await (await fetch(path)).text()).replace(/\\r\\n /g, '')"""
CAL={'de':('Fuhrpark Prüftermine','Fuhrpark Verträge','in Ihrer App-Sprache'),'uk':('Автопарк: терміни перевірок','Автопарк: договори','мовою вашого застосунку'),
     'en':('Fleet inspection dates','Fleet contracts','in your app language')}
GERMAN=re.compile(r'fällig|Kündigung|Vertragsende|Werkstatttermin|Nachweis:|letzte Prüfung|Fuhrpark ')
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ks.inhaber','display_name':'KS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ks.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WDB96340310557311'; check(api('POST','/api/vehicles',{'vin':vin,'plate':'KS-ICS 1','site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt (synthetisch)')
    vid='VIN:'+vin; td=datetime.date.today()
    r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Ölwechsel','interval_months':12,'last_done_date':(td-datetime.timedelta(days=300)).isoformat(),'evidence':'UI-Test Beleg'})
    check(r['s'] in (200,201),f'Prüfregel (synthetisch) {r["s"]}')
    r=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'UI-Test-Leasing','start_date':(td-datetime.timedelta(days=30)).isoformat(),
        'end_date':(td+datetime.timedelta(days=500)).isoformat(),'notice_months':3,'evidence':'UI-Test Kalender'})
    check(r['s'] in (200,201),f'Vertrag (synthetisch) {r["s"]}')
    for (w,h),lang in [((390,844),'de'),((820,1180),'uk'),((1366,900),'en'),((390,844),'uk'),((390,844),'en')]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ks.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance'); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(500)
        hrefs=q.eval_on_selector_all('a[href*="format=ics"]','els => els.map(e => e.getAttribute("href"))')
        btn=any('/api/maintenance' in x for x in hrefs) or q.locator('text=/\\.ics|Kalender|Календар|Calendar/').count()>0
        check(btn,f'{w}px/{lang}: Prüftermine bieten Kalender an')
        m=q.evaluate(TXT,'/api/maintenance?format=ics'); k=q.evaluate(TXT,'/api/contracts?format=ics')
        cm,ck,hs=CAL[lang]
        check(f'X-WR-CALNAME:{cm}' in m and f'X-WR-CALNAME:{ck}' in k,f'{w}px/{lang}: Kalendernamen in der Sprache')
        lines='\n'.join(l for l in (m+k).split('\r\n') if l.startswith(('SUMMARY','DESCRIPTION')))
        lines=re.sub(r'(Nachweis|Підстава|Evidence): .*?( · |$)',r'\1: …\2',lines,flags=re.M)
        check(not re.search(r'\b\d{4}-\d{2}-\d{2}\b',lines),f'{w}px/{lang}: kein ISO-Datum im Termintext')
        if lang!='de': check(not GERMAN.search(lines),f'{w}px/{lang}: keine deutschen Satzbausteine')
        dfmt=r'\d{2}/\d{2}/\d{4}' if lang=='en' else r'\d{2}\.\d{2}\.\d{4}'
        check(re.search(dfmt,lines) is not None,f'{w}px/{lang}: Datum im Sprachformat')
        q.goto(B+'/#/help'); q.wait_for_selector('#hq'); q.wait_for_timeout(300)
        body=q.inner_text('body')
        check(hs in body,f'{w}px/{lang}: Hilfe nennt Kalender in der App-Sprache')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{w}px/{lang}: kein waagrechtes Scrollen')
        if SHOTS:
            q.locator(f'text={hs}').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kalender_{lang}_{w}.png')
        check(not errs,f'{w}px/{lang}: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('Kalender in der App-Sprache: alles grün' if not fails else f'FEHLER: {len(fails)}'); raise SystemExit(1 if fails else 0)
