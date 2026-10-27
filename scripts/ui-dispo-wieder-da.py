# [CLAUDE] UI-Test (27.10.2026, Backlog 458, Blickwinkel „Disposition fragt am Nachmittag: welcher Lkw ist morgen früh wieder da?“):
# zwei Aufträge technisch freigegeben (einer mit Abholvermerk), am zweiten Fahrzeug danach ein neuer Werkstattauftrag. Startseite der
# Disposition zeigt „Wieder einsatzbereit (heute/gestern freigegeben)“ nur mit dem freien Fahrzeug, Freigabezeit und „Abholung nach der
# Reparatur“; das blockierte Fahrzeug steht weiter unter „Nicht einplanen“. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Wieder einsatzbereit','uk':'Знову готові до роботи','en':'Back in service'}
PU={'de':'Abholung nach der Reparatur','uk':'Отримання після ремонту','en':'Pick-up after repair'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wb.inhaber','display_name':'WB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('wb.ws','workshop',workshop_site='DORTMUND')
    users=[]
    for lang in ['de','uk','en']: mkuser('wb.dispo.'+lang,'dispatch',lang); users.append((lang,'wb.dispo.'+lang))
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'wb.ws','password':PW}])
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
    for i,pl in enumerate(['WB-AB 1','WB-AB 2']): api('POST','/api/vehicles',{'vin':f'WDB9634031L40008{i}','plate':pl,'site':'Dortmund'})
    release('WDB9634031L400080','Rückleuchte','Schlüssel beim Pförtner, Lkw auf Platz 4 (Halle 2)')
    release('WDB9634031L400081','Spiegel'); case('WDB9634031L400081','Bremse quietscht')
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dback',timeout=15000); q.wait_for_timeout(400)
        check(TITLE[lang] in q.locator('#dback').inner_text(),f'{lang} {wd}px: Abschnitt')
        rows=q.locator('[data-dback]')
        check(rows.count()==1 and 'WB-AB 1' in rows.first.inner_text(),f'{lang} {wd}px: nur WB-AB 1 ({rows.count()})')
        check(PU[lang] in rows.first.inner_text() and 'Pförtner' in rows.first.inner_text(),f'{lang} {wd}px: Abholvermerk sichtbar')
        check(rows.first.evaluate('e=>{const s=e.querySelector(".sub"); return s.scrollWidth<=s.clientWidth+1}'),f'{lang} {wd}px: Unterzeile nicht abgeschnitten')
        check(q.locator('.list a.row').filter(has_text='WB-AB 2').count()>=1,f'{lang} {wd}px: WB-AB 2 weiter unter „Nicht einplanen“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dback_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
