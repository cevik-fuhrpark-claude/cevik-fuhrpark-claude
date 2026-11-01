# [CLAUDE] UI-Test (01.11.2026, Backlog 841, Folge aus 838): km-Wartung überfällig nur wegen einer letzten Ablesung mit mehr Stellen als die
# vorherige → Hinweis „Ziffern prüfen“ in der Prüftermin-Übersicht und in der Fahrzeugakte (nicht beim Fahrzeug mit plausiblem Stand);
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wk.inhaber','display_name':'WK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: str(today+datetime.timedelta(days=n))
    VA='VIN:WDB96340310841001'
    for vin,plate,km2 in [('WDB96340310841001','WK-ON 841',1400500),('WDB96340310841002','WK-ON 842',160500)]:
        api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'})
        r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'Ölwechsel','interval_km':100000,'last_done_km':50000,'evidence':'UI-Test 841'})
        check(r['s']==201,'Wartungsregel '+str(r['s']))
        for km,n in [(140000,-5),(km2,0)]: check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':km,'measured_on':d(n)})['s']==201,f'km {km}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'wk.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance'); q.reload(); q.wait_for_selector('[data-kmdigits]', timeout=15000)
        check(q.locator('[data-kmdigits]').count()==1,f'{lang} {w}: Übersicht genau ein Hinweis')
        txt=q.inner_text('[data-kmdigits]')
        check('140' in txt,f'{lang} {w}: nennt vorherigen Stand ({txt})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Übersicht ohne Querscrollen')
        if SHOTS: q.locator('[data-kmdigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wartungkm-{lang}-{w}.png')
        q.goto(B+'/#/vehicles/'+VA); q.wait_for_selector('[data-kmdigits]', state='attached', timeout=15000)
        q.wait_for_load_state('networkidle'); q.wait_for_timeout(400) # Akte rendert nach dem Nachladen erneut
        check(q.locator('[data-kmdigits]').count()>=1 and '140' in q.locator('[data-kmdigits]').first.inner_text(),f'{lang} {w}: Fahrzeugakte mit Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Akte ohne Querscrollen')
        if SHOTS: q.locator('[data-kmdigits]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wartungkm-akte-{lang}-{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
