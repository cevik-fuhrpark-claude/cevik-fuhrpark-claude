# [CLAUDE] UI-Test (06.11.2026, Backlog 1098, Blickwinkel „Disposition druckt die Startseite für die Spätschicht“): Im Ausdruck der
# Startseite (Disposition) erscheinen keine Navigationslinks („Alle“); Abschnitte „Nicht einplanen“, „Wieder einsatzbereit“ und „Offen“
# bleiben mit Kennzeichen sichtbar. DE/UK/EN, 390/1366 px, Druckansicht ohne Querscrollen/Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# EN: „Back in service“ (heute/gestern) bzw. „Ready again (released since …)“ nach Wochenende/Feiertag (dispo_back_since)
TITLE={'de':('Wieder einsatzbereit',),'uk':('Знову готові до роботи',),'en':('Back in service','Ready again')}
PU={'de':'Abholung nach der Reparatur','uk':'Отримання після ремонту','en':'Pick-up after repair'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dn.inhaber','display_name':'WB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('dn.ws','workshop',workshop_site='DORTMUND')
    users=[]
    for lang in ['de','uk','en']: mkuser('dn.dispo.'+lang,'dispatch',lang); users.append((lang,'dn.dispo.'+lang))
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'dn.ws','password':PW}])
    wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    def cmd(f,cid,action,payload,note=None):
        v=f('GET',f'/api/cases/{cid}')['d']['case']['version']
        body={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
        if note: body['note']=note
        return f('POST',f'/api/cases/{cid}/commands',body)
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    def case(vin,desc):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'freigegeben')['s']==200,'Freigabe '+desc)
        check(cmd(wapi,cid,'start_repair',{})['s']==200,'Beginn '+desc); return cid
    def release(vin,desc,pickup=None):
        cid=case(vin,desc)
        check(cmd(wapi,cid,'record_work',{'hours':1,'description':'erledigt'})['s']==200,'Arbeitszeit')
        check(wapi('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':str(uuid.uuid4()),'items':items})['s']==201,'Kontrolle')
        check(cmd(wapi,cid,'request_quality_check',{'pickup_note':pickup} if pickup else {},'fertig')['s']==200,'Abschlusskontrolle')
        check(cmd(api,cid,'technical_release',{'confirm':True},'Kontrolle ok')['s']==200,'technische Freigabe '+desc)
    for i,pl in enumerate(['DN-AB 1','DN-AB 2']): api('POST','/api/vehicles',{'vin':f'WDB9634031L40009{i}','plate':pl,'site':'Dortmund'})
    release('WDB9634031L400090','Rückleuchte','Schlüssel beim Pförtner, Lkw auf Platz 4 (Halle 2)')
    release('WDB9634031L400091','Spiegel'); case('WDB9634031L400091','Bremse quietscht')
    for lang,un in users:
      for wd,h in [(390,844),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dback',timeout=15000); q.wait_for_timeout(400)
        ALL=q.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].all", lang)
        check(q.locator('p.navlinks a').filter(has_text=ALL).first.is_visible(),f'{lang} {wd}px: „{ALL}“ am Bildschirm sichtbar')
        q.emulate_media(media='print')
        check(not q.locator('p.navlinks a').filter(has_text=ALL).first.is_visible(),f'{lang} {wd}px: „{ALL}“ nicht im Ausdruck')
        check(q.locator('[data-dback]').first.is_visible() and 'DN-AB 1' in q.locator('[data-dback]').first.inner_text(),f'{lang} {wd}px: „Wieder einsatzbereit“ im Ausdruck')
        check(q.locator('.list a.row').filter(has_text='DN-AB 2').first.is_visible(),f'{lang} {wd}px: DN-AB 2 im Ausdruck')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Druck ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dnav_druck_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
