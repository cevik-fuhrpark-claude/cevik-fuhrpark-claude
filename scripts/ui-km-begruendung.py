# [CLAUDE] UI-Test km-Begründung nachtragen (Backlog 115, 22.10.2026): Datenqualität „Rücksprung ohne Begründung“ führt in die Zeitleiste
# (Filter Wartung), dort „Begründung nachtragen“ an der Ablesung; danach ist der Knopf weg und die Datenqualität ohne den Punkt.
# DE/UK/EN bei 390/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN={'de':'Begründung nachtragen','uk':'Додати обґрунтування','en':'Add reason'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kmb.inhaber','display_name':'KMB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kmb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(1366,900)]:
        n+=1; vin=f'WDB96340310780{100+n}'; V='VIN:'+vin
        api('POST','/api/vehicles',{'vin':vin,'plate':f'KMB-{n}','site':'Dortmund'})
        api('POST',f'/api/vehicles/{V}/odometer',{'km':300000,'measured_on':'2026-01-10'})
        api('POST',f'/api/vehicles/{V}/odometer',{'km':5000,'measured_on':'2026-01-11','note':'x'})
        a.evaluate("async (v)=>fetch('/__dev/odo-clear-note?vehicle='+encodeURIComponent(v),{method:'POST'})",V)
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'kmb.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/quality'); q.wait_for_selector('main h1'); q.wait_for_timeout(600)
        lk=q.locator(f'a[href="#/vehicles/{V}/timeline?f=maintenance"]')
        check(lk.count()>=1,f'{lang} {w}px: Datenqualität verlinkt die Zeitleiste')
        if lk.count(): lk.first.click()
        else: q.goto(B+f'/#/vehicles/{V}/timeline?f=maintenance')
        q.wait_for_selector('[data-odonote]',timeout=8000)
        check(q.inner_text('[data-odonote]').strip()==BTN[lang],f'{lang} {w}px: Knopf „{q.inner_text("[data-odonote]").strip()}“')
        bx=q.locator('[data-odonote]').bounding_box(); check(bx and bx['height']>=44,f'{lang} {w}px: Tippfläche {bx and round(bx["height"])}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/kmb_{lang}_{w}.png')
        q.once('dialog', lambda d: d.accept('Tachotausch laut Rechnung'))
        q.click('[data-odonote]'); q.wait_for_function("()=>!document.querySelector('[data-odonote]')",timeout=8000)
        check('Tachotausch laut Rechnung' in q.inner_text('main'),f'{lang} {w}px: Begründung angezeigt')
        dq=q.evaluate(JS,['GET','/api/admin/data-quality'])['d']['items']
        check(not any(i['check']=='km_drop_unexplained' and i['vehicle_id']==V for i in dq),f'{lang} {w}px: Datenqualität erledigt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Alles grün (ui-km-begruendung)')
raise SystemExit(1 if fails else 0)
