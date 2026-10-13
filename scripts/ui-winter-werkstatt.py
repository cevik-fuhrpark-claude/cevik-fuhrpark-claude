# [CLAUDE] UI-Test: Werkstatt-Startseite und Inhaber „Heute zu tun“ „Winterreifen – Lkw ohne Alpine-Symbol“ (DE/UK/EN, 390/820/1366 px):
# Außerdem: Reifen-Positionsauswahl je Fahrzeugart (Lkw ohne AH, Anhänger nur AH/Reserve).
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
    # Inhaber: Werkstattauftrag „Umrüstung auf Winterreifen“ aus Fahrzeugakte → Reifen; danach Auftragsnummer in Akte und Werkstatt-Startseite
    WO={'de':'Werkstattauftrag: Umrüstung auf Winterreifen','uk':'Замовлення майстерні: переобування на зимові шини','en':'Workshop order: change to winter tyres'}
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'w.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#wodet',state='attached')
        q.evaluate("()=>{let d=document.querySelector('#wodet'); while(d){ if(d.tagName==='DETAILS') d.open=true; d=d.parentElement }}")
        check(WO[lang] in q.inner_text('#wodet summary'),f'Auftragsformular beschriftet ({lang} {w})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
        if SHOTS: q.locator('#wodet').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wo_{lang}_{w}.png')
        if lang=='en' and w==1366:
          q.select_option('#woform select[name=workshop_site]','DORTMUND'); q.click('#woform button'); q.wait_for_selector('#wolink')
          check('S-' in q.inner_text('#wolink') or 'T-' in q.inner_text('#wolink'),'Auftragsnummer in der Akte')
        check(not errs,'keine JS-Fehler '+';'.join(errs)); c.close()
    c=br.new_context(viewport={'width':390,'height':844},locale='de-DE'); q=c.new_page(); q.goto(B)
    q.evaluate(JS,['POST','/api/login',{'username':'w.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    q.goto(B+'/#/'); q.wait_for_selector('#wswinter')
    check('🔧 Werkstattauftrag' in q.inner_text('#wswinter'),'Werkstatt-Startseite zeigt Auftrag')
    if SHOTS: q.locator('#wswinter').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wswinter_order_390.png')
    cid=next((x['id'] for x in q.evaluate(JS,['GET','/api/cases'])['d']['cases'] if x.get('tire_order')=='winter'),None)
    check(cid is not None,'Werkstatt sieht Winterauftrag in der Liste')
    for lang,lbl in [('de','Auftrag Winterreifen'),('uk','Замовлення «Зимові шини»'),('en','Winter tyre order')]:
      q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_function("l=>document.querySelector('#cwinter') && document.querySelector('#cwinter').innerText.includes(l)",arg=lbl)
      tx=q.inner_text('#cwinter'); check(lbl in tx and 'VA-R' in tx,f'Vorgang zeigt Winterlage ({lang})')
      check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
      if SHOTS: q.locator('#cwinter').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/cwinter_{lang}_390.png')
    c.close()
    # Werkstatt: Umrüstung über „Gleiche Angaben auch für weitere Positionen“ → Lkw verschwindet aus „nicht erfüllt“
    for w,h in [(390,844),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'w.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#tf',state='attached')
        q.evaluate("()=>{let d=document.querySelector('#tf'); while(d){ if(d.tagName==='DETAILS') d.open=true; d=d.parentElement }}"); q.select_option('#tf select[name=event_type]','wechsel')
        q.select_option('#tf select[name=position]','VA-L'); q.click('#tfmore summary')
        if w==390: check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'Formular ohne waagrechtes Scrollen')
        if SHOTS: q.locator('#tfmore').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tfmore_{w}.png')
        if w==1366:
          for pz in ['VA-R','HA-L-aussen','HA-R-aussen']: q.check(f'#tfmore input[value="{pz}"]')
          q.fill('#tf input[name=size]','315/70 R22.5'); q.select_option('#tf select[name=winter_mark]','3pmsf'); q.click('#tf button.btn')
          q.wait_for_function("()=>!document.querySelector('#twinter') || !document.querySelector('#twinter').innerText.includes('VA-R')")
          wi=a.evaluate(JS,['GET','/api/tires/winter'])['d']
          check(not any(x['plate']=='SZ-YC 9901' for x in wi['noncompliant']),'nach Sammel-Erfassung nicht mehr „nicht erfüllt“')
        check(not errs,'keine JS-Fehler '+';'.join(errs)); c.close()
    # Positionsauswahl je Fahrzeugart (Lkw ohne AH, Anhänger nur AH/Reserve), Auswahlliste und Sammel-Häkchen gleich
    api('POST','/api/login',{'username':'w.inhaber','password':PW})
    t=api('POST','/api/vehicles',{'vin':'WDB96340510399903','plate':'SZ-YC 9903','site':'Dortmund','kind':'anhaenger'})
    check(t['s']==201,'Anhänger angelegt')
    tid=(t['d'] or {}).get('id') or (t['d'] or {}).get('vehicle',{}).get('id') or 'VIN:WDB96340510399903'
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'w.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for vv,kind,pl in [(vid,'lkw','SZ-YC 9901'),(tid,'anhaenger','SZ-YC 9903')]:
          q.goto(B+'/#/vehicles/'+vv); q.wait_for_function("pl=>document.querySelector('#tf') && document.querySelector('main').innerText.includes(pl)",arg=pl)
          opts=q.eval_on_selector_all('#tf select[name=position] option','e=>e.map(o=>o.value)')
          boxes=q.eval_on_selector_all('#tfmore input[name=positions]','e=>e.map(o=>o.value)')
          if kind=='lkw': check('VA-L' in opts and 'Reserve' in opts and not any(o.startswith('AH') for o in opts),f'Lkw ohne AH-Positionen ({lang} {w})')
          else: check(opts==['AH1-L','AH1-R','AH2-L','AH2-R','AH3-L','AH3-R','Reserve'],f'Anhänger nur AH/Reserve ({lang} {w})')
          check(opts==boxes,'Sammel-Häkchen = Auswahlliste')
          if kind=='anhaenger':
            q.evaluate("()=>{let d=document.querySelector('#tf'); while(d){ if(d.tagName==='DETAILS') d.open=true; d=d.parentElement }}"); q.click('#tfmore summary')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
            if SHOTS: q.locator('#tfmore').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tfpos_ah_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+';'.join(errs)); c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
