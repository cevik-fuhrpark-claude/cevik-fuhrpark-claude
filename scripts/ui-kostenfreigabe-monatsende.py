# [CLAUDE] UI-Test (05.11.2026, Backlog 1042, Blickwinkel „Inhaber prüft am Monatsende offene Kostenfreigaben aller Standorte“): drei Aufträge
# an einem Bayern-Fahrzeug überschreiten die Freigabegrenze. Die Leitung (Standard-Standort Dortmund) findet unter „Heute zu tun →
# Kostenfreigabe ausstehend“ auch bei weniger als 9 Einträgen „In der Vorgangsliste anzeigen“; die Liste zeigt alle drei (alle Standorte),
# ohne Sortierauswahl, am längsten wartende zuerst, mit „seit <Datum>“ am Chip. Der Bericht „Kennzahlen“ verlinkt im Abschnitt
# „Kostenfreigaben“ dieselbe Liste. DE 390 px, UK 820 px, EN 1366 px; kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kf.inhaber','display_name':'KF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def invite(b):
        u=api('POST','/api/users',b); c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
        q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    invite({'username':'kf.leitung','display_name':'KF Leitung','role':'fleet','environment':'production','home_site':'Dortmund'})
    invite({'username':'kf.werkstatt','display_name':'KF Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    ctxw=br.new_context(); w=ctxw.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'kf.werkstatt','password':PW}])
    wapi=lambda m,pa,b=None:w.evaluate(JS,[m,pa,b])
    api('POST','/api/vehicles',{'plate':'KF-DO 1','vin':'WDB9634031K100001','site':'Dortmund'})
    api('POST','/api/vehicles',{'plate':'KF-BY 2','vin':'WDB9634031K100002','site':'Bayern'})
    check(api('PUT','/api/settings',{'repair_cost_limit_net':100})['s']==200,'Freigabegrenze 100 €')
    def cmd(f,cid,action,payload={},note=None):
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return f('POST',f'/api/cases/{cid}/commands',b)
    nos=[]
    for i in range(3):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031K100002','description':f'Kostenfreigabe {i}','priority':['niedrig','mittel','kritisch'][i],'driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        cid=r['d']['cases'][0]['id'] if 'cases' in r['d'] else r['d']['id']
        check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Reparatur')['s']==200, f'Auftrag {i} freigegeben')
        check(cmd(wapi,cid,'start_repair')['s']==200, f'Auftrag {i} begonnen')
        r=cmd(wapi,cid,'add_part',{'name':'Bremsscheibe','quantity':1,'unit_price_net':250})
        check(r['s']==200 and r['d'].get('cost_limit_exceeded'), f'Auftrag {i} über der Grenze')
        nos.append(api('GET',f'/api/cases/{cid}')['d']['case']['case_no'])
        w.wait_for_timeout(1100)
    ctxw.close()
    for lang,wd in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':wd,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kf.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('#todocalist',timeout=20000,state='attached')
        det=q.locator('details:has(#todocalist)'); det.locator('summary').click(); q.wait_for_timeout(300)
        check(det.locator('summary .chip').inner_text().strip()=='3', f'{lang} Zähler 3')
        rows=det.locator('.list a.row').all_inner_texts()
        check(len(rows)==3 and nos[0] in rows[0], f'{lang} Startseite: am längsten wartende zuerst')
        if S: det.screenshot(path=f'{S}/kostenfreigabe-heute-{lang}-{wd}.png')
        q.locator('#todocalist').click(); q.wait_for_selector('#casort',timeout=15000); q.wait_for_timeout(800)
        rows=q.locator('#cl .list a.row').all_inner_texts()
        check(len(rows)==3, f'{lang} Liste {len(rows)} (alle Standorte)')
        check(len(rows)==3 and all(nos[i] in rows[i] for i in range(3)), f'{lang} Liste nach Wartezeit (nicht nach Dringlichkeit)')
        check(q.locator('#csort').count()==0, f'{lang} keine Sortierauswahl')
        check(q.locator('[data-casince]').count()==3, f'{lang} Chip mit „seit“')
        if S: q.screenshot(path=f'{S}/kostenfreigabe-liste-{lang}-{wd}.png')
        check(q.evaluate('document.documentElement.scrollWidth')<=wd, f'{lang} Liste ohne Querscrollen')
        q.goto(B+'/#/kpi'); q.wait_for_selector('#kpicalist',timeout=20000)
        if S: q.locator('#kpica').screenshot(path=f'{S}/kostenfreigabe-bericht-{lang}-{wd}.png')
        q.locator('#kpicalist').click(); q.wait_for_selector('#casort',timeout=15000); q.wait_for_timeout(800)
        check(q.locator('#cl .list a.row').count()==3, f'{lang} Bericht → Liste mit allen drei')
        check(q.evaluate('document.documentElement.scrollWidth')<=wd, f'{lang} ohne Querscrollen'); check(not errs, f'{lang} keine Fehler {errs}')
        ctx.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'ok: alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
