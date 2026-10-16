# [CLAUDE] UI-Test (16.10.2026): km-Zähler gesunken (Tachotausch) – Fahrzeugakte (Prüfung nach km, Vertrag) und Prüftermine zeigen
# „Fälligkeit nach km ungeklärt“ statt einer Restlaufleistung; DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777799'; VID='VIN:'+VIN
UNCLEAR={'de':'Fälligkeit nach km ungeklärt','uk':'Строк за пробігом не з’ясовано','en':'Mileage due unclear'}
CT={'de':'gefahrene km gegen das Kontingent nicht berechenbar','uk':'пробіг щодо ліміту неможливо розрахувати','en':'km driven against the allowance cannot be calculated'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
d=lambda n: (today+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tt.inhaber','display_name':'TT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='tt.inhaber' if s['s']==200 else None
    if not user:
        for u in ['fl.inhaber','vf.inhaber','inhaber','ui.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: user=u; break
    check(user and api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    if api('POST','/api/vehicles',{'plate':'TT-UI 1','vin':VIN,'site':'Dortmund'})['s']==201:
        check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':300000,'measured_on':d(-40)})['s']==201,'Ablesung alter Zähler')
        r=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'Ölwechsel','interval_km':50000,'last_done_km':280000,'evidence':'UI-Test Tachotausch'})
        check(r['s']==201,'km-Regel')
        check(api('POST',f'/api/vehicles/{VID}/contracts',{'kind':'leasing','partner':'UI-Leasing','start_date':d(-60),'end_date':d(500),'km_allowance':200000,'start_km':250000,'evidence':'UI-Testvertrag'})['s']==201,'Vertrag mit Kontingent')
        check(api('POST',f'/api/vehicles/{VID}/odometer',{'km':1200,'note':'Tachotausch (UI-Test)'})['s']==201,'Tachotausch mit Begründung')
    row=[x for x in api('GET','/api/maintenance')['d']['rows'] if x['vehicle_id']==VID and x['kind']=='Ölwechsel'][0]
    check(row['km_unclear']=='counter_drop' and row['km_remaining'] is None,'API: km-Fälligkeit ungeklärt')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.goto(B+f'/#/vehicles/{VID}'); q.wait_for_selector('.km-unclear',timeout=15000)
        t=q.inner_text('main') if q.locator('main').count() else q.inner_text('body')
        check(UNCLEAR[lang] in t,f'{lang}/{w}: Akte zeigt „{UNCLEAR[lang]}“')
        check(CT[lang] in t,f'{lang}/{w}: Vertrag ohne gefahrene km')
        check('NaN' not in t and 'undefined' not in t and '{d}' not in t,f'{lang}/{w}: keine Platzhalter')
        if SHOTS: q.locator('.km-unclear').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tt_akte_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: Akte kein Querscrollen')
        q.goto(B+'/#/maintenance'); q.wait_for_selector('[data-mf]',timeout=15000)
        q.click('[data-mf="ungeklaert"]'); q.wait_for_selector('.km-unclear',timeout=15000)
        t2=q.inner_text('body')
        check(UNCLEAR[lang] in t2 and 'TT-UI 1' in t2,f'{lang}/{w}: Prüftermine „ungeklärt“ mit Hinweis')
        if SHOTS: q.locator('.km-unclear').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tt_maint_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: Prüftermine kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
