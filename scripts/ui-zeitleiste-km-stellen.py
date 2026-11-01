# [CLAUDE] UI-Test (01.11.2026, Backlog 838): Datenqualität „km-Stand mit mehr Stellen als der vorherige“ verlinkt in die Zeitleiste; dort
# steht am Stand „mehr Stellen als der vorherige Stand … – Ziffern prüfen“ mit „Begründung nachtragen“ (eigene Rückfrage); nach der Begründung
# ist der Hinweis weg. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
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
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zk.inhaber','display_name':'ZK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'zk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    past=(datetime.date.today()-datetime.timedelta(days=3)).isoformat()
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; V=f'VIN:WMA06XZZ8RP8380{n:02d}'
        r=api('POST','/api/vehicles',{'vin':V[4:],'plate':f'ZK-KM 8{n:02d}','site':'Dortmund','kind':'lkw'})
        check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
        api('POST',f'/api/vehicles/{V}/odometer',{'km':99800,'measured_on':past})
        api('POST',f'/api/vehicles/{V}/odometer',{'km':100150})
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        tag=f'{lang}/{wd}'
        q.goto(B+'/#/quality'); q.reload(); q.wait_for_selector(f'a[href*="{V}/timeline"]', state='attached', timeout=15000)
        check(q.locator(f'a[href*="{V}/timeline"]').count()>=1,f'{tag}: Datenqualität verlinkt in die Zeitleiste')
        q.goto(B+f'/#/vehicles/{V}/timeline?f=maintenance'); q.wait_for_selector('[data-ododigits]', timeout=15000)
        txt=q.inner_text('[data-ododigits]')
        check('99' in txt and '800' in txt,f'{tag}: Hinweis nennt vorherigen Stand ({txt})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: q.locator('[data-ododigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tlkmstellen-{lang}-{wd}.png')
        msgs=[]
        def on_dialog(d): msgs.append(d.message); d.accept('100 000 km überschritten')
        q.on('dialog', on_dialog)
        q.click('[data-odonote]')
        q.wait_for_selector('[data-ododigits]', state='detached', timeout=15000)
        check(msgs and ('100' in msgs[0]),f'{tag}: eigene Rückfrage')
        check(q.locator('[data-ododigits]').count()==0,f'{tag}: nach Begründung kein Hinweis')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
