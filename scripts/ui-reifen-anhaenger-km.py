# [CLAUDE] UI-Test (01.11.2026, Backlog 828, Blickwinkel „Werkstatt erfasst Reifen am Anhänger mit km der Zugmaschine“): Reifen erfassen in der
# Fahrzeugakte zeigt am km-Feld beim Anhänger den Hinweis „nur Achskilometerzähler“, den zuletzt erfassten Stand und beim Tippen die Differenz
# bzw. bei kleinerem Stand eine Warnung; Lkw ohne Anhänger-Hinweis. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR='VIN:WKV00000828000011'; TK='VIN:WMA06XZZ8RP828012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rk.inhaber','display_name':'RK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r1=api('POST','/api/vehicles',{'vin':TR[4:],'plate':'RK-AN 828','site':'Dortmund','kind':'anhaenger'})
    r2=api('POST','/api/vehicles',{'vin':TK[4:],'plate':'RK-LK 828','site':'Dortmund','kind':'lkw'})
    check(r1['s'] in (200,201,409) and r2['s'] in (200,201,409),f'Fahrzeuge angelegt ({r1["s"]}/{r2["s"]})')
    k1=api('POST',f'/api/vehicles/{TR}/odometer',{'km':98000}); k2=api('POST',f'/api/vehicles/{TK}/odometer',{'km':612000})
    check(k1['s'] in (200,201,409) and k2['s'] in (200,201,409),f'km-Stände ({k1["s"]}/{k2["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{TR}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        check(q.locator('#tfkmtr').is_visible(),f'{lang}/{wd}: Anhänger-Hinweis')
        check(q.locator('#tfkmlast').is_visible() and ('98' in q.inner_text('#tfkmlast')),f'{lang}/{wd}: letzter Stand {q.inner_text("#tfkmlast")!r}')
        q.fill('#tfkm','612 300'); q.wait_for_timeout(50)
        check(q.locator('#tfkmdiff').is_visible() and q.locator('#tfkmlow').count()==0,f'{lang}/{wd}: größerer Stand → Differenz')
        q.fill('#tfkm','89000'); q.wait_for_timeout(50)
        check(q.locator('#tfkmlow').is_visible() and 'RK-AN 828' in q.inner_text('#tfkmlow'),f'{lang}/{wd}: kleinerer Stand → Warnung')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: q.locator('#tfkm').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifenkm-{lang}-{wd}.png')
        q.fill('#tfkm',''); q.wait_for_timeout(50)
        check(q.locator('#tfkmlow').count()==0 and q.locator('#tfkmdiff').count()==0,f'{lang}/{wd}: leer → keine Anzeige')
        q.goto(B+f'/#/vehicles/{TK}'); q.wait_for_selector('#tf',state='attached',timeout=15000); q.wait_for_timeout(200)
        check(q.locator('#tfkmtr').count()==0 and q.locator('#tfkmlast').count()==1,f'{lang}/{wd}: Lkw ohne Anhänger-Hinweis, mit letztem Stand')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
