# [CLAUDE] UI-Test (19.11.2026, Backlog 1614/1615, Blickwinkel „Werkstatt erhält einen Auftrag für ein Fahrzeug, das gerade auf Tour im Ausland ist“):
# Übernommener Auftrag, Leitung trägt den Standort „unterwegs Polen“ ein, Werkstatt legt den Termin in 6 Tagen. Die Werkstatt-Startseite
# nennt den Standort in der Vorgangszeile (data-vloc), das Formular „Arbeit beginnen“ nennt Standort und Termin (data-srloc).
# DE 390 px, UK 820 px, EN 1366 px; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wa.inhaber','display_name':'WA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'wa.werkstatt','display_name':'WA Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    ctxw=br.new_context(); w=ctxw.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'wa.werkstatt','password':PW}])
    wapi=lambda m,pa,b=None:w.evaluate(JS,[m,pa,b])
    vin='WDB9634031K300001'; api('POST','/api/vehicles',{'plate':'WA-DO 1','vin':vin,'site':'Dortmund'})
    def cmd(f,cid,action,payload={},note=None):
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return f('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rücklicht links ohne Funktion, Fahrer unterwegs','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if 'cases' in r['d'] else r['d']['id']
    check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'bei Rückkehr')['s']==200,'freigegeben')
    check(cmd(wapi,cid,'acknowledge')['s']==200,'übernommen')
    check(cmd(api,cid,'set_vehicle_location',{'vehicle_location':'unterwegs Polen (Poznań), zurück laut Dispo nächste Woche'})['s']==200,'Standort')
    pd=(datetime.date.today()+datetime.timedelta(days=6)).isoformat()
    r=cmd(wapi,cid,'set_planned_date',{'planned_date':pd}); check(r['s']==200,f'Termin {r["s"]} {r["d"]}')
    for lang,wd in [('de',390),('uk',820),('en',1366)]:
        ctx=br.new_context(viewport={'width':wd,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wa.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('.row [data-vloc]',timeout=15000)
        check('Pozna' in q.locator('.row [data-vloc]').first.inner_text(), f'{lang} Startseite nennt den Standort')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen (Startseite)')
        if S: q.locator('.row [data-vloc]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{S}/ausland-start-{lang}-{wd}.png') if S else None
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('button[data-act="start_repair"]',timeout=15000)
        q.click('button[data-act="start_repair"]'); q.wait_for_selector('[data-srloc]',timeout=10000)
        tx=q.locator('[data-srloc]').inner_text()
        check('Pozna' in tx and pd.split('-')[2] in tx, f'{lang} Formular nennt Standort und Termin: {tx[:80]}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} kein Querscrollen (Formular)')
        if S: q.locator('#af').screenshot(path=f'{S}/ausland-beginnen-{lang}-{wd}.png')
        check(not errs, f'{lang} keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
