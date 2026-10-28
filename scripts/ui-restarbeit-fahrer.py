# [CLAUDE] UI-Test (28.10.2026, Backlog 464, Blickwinkel „Fahrer holt den Lkw nach der Reparatur ab“): Auftrag mit nicht
# sicherheitsrelevanter Restarbeit wird technisch freigegeben. „Mein Fahrzeug“ der zugeordneten Fahrer (DE/UK/EN) zeigt
# „Noch offene Restarbeiten (Fahrzeug ist freigegeben)“ mit Beschreibung und Vorgangsnummer, ohne Link; 390/820/1366 px ohne
# Querscrollen/Skriptfehler. Backlog 465: Standort/Abschleppdienst eines offenen Vorgangs bei den bekannten Mängeln. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Noch offene Restarbeiten','uk':'Ще відкриті залишкові роботи','en':'Open items still pending'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ra.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d'].get('id') or (u['d'].get('user') or {}).get('id')
    mkuser('ra.ws','workshop',workshop_site='DORTMUND')
    vin='WDB9634031L400110'; api('POST','/api/vehicles',{'vin':vin,'plate':'RA-AB 1','site':'Dortmund'})
    drivers=[]
    for lang in ['de','uk','en']:
        did=mkuser('ra.fahrer.'+lang,'driver',lang); drivers.append((lang,'ra.fahrer.'+lang))
        check(api('POST',f'/api/vehicles/VIN:{vin}/drivers',{'user_id':did,'evidence':'Dienstplan'})['s'] in (200,201),f'{lang}: Zuordnung')
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'ra.ws','password':PW}])
    wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    def cmd(f,cid,action,payload,note=None):
        v=f('GET',f'/api/cases/{cid}')['d']['case']['version']
        body={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
        if note: body['note']=note
        return f('POST',f'/api/cases/{cid}/commands',body)
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Seitenverkleidung lose','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    cid=c['d']['id']; case_no=c['d'].get('case_no') or api('GET',f'/api/cases/{cid}')['d']['case']['case_no']
    check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'freigegeben')['s']==200,'Freigabe Werkstatt')
    check(cmd(wapi,cid,'start_repair',{})['s']==200,'Beginn')
    check(cmd(wapi,cid,'add_open_item',{'description':'Halter Seitenverkleidung provisorisch befestigt'})['s']==200,'Restarbeit')
    check(cmd(wapi,cid,'record_work',{'hours':1,'description':'Verkleidung'})['s']==200,'Arbeitszeit')
    check(wapi('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':str(uuid.uuid4()),'items':items})['s']==201,'Kontrolle')
    check(cmd(wapi,cid,'request_quality_check',{},'fertig')['s']==200,'Abschlusskontrolle')
    check(cmd(api,cid,'technical_release',{'confirm':True},'Kontrolle ok')['s']==200,'technische Freigabe')
    # Backlog 465: zweiter, offener Vorgang mit Standort/Abschleppdienst
    c2=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Motor ruckelt','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})['d']['id']
    check(cmd(api,c2,'approve_repair',{'workshop_site':'DORTMUND'},'freigegeben')['s']==200,'Freigabe Vorgang 2')
    check(cmd(api,c2,'set_vehicle_location',{'vehicle_location':'Fa. Achsprofi, Hof 2','tow_service':'Abschlepp Nord'})['s']==200,'Standort eingetragen')
    for lang,un in drivers:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-relitems]',timeout=15000)
        txt=q.inner_text('[data-relitems]')
        check(TITLE[lang] in txt and 'Halter Seitenverkleidung' in txt and case_no in txt,f'{lang} {wd}px: Restarbeit mit Nummer sichtbar')
        check(q.locator('[data-relitems] a').count()==0,f'{lang} {wd}px: ohne Link auf den Vorgang')
        loc=q.locator('[data-kdloc]')
        check(loc.count()==1 and 'Fa. Achsprofi' in loc.first.inner_text() and 'Abschlepp Nord' in loc.first.inner_text(),f'{lang} {wd}px: Standort/Abschleppdienst bei den bekannten Mängeln')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/restarbeit_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
