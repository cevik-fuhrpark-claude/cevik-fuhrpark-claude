# [CLAUDE] UI-Test (16.10.2026): Fahrzeugakte „Fahrleistung je Monat“ – Ablesung im Vormonat und heute, km im Sprachformat,
# letzter km-Stand, Erklärung; DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os, re, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777788'; VID='VIN:'+VIN
TITLE={'de':'Fahrleistung je Monat','uk':'Пробіг за місяць','en':'Mileage per month'}
LAST={'de':'Letzter km-Stand','uk':'Останній показник км','en':'Latest odometer reading'}
NUM={'de':r'3\.500 km','uk':r'3 ?500 km','en':r'3,500 km'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
first=today.replace(day=1); prev=(first-datetime.timedelta(days=1)).replace(day=10)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fl.inhaber','display_name':'FL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='fl.inhaber' if s['s']==200 else None
    if not user:
        # Inhaber existiert bereits (anderes Skript lief zuerst) – bekannte Konten probieren
        for u in ['vf.inhaber','inhaber','ui.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: user=u; break
    check(user and api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'FL-UI 1','vin':VIN,'site':'Dortmund'})
    check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':200000,'measured_on':prev.isoformat()})['s'] in (201,409),'Ablesung Vormonat')
    check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':203500})['s']==201,'Ablesung heute')
    ml=api('GET',f'/api/vehicles/{VID}')['d']['mileage']
    check(ml['months'][0]['km']==3500,f"API: laufender Monat {ml['months'][0]['km']} km")
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.goto(B+f'/#/vehicles/{VID}'); q.wait_for_selector('#vmile',timeout=15000)
        t=q.inner_text('#vmile')
        check(TITLE[lang] in t and LAST[lang] in t,f'{lang}/{w}: Panel „{TITLE[lang]}“ mit letztem km-Stand')
        nt=t.replace(' ',' ').replace('\xa0',' ')
        check(re.search(NUM[lang],nt) is not None,f'{lang}/{w}: 3500 km im Sprachformat ({nt.replace(chr(10)," | ")[:120]})')
        check('NaN' not in t and 'undefined' not in t and '{' not in t,f'{lang}/{w}: keine Platzhalter')
        if SHOTS: q.locator('#vmile').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fl_akte_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
