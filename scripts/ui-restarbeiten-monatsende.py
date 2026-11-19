# [CLAUDE] UI-Test (19.11.2026, Backlog 1610–1612, Blickwinkel „Leitung prüft am Monatsende offene Restarbeiten freigegebener Fahrzeuge“):
# Zwei freigegebene Aufträge mit offener Restarbeit, eines der Fahrzeuge außer Betrieb genommen. Die Leitung öffnet den Filter
# „Freigegeben, Restarbeiten offen“: feste Sortierung nach Freigabe (#casort statt Auswahl), Freigabedatum je Zeile (data-oirel),
# Marke „außer Betrieb“ (data-vinact); die Fahrzeugakte nennt „Restarbeiten: 1“ (data-oi). DE 390 px, UK 820 px, EN 1366 px;
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL', 'http://localhost:8787'); PW='Sicheres-Passwort-2026'; S=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('✔ ' if c else '✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None:a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rm.inhaber','display_name':'RM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def invite(b):
        u=api('POST','/api/users',b); c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
        q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    invite({'username':'rm.leitung','display_name':'RM Leitung','role':'fleet','environment':'production','home_site':'Dortmund'})
    invite({'username':'rm.werkstatt','display_name':'RM Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    ctxw=br.new_context(); w=ctxw.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'rm.werkstatt','password':PW}])
    wapi=lambda m,pa,b=None:w.evaluate(JS,[m,pa,b])
    vins=['WDB9634031K200001','WDB9634031K200002']
    for i,v in enumerate(vins): api('POST','/api/vehicles',{'plate':f'RM-DO {i+1}','vin':v,'site':'Dortmund'})
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    def cmd(f,cid,action,payload={},note=None):
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return f('POST',f'/api/cases/{cid}/commands',b)
    for v in vins:
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+v,'description':'Seitenverkleidung lose, Halter gebrochen','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        cid=r['d']['cases'][0]['id'] if 'cases' in r['d'] else r['d']['id']
        check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Reparatur')['s']==200,'freigegeben')
        check(cmd(wapi,cid,'start_repair')['s']==200,'begonnen')
        check(cmd(wapi,cid,'add_open_item',{'description':'Verkleidung provisorisch befestigt'})['s']==200,'Restarbeit')
        check(cmd(wapi,cid,'record_work',{'hours':1,'description':'Halter'})['s']==200,'Arbeitszeit')
        check(wapi('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':str(uuid.uuid4()),'items':items})['s']==201,'Kontrolle')
        check(cmd(wapi,cid,'request_quality_check',{},'fertig')['s']==200,'zur Abschlusskontrolle')
        r=cmd(api,cid,'technical_release',{'confirm':True},'Kontrolle ok'); check(r['s']==200,f'Freigabe {r["s"]}')
    r=api('POST',f'/api/vehicles/VIN:{vins[1]}/active',{'active':False,'reason':'Verkauf'}); check(r['s']==200,f'außer Betrieb {r["s"]}')
    for lang,wd in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':wd,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rm.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases?f=open_items'); q.wait_for_selector('[data-oirel]',timeout=15000)
        check(q.locator('[data-oirel]').count()==2, f'{lang} Freigabedatum in beiden Zeilen')
        check(q.locator('[data-vinact]').count()==1, f'{lang} eine Marke „außer Betrieb“')
        check(q.locator('#casort').is_visible() and q.locator('#csort').count()==0, f'{lang} feste Sortierung: {q.locator("#casort").inner_text()}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen (Liste)')
        if S: q.screenshot(path=f'{S}/restarbeiten-monatsende-{lang}-{wd}.png', full_page=True)
        q.goto(B+'/#/vehicles/VIN%3A'+vins[0]); q.wait_for_selector('[data-oi]',timeout=15000)
        check(q.locator('[data-oi]').count()>=1, f'{lang} Akte nennt Restarbeiten')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen (Akte)')
        if S: q.screenshot(full_page=True, path=f'{S}/restarbeiten-akte-{lang}-{wd}.png')
        check(not errs, f'{lang} keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
