# [CLAUDE] UI-Test (24.10.2026, Backlog 239 „Heute zu tun“ nach dem Urlaub): 11 ausstehende Kostenfreigaben – die älteste steht oben,
# „+3 · In der Vorgangsliste anzeigen“ führt zur gefilterten Liste (11 Zeilen). DE 390 px, UK 820 px, EN 1366 px; kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, sys, uuid
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'td.inhaber','display_name':'TD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'td.inhaber','password':PW})
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    check(api('PUT','/api/settings',{'repair_cost_limit_net':'100'})['s']==200, 'Kostengrenze gesetzt')
    api('POST','/api/vehicles',{'plate':'TD-KF 1','vin':'WDB96340310824001','site':'Dortmund'})
    nos=[]
    for i in range(11):
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310824001','description':f'Kosten {i}','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']
        nos.append(v['case_no'])
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v['version'],'note':'Reparatur freigegeben','payload':{'workshop_site':site}})
        check(r['s']==200, f'Freigabe {i}')
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'add_external_cost','command_id':str(uuid.uuid4()),'expected_version':api('GET',f'/api/cases/{cid}')['d']['case']['version'],'payload':{'supplier':'X','amount_net':600}})
        check(r['s']==200, f'Fremdleistung {i} gebucht')
    for lang,w in [('de',390),('uk',820),('en',1366)]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':900},storage_state=a.context.storage_state()); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B+'/#/'); q.wait_for_selector('[data-todomore="todo_cost_approval"]',timeout=20000,state='attached')
        det=q.locator('details:has([data-todomore="todo_cost_approval"])'); det.locator('summary').click(); q.wait_for_timeout(300)
        first=det.locator('.list a.row').first.inner_text()
        check(nos[0] in first, f'{lang} älteste zuerst: {first[:40]}')
        if S: det.screenshot(path=f'{S}/todo-{lang}-{w}.png')
        det.locator('[data-todomore] a').click(); q.wait_for_selector('#cl',timeout=15000); q.wait_for_timeout(800)
        n=q.locator('#cl .list a.row').count(); check(n==11, f'{lang} Liste {n}')
        check(q.evaluate('document.documentElement.scrollWidth')<=w, f'{lang} ohne Querscrollen'); check(not errs, f'{lang} keine Fehler {errs}')
        ctx.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'ok: alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
