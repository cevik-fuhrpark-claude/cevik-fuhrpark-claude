# [CLAUDE] UI-Test (01.11.2026, Backlog 837, Folge aus 836): Fahrzeugakte „Kilometerstand erfassen“ zeigt den letzten Stand, beim Tippen die
# Differenz, bei kleinerem Stand „nur mit Begründung“, bei mehr Stellen „Ziffern prüfen“; mit früherem Ablesedatum kein Hinweis (Server prüft
# die Nachbarwerte). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V='VIN:WMA06XZZ8RP837011'
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
    r=api('POST','/api/vehicles',{'vin':V[4:],'plate':'KA-KM 837','site':'Dortmund','kind':'lkw'})
    check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
    o=api('POST',f'/api/vehicles/{V}/odometer',{'km':412345})
    check(o['s'] in (200,201,409),f'km-Stand erfasst ({o["s"]})')
    past=(datetime.date.today()-datetime.timedelta(days=5)).isoformat()
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ka.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+V); q.reload(); q.wait_for_selector('#kf', state='attached', timeout=15000)
        q.locator('#kf').locator('xpath=ancestor::details').locator('summary').click()
        tag=f'{lang}/{wd}'
        check(q.locator('#kflast').is_visible() and '412' in q.inner_text('#kflast'),f'{tag}: letzter Stand sichtbar')
        q.fill('#kf [name=km]','412900')
        check(q.locator('#kfkmdiff').count()==1 and '555' in q.inner_text('#kfkmdiff') and q.locator('#kfkmdigits').count()==0,f'{tag}: Differenz +555')
        q.fill('#kf [name=km]','4129000')
        check(q.locator('#kfkmdigits').is_visible(),f'{tag}: Null zu viel → Ziffern-Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: q.locator('#kf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/aktekm-{lang}-{wd}.png')
        q.fill('#kf [name=km]','41234')
        check(q.locator('#kfkmlow').is_visible(),f'{tag}: kleiner → Hinweis Begründung')
        q.fill('#kf [name=measured_on]',past); q.dispatch_event('#kf [name=measured_on]','change')
        check(q.inner_text('#kfkmd').strip()=='',f'{tag}: früheres Ablesedatum → kein Hinweis')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
