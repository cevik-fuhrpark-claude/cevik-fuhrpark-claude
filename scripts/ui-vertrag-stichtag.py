# [CLAUDE] UI-Test (23.10.2026, Backlog 196): Verträge mit Stichtag – Datumsfeld, Hinweis „Stand zum Stichtag“, Ablesedatum je Vertrag,
# Mehr-km bei Überschreitung, „Stichtag aufheben“; DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOTE={'de':'Stand zum Stichtag','uk':'Стан на','en':'Status as of'}
EXC={'de':'Mehr-km','uk':'Перепробіг','en':'Excess km'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); d=lambda n: str(today+datetime.timedelta(days=n))
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vs.inhaber','display_name':'VS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    V='VIN:WDB96340310596901'
    api('POST','/api/vehicles',{'vin':'WDB96340310596901','plate':'VS-ST 196','site':'Dortmund'})
    r=api('POST',f'/api/vehicles/{V}/contracts',{'kind':'leasing','partner':'UI-Leasing','evidence':'UI-Test','start_date':d(-300),'end_date':d(400),'km_allowance':40000,'start_km':100000})
    check(r['s'] in (200,201),'Vertrag angelegt '+str(r['s']))
    for km,n in [(100000,-300),(130000,-30),(150500,-2)]:
        check(api('POST',f'/api/vehicles/{V}/odometer',{'km':km,'measured_on':d(n)})['s']==201,f'km {km}')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'vs.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctasof', timeout=15000)
        body=q.inner_text('body')
        check(EXC[lang] in body and q.locator('[data-ct-read]').count()==1,f'{lang} {w}px: heute Mehr-km + Ablesedatum')
        q.fill('#ctasof', d(-10)); q.dispatch_event('#ctasof','change')
        q.wait_for_selector('[data-ct-asof]', timeout=10000)
        body=q.inner_text('body')
        check(NOTE[lang] in body and EXC[lang] not in body,f'{lang} {w}px: Stichtag-Hinweis, keine Überschreitung zum Stichtag')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/stichtag_{lang}_{w}.png', full_page=True)
        q.click('#ctasofx'); q.wait_for_function("()=>!document.querySelector('[data-ct-asof]')", timeout=10000)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
