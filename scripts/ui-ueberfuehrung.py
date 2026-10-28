# [CLAUDE] UI-Test (28.10.2026, Backlog 472/473, Blickwinkel „Überführungsfahrt zur Werkstatt“): Mangel „eingeschränkt fahrbereit“
# mit Werkstattauftrag (Termin morgen). „Mein Fahrzeug“ der zugeordneten Fahrer (DE/UK/EN) zeigt beim bekannten Mangel die Werkstatt und
# „laut Meldung eingeschränkt fahrbereit“, beim Termin die Werkstatt; die Disposition sieht den Hinweis auch bei Termin heute („Nicht
# einplanen“) und im Terminplan; Backlog 474: Link „eingeschränkt gemeldet, noch ohne Werkstattauftrag“ → gefilterte Liste; Backlog 476: Prüfmangel eines Anhängers ohne Vorgang nennt den gekoppelten Lkw. 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LIM={'de':'laut Meldung eingeschränkt fahrbereit','uk':'за заявкою обмежено на ходу','en':'reported as driveable with restrictions'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uf.inhaber','display_name':'UF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'uf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d'].get('id') or (u['d'].get('user') or {}).get('id')
    mkuser('uf.ws','workshop',workshop_site='DORTMUND')
    vin='WDB9634031L400221'; api('POST','/api/vehicles',{'vin':vin,'plate':'UF-AB 1','site':'Dortmund'})
    vin2='WDB9634031L400222'; api('POST','/api/vehicles',{'vin':vin2,'plate':'UF-AB 2','site':'Dortmund'})
    vin3='WDB9634031L400223'; api('POST','/api/vehicles',{'vin':vin3,'plate':'UF-AB 3','site':'Dortmund'})
    disp=[]
    for lang in ['de','uk','en']: mkuser('uf.dispo.'+lang,'dispatch',lang); disp.append((lang,'uf.dispo.'+lang))
    drivers=[]
    for lang in ['de','uk','en']:
        did=mkuser('uf.fahrer.'+lang,'driver',lang); drivers.append((lang,'uf.fahrer.'+lang))
        check(api('POST',f'/api/vehicles/VIN:{vin}/drivers',{'user_id':did,'evidence':'Dienstplan'})['s'] in (200,201),f'{lang}: Zuordnung')
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'uf.ws','password':PW}])
    wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    def cmd(f,cid,action,payload,note=None):
        v=f('GET',f'/api/cases/{cid}')['d']['case']['version']
        body={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
        if note: body['note']=note
        return f('POST',f'/api/cases/{cid}/commands',body)
    import datetime
    from zoneinfo import ZoneInfo
    today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date(); tomorrow=(today+datetime.timedelta(days=1)).isoformat(); today=today.isoformat()
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Kupplung rutscht – Überführung nach Dortmund','priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})['d']['id']
    check(cmd(api,c,'approve_repair',{'workshop_site':'DORTMUND','planned_date':tomorrow},'Überführung morgen')['s']==200,'Auftrag mit Termin morgen')
    c2=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin2,'description':'Getriebe schaltet hart','priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})['d']['id']
    check(cmd(api,c2,'approve_repair',{'workshop_site':'DORTMUND','planned_date':today},'Überführung heute')['s']==200,'Auftrag mit Termin heute')
    api('POST','/api/cases',{'vehicle_id':'VIN:'+vin3,'description':'Lenkung schwergängig','priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})
    # Backlog 476: Anhänger mit Prüfung „verkehrsunsicher“ ohne Vorgang → Tafel nennt den gekoppelten Lkw
    api('POST','/api/vehicles',{'vin':'WDB9634031L400224','plate':'UF-AH 4','site':'Dortmund','kind':'anhaenger'})
    api('POST','/api/vehicles',{'vin':'WDB9634031L400225','plate':'UF-AB 5','site':'Dortmund','trailer_plate':'UF-AH 4'})
    r=api('POST','/api/vehicles/VIN:WDB9634031L400224/maintenance',{'kind':'UVV','last_done_date':(datetime.date.fromisoformat(today)-datetime.timedelta(days=300)).isoformat(),'interval_months':12,'evidence':'UI-Test Überführung'})
    check(r['s'] in (200,201),'UVV Anhänger angelegt '+str(r['s']))
    check(api('POST',f"/api/maintenance/{r['d']['id']}/complete",{'done_date':(datetime.date.fromisoformat(today)-datetime.timedelta(days=1)).isoformat(),'evidence':'UI-Test Protokoll','result':'verkehrsunsicher'})['s']==200,'UVV verkehrsunsicher')
    for lang,un in drivers+disp:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload()
        if un.startswith('uf.fahrer'):
            q.wait_for_selector('[data-kdws]',timeout=15000)
            check(q.locator('[data-kdws]').count()==1,f'Fahrer {lang} {wd}px: Werkstatt beim bekannten Mangel')
            check(LIM[lang] in q.inner_text('[data-kddrv]'),f'Fahrer {lang} {wd}px: „eingeschränkt fahrbereit“')
            check(q.locator('[data-plannedws]').count()==1,f'Fahrer {lang} {wd}px: Werkstatt beim Termin')
            tag='fahrer'
        else:
            q.wait_for_selector('[data-dupclim]',timeout=15000)
            q.wait_for_timeout(800)
            n=q.locator('[data-dupclim]').count(); txts=[q.locator('[data-dupclim]').nth(i).inner_text() for i in range(n)]
            check(n>=2 and all(LIM[lang] in x for x in txts),f'Dispo {lang} {wd}px: Hinweis in „Nicht einplanen“/Plan ({n})')
            check(q.locator('[data-inspcoupled]').count()==1 and 'UF-AB 5' in q.inner_text('[data-inspcoupled]'),f'Dispo {lang} {wd}px: Prüfmangel des Anhängers nennt den Lkw')
            check(q.locator('#dlimited').count()==1 and '(1)' in q.inner_text('#dlimited'),f'Dispo {lang} {wd}px: Link „eingeschränkt gemeldet, ohne Auftrag (1)“')
            q.click('#dlimited'); q.wait_for_selector('.seg-tabs a.on[data-f="limited"]',timeout=15000); q.wait_for_timeout(500)
            check('UF-AB 3' in q.inner_text('#app') and 'UF-AB 1' not in q.inner_text('#app'),f'Dispo {lang} {wd}px: Liste zeigt nur die Meldung ohne Auftrag')
            if SHOTS: q.screenshot(path=f'{SHOTS}/ueberfuehrung_liste_{lang}_{wd}.png',full_page=True)
            q.goto(B+'/#/'); q.wait_for_selector('[data-dupclim]',timeout=15000)
            tag='dispo'
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ueberfuehrung_{tag}_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{tag} {lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
