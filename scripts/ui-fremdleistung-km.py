# [CLAUDE] UI-Test (02.11.2026, Backlog 887): Fremdleistung mit „km-Stand laut Rechnung“ – Feld vorhanden, Hinweis „eine Stelle zu viel“,
# Warnung „kleiner als zuletzt erfasst“, Buchung trotzdem möglich, Verlauf nennt „nicht in die Fahrzeugakte übernommen“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['fk.inhaber','ba.inhaber','fb.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310788701'; api('POST','/api/vehicles',{'plate':'TF-FK 887','vin':'WDB96340310788701','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'fk-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel rechts abgebrochen','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'fk-{os.getpid()}'})
    CID=r['d']['id']; NO=r['d']['case_no']
    api('POST','/api/vehicles/'+vid+'/odometer',{'km':234567})
    check(cmd(CID,'approve_repair',{'workshop_site':site},'Spiegel tauschen')['s']==200 and cmd(CID,'start_repair')['s']==200,'in Reparatur')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('button[data-act="record_work"]', timeout=15000); T=q.evaluate(TR)
        q.locator('button[data-act="add_external_cost"]').first.click(); q.wait_for_selector('#extkmv', timeout=10000)
        check(T['ext_km_label'] in q.inner_text('#extkm'),f'{lang} {w}px: Feld km laut Rechnung')
        q.fill('#extkmv','2345678'); q.wait_for_timeout(100); check(q.locator('#extkmdigits').count()==1,f'{lang} {w}px: Hinweis eine Stelle zu viel')
        q.fill('#extkmv','1000'); q.wait_for_timeout(100); check(q.locator('#extkmlow').count()==1,f'{lang} {w}px: Warnung kleiner')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#af').screenshot(path=f'{SHOTS}/fremdkm887_form_{lang}_{w}.png')
        q.fill('#af input[name=supplier]','Truck-Service Nord'); q.fill('#af input[name=amount_net]','10')
        n0=q.locator('[data-ev-extkm="rejected"]').count()
        q.click('#af button.btn:not(.secondary)'); q.wait_for_function(f'()=>document.querySelectorAll(\'[data-ev-extkm="rejected"]\').length>{n0}', timeout=15000)
        tx=q.locator('[data-ev-extkm="rejected"]').first.inner_text()
        check('1' in tx and '234' in tx,f'{lang} {w}px: Verlauf nennt nicht übernommen ({tx[:70]!r})')
        if SHOTS and w==390: q.locator('[data-ev-extkm="rejected"]').first.screenshot(path=f'{SHOTS}/fremdkm887_ev_{lang}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
