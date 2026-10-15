# [CLAUDE] UI-Test: Zeitleiste und Fahrerakte (Verläufe Auslesungen/Führerscheinkontrollen) zeigen einen Hinweis, wenn ältere Einträge nicht angezeigt werden (`truncated`), auch im Ausdruck-Vermerk;
# ohne `truncated` kein Hinweis. Die Antwort wird im Browser abgefangen (500+ Ereignisse im Dev-Server anzulegen wäre langsam) –
# die Serverseite prüft test/run.mjs. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888813'; VID='VIN:'+VIN
TXT={'de':'Angezeigt werden nur die neuesten','uk':'Показано лише','en':'Only the newest'}
SHORT={'de':'nur die neuesten','uk':'лише найновіші','en':'newest only'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zl.inhaber','display_name':'ZL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'zl.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'ZL-TL 1','vin':VIN,'site':'Dortmund'})
    for i in range(3): api('POST','/api/cases',{'vehicle_id':VID,'description':f'Zeitleiste {i}','priority':'niedrig','driveability':'fahrbereit','request_key':f'zl-{i}'})
    drv=api('POST','/api/drivers',{'display_name':'ZL Fahrer'})['d']['id']
    api('POST',f'/api/drivers/{drv}/documents',{'kind':'fahrerkarte','valid_until':'2030-01-31','evidence':'Karte gesehen'})
    api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':drv,'downloaded_on':'2026-10-01','evidence':'Datei 1'})
    api('POST',f'/api/drivers/{drv}/license-checks',{'checked_on':'2026-10-01','result':'in_ordnung'})
    DTXT={'de':'Angezeigt werden die neuesten','uk':'Показано','en':'Showing the newest'}
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zl.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+VID+'/timeline'); q.wait_for_selector('[data-tl]')
        body=q.inner_text('body')
        check(q.locator('.list .row').count()>=3 and TXT[lang] not in body,f'{lang} {w}px: ohne Kürzung kein Hinweis')
        def trunc(route):
            r=route.fetch(); d=r.json(); d['truncated']=True; d['total']=len(d['items'])+1
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/timeline?*', trunc)
        q.locator('[data-tl="case"]').click(); q.wait_for_selector('#tltrunc')
        hint=q.locator('#tltrunc').inner_text()
        check(TXT[lang] in hint and str(q.locator('.list .row').count()) in hint,f'{lang} {w}px: Hinweis mit Anzahl ({hint[:60]!r})')
        q.emulate_media(media='print')
        ph=q.locator('.print-only').first.inner_text() if q.locator('.print-only').count() else ''
        check(SHORT[lang] in q.inner_text('body'),f'{lang} {w}px: Druckvermerk nennt die Kürzung')
        check(q.locator('#tltrunc').is_visible(),f'{lang} {w}px: Hinweis auch im Ausdruck')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zeitleiste_druck_{lang}_{w}.png',full_page=True)
        q.emulate_media(media='screen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zeitleiste_hinweis_{lang}_{w}.png',full_page=True)
        q.unroute('**/timeline?*')
        def vtrunc(route):
            r=route.fetch(); d=r.json(); d['inspections_truncated']=True
            if not d['inspections']: d['inspections']=[{'id':'x','kind':'abfahrt','result':'ok','odometer_km':None,'created_at':'2026-10-01T08:00:00.000Z','case_id':None,'performed_by_name':'ZL Inhaber','performed_by_role':'owner'}]
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/api/vehicles/'+VID.replace(':','%3A'), vtrunc); q.route('**/api/vehicles/'+VID, vtrunc)
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#prt')
        if q.locator('#insptrunc').count():
            href=q.locator('#insptrunc a').get_attribute('href')
            check(href.endswith('/timeline?f=inspection'),f'{lang} {w}px: Akte-Hinweis verlinkt Zeitleiste/Kontrollen ({href})')
        else:
            check(False,f'{lang} {w}px: Akte-Hinweis fehlt (keine Kontrollen im Testfahrzeug?)')
        q.unroute('**/api/vehicles/'+VID.replace(':','%3A')); q.unroute('**/api/vehicles/'+VID)
        q.goto(B+'/#/drivers/'+drv); q.wait_for_selector('#dthist'); q.wait_for_selector('#dlchist')
        check(q.locator('.dtrunc').count()==0 and '+)' not in q.locator('#dthist summary').inner_text(),f'{lang} {w}px: Fahrerakte ohne Kürzung kein Hinweis')
        def dtrunc(route):
            r=route.fetch(); d=r.json(); d['tacho_downloads_truncated']=True; d['license_checks_truncated']=True
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/api/drivers/'+drv, dtrunc)
        q.goto(B+'/#/'); q.goto(B+'/#/drivers/'+drv); q.wait_for_selector('#dthist')
        q.locator('#dthist summary').click(); q.locator('#dlchist summary').click()
        check('(1+)' in q.locator('#dthist summary').inner_text() and '(1+)' in q.locator('#dlchist summary').inner_text(),f'{lang} {w}px: Anzahl mit „+“')
        hs=q.locator('.dtrunc').all_text_contents()
        check(len(hs)==2 and all(DTXT[lang] in h for h in hs),f'{lang} {w}px: Fahrerakte-Hinweis zweimal ({hs[:1]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Fahrerakte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrerakte_hinweis_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
