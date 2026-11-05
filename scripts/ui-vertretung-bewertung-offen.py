# [CLAUDE] UI-Test (05.11.2026, Backlog 1041, Blickwinkel „Leitung vertritt die erkrankte Kollegin“): 10 Meldungen eines anderen Standorts (Bayern)
# mit bestätigtem Eingang, aber ohne Bewertung, stehen unter „Heute zu tun → Eingang bestätigt – Bewertung offen“ (älteste zuerst); „+2 · In der
# Vorgangsliste anzeigen“ zeigt alle 10, obwohl die Vertretung den Standard-Standort Dortmund hat (Standortfilter zurückgesetzt). Eine nicht
# bestätigte Meldung steht nur unter „Meldungen bestätigen“. DE 390 px, UK 820 px, EN 1366 px; kein Querscrollen, keine Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vb.inhaber','display_name':'VB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'vb.leitung','display_name':'VB Leitung','role':'fleet','environment':'production','home_site':'Dortmund'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    api('POST','/api/vehicles',{'plate':'VB-DO 1','vin':'WDB9634031V100001','site':'Dortmund'})
    api('POST','/api/vehicles',{'plate':'VB-BY 2','vin':'WDB9634031V100002','site':'Bayern'})
    def mk(vin,desc):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        return r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    def cmd(cid,action,payload={},note=None):
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    nos=[]
    for i in range(10):
        cid=mk('WDB9634031V100002',f'Bayern Meldung {i}')
        check(cmd(cid,'receive')['s']==200, f'Eingang {i} bestätigt')
        nos.append(api('GET',f'/api/cases/{cid}')['d']['case']['case_no'])
    un=mk('WDB9634031V100001','Dortmund unbestätigt'); unno=api('GET',f'/api/cases/{un}')['d']['case']['case_no']
    for lang,w in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':w,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vb.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('[data-todomore="todo_untriaged"]',timeout=20000,state='attached')
        det=q.locator('details:has([data-todomore="todo_untriaged"])'); det.locator('summary').click(); q.wait_for_timeout(300)
        check(det.locator('summary .chip').inner_text().strip()=='10', f'{lang} Zähler 10')
        rows=det.locator('.list a.row').all_inner_texts()
        check(nos[0] in rows[0] and len(rows)==8, f'{lang} älteste zuerst: {rows[0][:50]}')
        check(not any(unno in r for r in rows), f'{lang} unbestätigte Meldung nicht in dieser Gruppe')
        rec=q.locator('details:has(summary:has-text("' + {'de':'Meldungen bestätigen','uk':'Підтвердити повідомлення','en':'Confirm reports'}[lang] + '"))')
        check(rec.count()==1, f'{lang} Gruppe „Meldungen bestätigen“ vorhanden')
        if S: det.screenshot(path=f'{S}/bewertung-offen-{lang}-{w}.png')
        det.locator('[data-todomore] a').click(); q.wait_for_selector('#cl',timeout=15000); q.wait_for_timeout(800)
        n=q.locator('#cl .list a.row').count(); check(n==10, f'{lang} Liste {n} (Standortfilter zurückgesetzt)')
        check(q.locator('.seg-tabs a.on[data-f="received_open"]').count()==1, f'{lang} Reiter „Bewertung offen“ aktiv')
        if S: q.screenshot(path=f'{S}/bewertung-offen-liste-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth')<=w, f'{lang} ohne Querscrollen'); check(not errs, f'{lang} keine Fehler {errs}')
        ctx.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'ok: alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
