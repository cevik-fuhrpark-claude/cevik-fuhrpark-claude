# [CLAUDE] UI-Test (16.10.2026): Kosten je Fahrzeug – gefahrene km nach der Regel „Fahrleistung je Monat“: km je Monat in der Monatszeile,
# km-Stände (von – bis) mit Basis „ab erster Ablesung im Zeitraum“, Regeltext; DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, re, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777789'; VID='VIN:'+VIN; PLATE='KM-UI 1'
SPAN={'de':'km-Stände','uk':'Показники км','en':'Odometer readings'}
FIRST={'de':'ab erster Ablesung im Zeitraum','uk':'від першого показника в періоді','en':'from the first reading in the period'}
RULE={'de':'Fahrleistung je Monat','uk':'Пробіг за місяць','en':'Mileage per month'}
NUM={'de':r'3\.500 km','uk':r'3 ?500 (km|км)','en':r'3,500 km'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
first=today.replace(day=1); prev=(first-datetime.timedelta(days=1)).replace(day=10)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'km.inhaber','display_name':'KM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='km.inhaber' if s['s']==200 else None
    if not user:
        for u in ['fl.inhaber','vf.inhaber','ku.inhaber','inhaber','ui.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: user=u; break
    check(user and api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':PLATE,'vin':VIN,'site':'Dortmund'})
    check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':200000,'measured_on':prev.isoformat()})['s'] in (201,409),'Ablesung Vormonat')
    check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':203500})['s'] in (201,409),'Ablesung heute')
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'km-Kostentest Spiegel','priority':'niedrig','driveability':'fahrbereit','request_key':'km-ui-1'})
    check(c['s'] in (200,201),'Vorgang angelegt (Monatszeile)')
    rep=api('GET',f'/api/reports/costs?vehicle_id={VID}')['d']
    v=[x for x in rep['vehicles'] if x['vehicle_id']==VID][0]
    check(v['km']==3500 and v['km_basis']=='first_in_period',f"API: {v['km']} km, Basis {v['km_basis']}")
    ym=today.strftime('%Y-%m')
    check(any(r['month']==ym and r['km']==3500 for r in rep['rows']),'API: Monatszeile 3500 km')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.goto(B+'/#/costs'); q.wait_for_selector('#cr',timeout=15000)
        det=q.locator('details.row',has_text=PLATE).first
        det.locator('summary').click()
        t=det.inner_text().replace(' ',' ').replace('\xa0',' ')
        check(SPAN[lang] in t and FIRST[lang] in t,f'{lang}/{w}: km-Stände mit Basis')
        check(len(re.findall(NUM[lang],t))>=2,f'{lang}/{w}: 3500 km im Sprachformat (Fahrzeug + Monat) ({t.replace(chr(10)," | ")[:140]})')
        check(RULE[lang] in q.inner_text('body'),f'{lang}/{w}: Regeltext verweist auf „{RULE[lang]}“')
        check('NaN' not in t and 'undefined' not in t and '{' not in t,f'{lang}/{w}: keine Platzhalter')
        if SHOTS: det.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kosten_km_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
