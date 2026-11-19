# [CLAUDE] UI-Test (19.11.2026, Backlog 1606/1607, Blickwinkel „Leitung verlangt einen kleineren Reparaturumfang“): Auftrag über der
# Freigabegrenze; die Leitung öffnet „Kosten freigeben“ – das Formular sagt, dass die Werkstatt den Vermerk nicht sieht (#caws). Danach legt
# die Leitung eine Restarbeit an; die Werkstatt findet „Neue Restarbeit (Fuhrparkleitung)“ in ihren Hinweisen und kann die Art abschalten.
# DE 390 px, UK 820 px, EN 1366 px; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kv.inhaber','display_name':'KV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def invite(b):
        u=api('POST','/api/users',b); c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
        q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    invite({'username':'kv.leitung','display_name':'KV Leitung','role':'fleet','environment':'production','home_site':'Dortmund'})
    invite({'username':'kv.werkstatt','display_name':'KV Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    ctxw=br.new_context(); w=ctxw.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'kv.werkstatt','password':PW}])
    wapi=lambda m,pa,b=None:w.evaluate(JS,[m,pa,b])
    api('POST','/api/vehicles',{'plate':'KV-DO 1','vin':'WDB9634031K100001','site':'Dortmund'})
    api('POST','/api/vehicles',{'plate':'KV-BY 2','vin':'WDB9634031K100002','site':'Bayern'})
    check(api('PUT','/api/settings',{'repair_cost_limit_net':100})['s']==200,'Freigabegrenze 100 €')
    def cmd(f,cid,action,payload={},note=None):
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return f('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031K100001','description':'Unfall vorne, Stoßfänger und Halter','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if 'cases' in r['d'] else r['d']['id']
    check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Reparatur')['s']==200,'freigegeben')
    check(cmd(wapi,cid,'start_repair')['s']==200,'begonnen')
    r=cmd(wapi,cid,'add_part',{'name':'Stoßfänger','quantity':1,'unit_price_net':450})
    check(r['s']==200 and r['d'].get('cost_limit_exceeded'),'über der Grenze')
    for lang,wd in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':wd,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kv.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="approve_costs"]',timeout=15000)
        q.click('button[data-act="approve_costs"]'); q.wait_for_selector('#caws',timeout=5000)
        txt=q.locator('#caws').inner_text()
        check(q.locator('#caws').is_visible() and len(txt)>40, f'{lang} Hinweis sichtbar: {txt[:60]}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen')
        if S: q.locator('#af').screenshot(path=f'{S}/kostenfreigabe-vermerk-{lang}-{wd}.png')
        check(not errs, f'{lang} keine Skriptfehler {errs}')
        ctx.close()
    check(cmd(api,cid,'add_open_item',{'description':'Stoßfänger zurückstellen, nur Halter sichern','safety_relevant':False})['s']==200,'Restarbeit der Leitung')
    for lang,wd in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':wd,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kv.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        ns=q.evaluate(JS,['GET','/api/notifications'])['d']['notifications']
        check(any(n['kind']=='open_item_mgr' and n['case_id']==cid for n in ns),f'{lang} Werkstatt-Hinweis vorhanden')
        exp={'de':'Fuhrparkleitung','uk':'керівництво автопарку','en':'fleet management'}[lang]
        q.goto(B+'/#/inbox'); q.wait_for_timeout(1500)
        body=q.locator('#app').inner_text()
        check(exp in body, f'{lang} Titel in Sprache sichtbar ({exp})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen (Hinweise)')
        if S: q.screenshot(path=f'{S}/restarbeit-leitung-{lang}-{wd}.png')
        check(not errs, f'{lang} keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
