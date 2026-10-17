# [CLAUDE] UI-Test (17.10.2026): Postausgang – Netz bricht beim Foto-Upload ab: Meldung angelegt, Foto bleibt auf dem Gerät und wird
# beim nächsten Senden nachgereicht (vorher verloren). Lesezugriff/Disposition sehen in der Fahrzeugakte keine Formulare, die der Server
# ablehnt (km erfassen, Reifen erfassen). Kontroll-Vermerk im Vorgangsverlauf in der Oberflächensprache. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, base64
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fjcWfAAAAAElFTkSuQmCC')
EV={'de':'Mängel festgestellt','uk':'Виявлено','en':'defect found'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pf.inhaber','display_name':'PF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid='VIN:WDB96340310776001'; api('POST','/api/vehicles',{'plate':'PF-AB 1','vin':'WDB96340310776001','site':'Dortmund'})
    acc={}
    for role in ['driver','viewer','dispatch']:
        u=api('POST','/api/users',{'username':f'pf.{role}','display_name':f'PF {role}','role':role,'environment':'production'})
        if role=='driver': api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':u['d']['id']})
        c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c.close()
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,w)
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pf.driver','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        qa=lambda m,pa,b=None: q.evaluate(JS,[m,pa,b])
        # 1. Meldung mit Foto offline; wieder online, Foto-Upload bricht ab → Foto bleibt; nächstes Senden reicht es nach
        q.goto(B+'/#/new'); q.wait_for_selector('#d',timeout=15000)
        q.locator(f'input[name=veh][value="{vid}"]').check(force=True); q.fill('#d',f'PF Spiegel {lang} {w} {n}')
        q.set_input_files('#ph',{'name':'f.png','mimeType':'image/png','buffer':PNG})
        q.route('**/api/**',lambda r: r.abort()); q.click('#sb'); q.wait_for_selector('.panel.alert',timeout=15000); q.unroute('**/api/**')
        q.route('**/api/cases/*/files',lambda r: r.abort())
        q.evaluate("window.dispatchEvent(new Event('online'))"); q.wait_for_timeout(2500)
        mine=[c for c in qa('GET','/api/cases?status=all')['d']['cases'] if c['description']==f'PF Spiegel {lang} {w} {n}']
        check(len(mine)==1,'Meldung einmal angelegt')
        ob=q.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('cfp_outbox_')).map(k => JSON.parse(localStorage.getItem(k))).flat()")
        check(len(ob)==1 and ob[0].get('photo_target')==(mine[0]['id'] if mine else None),'Eintrag wartet nur noch auf das Foto')
        q.unroute('**/api/cases/*/files')
        q.evaluate("window.dispatchEvent(new Event('online'))"); q.wait_for_timeout(2500)
        files=qa('GET',f"/api/cases/{mine[0]['id']}")['d'].get('files',[]) if mine else []
        check(len(files)==1,'Foto nachgereicht: '+str(len(files)))
        ob=q.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('cfp_outbox_')).map(k => JSON.parse(localStorage.getItem(k))).flat()")
        check(ob==[],'Postausgang leer')
        if SHOTS: q.screenshot(path=f'{SHOTS}/postausgang_foto_{lang}_{w}.png')
        # 2. Kontroll-Vermerk im Verlauf übersetzt (Kontrolle mit Mangel → Folgeauftrag, Verlauf des Fahrers)
        items=[{'key':i['key'],'result':'mangel' if k==0 else 'ok','note':'Spiegel locker' if k==0 else None} for k,i in enumerate(qa('GET','/api/meta')['d']['checklist'])]
        r=qa('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':vid,'request_key':f'pf-{os.getpid()}-{n}','items':items})
        check(r['s']==201,'Kontrolle gespeichert')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
        # 3. Lesezugriff/Disposition: keine km-/Reifenformulare, die der Server ablehnt
        for role in ['viewer','dispatch']:
            c2=br.new_context(viewport={'width':w,'height':h}); r2=c2.new_page(); e2=[]; r2.on('pageerror',lambda e: e2.append(str(e)))
            r2.goto(B); r2.evaluate(JS,['POST','/api/login',{'username':f'pf.{role}','password':PW}]); r2.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            r2.goto(B+f'/#/vehicles/{vid}'); r2.wait_for_timeout(1800)
            if role=='viewer': check(r2.locator('#kf').count()==0,'Lesezugriff: kein km-Formular')
            else: check(r2.locator('#kf').count()==1,'Disposition: km-Formular (erlaubt)')
            check(r2.locator('#tires section').count()>0,f'{role}: Reifen geladen')
            check(r2.locator('#tf').count()==0,f'{role}: kein Reifenformular')
            check(not e2,f'{role}: keine JS-Fehler '+str(e2[:2]))
            c2.close()
    # Verlauf des Folgeauftrags in den drei Sprachen (Vermerk „1 Mangel festgestellt“ übersetzt)
    c3=br.new_context(viewport={'width':390,'height':844}); r3=c3.new_page(); r3.goto(B); r3.evaluate(JS,['POST','/api/login',{'username':'pf.inhaber','password':PW}])
    insp=[c for c in r3.evaluate(JS,['GET','/api/cases?status=all',None])['d']['cases'] if c.get('origin')=='kontrolle']
    check(len(insp)>=1,'Folgeauftrag aus Kontrolle vorhanden')
    for lang in ['de','uk','en']:
        r3.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        r3.goto(B+f"/#/cases/{insp[0]['id']}"); r3.reload(); r3.wait_for_timeout(1500)
        body=r3.inner_text('body')
        check('Erneut festgestellt (Abfahrtskontrolle)' not in body,'kein deutscher Vorsatz ('+lang+')')
        check(lang=='de' or 'Erneut festgestellt' not in body,'Verlauf in der Oberflächensprache ('+lang+')')
        if SHOTS: r3.screenshot(path=f'{SHOTS}/verlauf_{lang}.png',full_page=True)
    c3.close()
    br.close()
print('Postausgang-Foto/Rechte/Verlauf: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
