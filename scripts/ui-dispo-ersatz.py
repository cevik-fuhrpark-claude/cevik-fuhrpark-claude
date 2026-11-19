# [CLAUDE] UI-Test (19.11.2026, Backlog 1608/1609, Blickwinkel „Disposition sucht morgens ein Ersatzfahrzeug“): vier Fahrzeuge gestern/heute
# technisch freigegeben; danach EA-1 neue Meldung „eingeschränkt fahrbereit“ (ohne Sperre), EA-2 außer Betrieb genommen, EA-3 ruhend gesetzt,
# EA-4 ohne Änderung. „Wieder einsatzbereit“ zeigt EA-1 mit „Meldung offen: <Nr.> – laut Meldung eingeschränkt fahrbereit“, EA-3 mit Chip
# „ruhend“, EA-4 ohne Zusatz, EA-2 gar nicht. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ea.inhaber','display_name':'EA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ea.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('ea.ws','workshop',workshop_site='DORTMUND')
    users=[]
    for lang in ['de','uk','en']: mkuser('ea.dispo.'+lang,'dispatch',lang); users.append((lang,'ea.dispo.'+lang))
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'ea.ws','password':PW}])
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
    from_i18n={}
    for i,pl in enumerate(['EA-AB 1','EA-AB 2','EA-AB 3','EA-AB 4']): api('POST','/api/vehicles',{'vin':f'WDB9634031L50008{i}','plate':pl,'site':'Dortmund'})
    for i in range(4): release(f'WDB9634031L50008{i}',f'Spiegel {i}')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031L500080','description':'Klimaanlage kühlt nicht','priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})
    check(r['s']==201,'neue Meldung EA-AB 1'); newno=r['d'].get('case_no') or api('GET','/api/cases/'+r['d']['id'])['d']['case']['case_no']
    check(api('POST','/api/vehicles/VIN:WDB9634031L500081/active',{'active':False,'reason':'Totalschaden'})['s']==200,'EA-AB 2 außer Betrieb')
    check(api('POST','/api/vehicles/VIN:WDB9634031L500082/evaluation',{'excluded':True,'reason':'Verkauf geplant'})['s']==200,'EA-AB 3 ruhend')
    MO={'de':'Meldung offen','uk':'Є відкрита заявка','en':'Open report'}
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dback',timeout=15000); q.wait_for_timeout(400)
        rows=q.locator('[data-dback]'); txt=[rows.nth(i).inner_text() for i in range(rows.count())]
        get=lambda pl: next((x for x in txt if pl in x),None)
        check(len(txt)==3 and get('EA-AB 2') is None,f'{lang} {wd}px: außer Betrieb fehlt ({len(txt)})')
        r1=get('EA-AB 1'); check(r1 and MO[lang] in r1 and newno in r1,f'{lang} {wd}px: EA-AB 1 Meldung offen {newno}')
        check(q.locator('[data-dback]:has-text("EA-AB 3") [data-dormant]').count()==1,f'{lang} {wd}px: EA-AB 3 ruhend')
        r4=get('EA-AB 4'); check(r4 and MO[lang] not in r4 and q.locator('[data-dback]:has-text("EA-AB 4") [data-dormant]').count()==0,f'{lang} {wd}px: EA-AB 4 ohne Zusatz')
        check(rows.first.evaluate('e=>{const s=e.querySelector(".sub"); return s.scrollWidth<=s.clientWidth+1}'),f'{lang} {wd}px: Unterzeile nicht abgeschnitten')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('#dback').evaluate('e=>e.scrollIntoView()'); q.screenshot(path=f'{SHOTS}/dersatz_{lang}_{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
