# [CLAUDE] UI-Test: Werkstatt-Startseite und Inhaber „Heute zu tun“ „Winterreifen – Lkw ohne Alpine-Symbol“ (DE/UK/EN, 390/820/1366 px):
# Abschnitt erscheint mit Kennzeichen/Position, Link führt in Reifen – Flotte mit Reiter „Winter nicht erfüllt“ (aria-pressed),
# Reiterwechsel danach bleibt erhalten; kein JS-Fehler, kein waagrechtes Scrollen. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
H={'de':'Winterreifen – Lkw ohne Alpine-Symbol','uk':'Зимові шини – вантажівки без альпійського символу','en':'Winter tyres – trucks without Alpine symbol'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'w.inhaber','display_name':'W Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'w.inhaber','password':PW})
    v=api('POST','/api/vehicles',{'vin':'WDB96340510399901','plate':'SZ-YC 9901','site':'Dortmund','kind':'lkw'})
    vid=(v['d'] or {}).get('id') or (v['d'] or {}).get('vehicle',{}).get('id') or 'VIN:WDB96340510399901'
    api('POST','/api/vehicles',{'vin':'WDB96340510399902','plate':'SZ-YC 9902','site':'Dortmund','kind':'lkw'})
    r=api('POST',f'/api/vehicles/{vid}/tires/events',{'event_type':'wechsel','position':'VA-R','size':'315/70 R22.5','winter_mark':'ms'})
    check(r['s']==201,'Reifenwechsel erfasst')
    u=api('POST','/api/users',{'username':'w.werkstatt','display_name':'W Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    if u['s'] in (200,201): a.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'w.werkstatt','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('#wswinter')
        txt=q.inner_text('#wswinter')
        check(H[lang] in txt,'Überschrift'); check('SZ-YC 9901' in txt and 'VA-R' in txt,'Kennzeichen + Position'); check('SZ-YC 9902' not in txt,'nicht erfasster Lkw nicht als „nicht erfüllt“')
        check(q.locator('#wswunk').count()==1,'Link „nicht erfasst“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
        if SHOTS: q.locator('#wswinter').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wswinter_{lang}_{w}.png')
        q.click('#wswbad'); q.wait_for_selector('[data-tf="winter_bad"][aria-pressed="true"]')
        check('SZ-YC 9901' in q.inner_text('main'),'Reifen – Flotte zeigt Lkw im Reiter')
        check(q.evaluate('location.hash')=='#/tires','Adresse ohne ?f= (Reiterwechsel bleibt)')
        q.click('[data-tf="all"]'); q.wait_for_selector('[data-tf="all"][aria-pressed="true"]')
        check(True,'Reiterwechsel nach Direktsprung')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wswinter_tires_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+';'.join(errs))
        c.close()
    # Inhaber/Fuhrparkleitung: „Heute zu tun“ mit Gruppe Winterreifen und Direktsprung
    for lang,lbl in [('de','Winterreifen: Lkw ohne Alpine-Symbol'),('uk','Зимові шини: вантажівки без альпійського символу'),('en','Winter tyres: trucks without Alpine symbol')]:
      for w,h in [(390,844),(1366,900)]:
        print('— Inhaber',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'w.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('#todowinter',state='attached')
        d=q.locator('details',has=q.locator('#todowinter'))
        check(lbl in d.locator('summary').inner_text(),'Gruppe „Heute zu tun“'); d.locator('summary').click()
        check('SZ-YC 9901' in d.inner_text() and 'VA-R' in d.inner_text(),'Kennzeichen + Position')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
        if SHOTS: d.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/todowinter_{lang}_{w}.png')
        q.click('#todowinter'); q.wait_for_selector('[data-tf="winter_bad"][aria-pressed="true"]'); check(True,'Direktsprung Reiter')
        check(not errs,'keine JS-Fehler '+';'.join(errs)); c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
