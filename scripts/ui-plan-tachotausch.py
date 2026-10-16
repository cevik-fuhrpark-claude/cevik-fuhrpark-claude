# [CLAUDE] UI-Test (16.10.2026): km-Zähler gesunken + Datum bald fällig – Werkstattplan „Fällig – ohne Termin“ und Prüftermine
# „Fällig ohne Termin“ zeigen die Prüfung weiter (vorher verschwunden), mit Hinweis „Fälligkeit nach km ungeklärt“ statt Restlaufleistung;
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777800'; VID='VIN:'+VIN; PLATE='TT-UI 2'
UNCLEAR={'de':'Fälligkeit nach km ungeklärt','uk':'Строк за пробігом не з’ясовано','en':'Mileage due unclear'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
d=lambda n: (today+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tp.inhaber','display_name':'TP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='tp.inhaber' if s['s']==200 else None
    if not user:
        for u in ['tt.inhaber','fl.inhaber','vf.inhaber','inhaber','ui.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: user=u; break
    check(user and api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    if api('POST','/api/vehicles',{'plate':PLATE,'vin':VIN,'site':'Dortmund'})['s']==201:
        check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':300000,'measured_on':d(-40)})['s']==201,'Ablesung alter Zähler')
        check(api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'Ölwechsel','interval_km':50000,'last_done_km':280000,'next_due_date':d(10),'evidence':'UI-Test Plan Tachotausch'})['s']==201,'Regel Datum + km')
        check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':1200,'note':'Tachotausch (UI-Test)'})['s']==201,'Tachotausch mit Begründung')
    md=[x for x in api('GET','/api/workshop/plan?days=14')['d']['maintenance_due'] if x['vehicle_id']==VID]
    check(md and md[0]['status']=='faellig' and md[0]['km_unclear']=='counter_drop','API: im Plan „ohne Termin“, Status nach Datum, km ungeklärt')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.goto(B+'/#/plan?s=mdue'); q.wait_for_selector('#wp-mdue',timeout=15000)
        rows=q.locator('#wp-mdue ~ .list a.row', has_text=PLATE)
        check(rows.count()>=1,f'{lang}/{w}: Plan „Fällig – ohne Termin“ enthält {PLATE}')
        t=rows.first.inner_text() if rows.count() else ''
        check(UNCLEAR[lang] in t,f'{lang}/{w}: Planzeile mit Hinweis „{UNCLEAR[lang]}“')
        check('NaN' not in t and 'undefined' not in t and '{d}' not in t,f'{lang}/{w}: keine Platzhalter')
        if SHOTS and rows.count(): rows.first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tp_plan_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: Plan kein Querscrollen')
        q.goto(B+'/#/maintenance'); q.wait_for_selector('[data-mf]',timeout=15000)
        q.click('[data-mf="noplan"]'); q.wait_for_selector('.km-unclear',timeout=15000)
        r2=q.locator('a.row', has_text=PLATE)
        check(r2.count()>=1 and UNCLEAR[lang] in r2.first.inner_text(),f'{lang}/{w}: Prüftermine „Fällig ohne Termin“ mit Hinweis')
        if SHOTS and r2.count(): r2.first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tp_maint_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: Prüftermine kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
