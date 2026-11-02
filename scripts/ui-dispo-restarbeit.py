# [CLAUDE] UI-Test (02.11.2026, Backlog 877, Blickwinkel „Disposition plant den Lkw nach der Rückkehr aus der Werkstatt wieder ein“):
# zwei Aufträge technisch freigegeben, einer mit zwei offenen (nicht sicherheitsrelevanten) Restarbeiten. „Wieder einsatzbereit“ zeigt
# in dieser Zeile „2 offene Restarbeiten (nicht sicherheitsrelevant)“, in der anderen nichts. DE/UK/EN, 390/820/1366 px, ohne
# Querscrollen/Skriptfehler, Unterzeile nicht abgeschnitten. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# EN: „Back in service“ (heute/gestern) bzw. „Ready again (released since …)“ nach Wochenende/Feiertag (dispo_back_since)
TITLE={'de':('Wieder einsatzbereit',),'uk':('Знову готові до роботи',),'en':('Back in service','Ready again')}
ITEMS={'de':'2 offene Restarbeiten','uk':'2 відкриті залишкові роботи','en':'2 open items'}
NS={'de':'nicht sicherheitsrelevant','uk':'не критичні для безпеки','en':'not safety-relevant'}
PU={'de':'Abholung nach der Reparatur','uk':'Отримання після ремонту','en':'Pick-up after repair'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wr.inhaber','display_name':'WB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('wr.ws','workshop',workshop_site='DORTMUND')
    users=[]
    for lang in ['de','uk','en']: mkuser('wr.dispo.'+lang,'dispatch',lang); users.append((lang,'wr.dispo.'+lang))
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'wr.ws','password':PW}])
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
    def release(vin,desc,pickup=None,rest=()):
        cid=case(vin,desc)
        check(cmd(wapi,cid,'record_work',{'hours':1,'description':'erledigt'})['s']==200,'Arbeitszeit')
        for r in rest: check(cmd(wapi,cid,'add_open_item',{'description':r})['s']==200,'Restarbeit '+r)
        check(wapi('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':str(uuid.uuid4()),'items':items})['s']==201,'Kontrolle')
        check(cmd(wapi,cid,'request_quality_check',{'pickup_note':pickup} if pickup else {},'fertig')['s']==200,'Abschlusskontrolle')
        check(cmd(api,cid,'technical_release',{'confirm':True},'Kontrolle ok')['s']==200,'technische Freigabe '+desc)
    for i,pl in enumerate(['WR-AB 1','WR-AB 2']): api('POST','/api/vehicles',{'vin':f'WDB9634031L40009{i}','plate':pl,'site':'Dortmund'})
    release('WDB9634031L400090','Rückleuchte','Schlüssel beim Pförtner, Lkw auf Platz 4 (Halle 2)',('Standheizung ohne Funktion','Innenleuchte Fahrerseite'))
    release('WDB9634031L400091','Spiegel')
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dback',timeout=15000); q.wait_for_timeout(400)
        check(any(x in q.locator('#dback').inner_text() for x in TITLE[lang]),f'{lang} {wd}px: Abschnitt')
        rows=q.locator('[data-dback]')
        r1=rows.filter(has_text='WR-AB 1'); r2=rows.filter(has_text='WR-AB 2')
        check(rows.count()==2,f'{lang} {wd}px: beide Fahrzeuge ({rows.count()})')
        check(r1.locator('[data-dbitems]').count()==1 and ITEMS[lang] in r1.inner_text() and NS[lang] in r1.inner_text(),f'{lang} {wd}px: WR-AB 1 nennt 2 Restarbeiten')
        check(r2.locator('[data-dbitems]').count()==0,f'{lang} {wd}px: WR-AB 2 ohne Restarbeiten-Hinweis')
        check(r1.evaluate('e=>{const s=e.querySelector(".sub"); return s.scrollWidth<=s.clientWidth+1}'),f'{lang} {wd}px: Unterzeile nicht abgeschnitten')
        check(r1.locator('[data-dbitems]').evaluate('e=>e.getClientRects().length===1'),f'{lang} {wd}px: Anzahl nicht umbrochen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dbitems_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
