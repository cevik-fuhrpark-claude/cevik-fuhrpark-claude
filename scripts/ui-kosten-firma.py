# [CLAUDE] UI-Test (03.11.2026, Backlog 904, Blickwinkel „Inhaber bereitet das Jahresgespräch mit der Fremdwerkstatt/dem Lieferanten vor“):
# Kostenbericht → „Kosten je Firma“ aufklappen: Firmen mit Ist/Schätzung/unbewertet, Schreibweisen zusammengefasst, Teile ohne Lieferant zuletzt,
# Hinweis „ohne Beleg-Datei“; Lagerentnahme als „Lager <Werkstattname>“ (Backlog 1056); CSV-Knopf lädt eine Datei. DE 390 / UK 820 / EN 1366 px, keine Skriptfehler, kein waagerechtes Scrollen.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kf.inhaber','display_name':'KF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'kf.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['rb.inhaber','pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'kf-{action}-{R}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=api('POST',f'/api/cases/{cid}/commands',b)
        if r['s']!=200: print('   ',action,r)
        return r['s']
    # Testdaten (eigener Lkw, eigene Firmennamen mit Lauf-Kennung, damit andere Läufe nicht stören)
    vin=f'WKF{R:05d}0904000000'[:17]; pl=f'KF-{R%900} 904'
    check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Lkw angelegt')
    cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Seitenwand eingedrückt (UI 904)','priority':'mittel','driveability':'fahrbereit','request_key':f'kf-{R}'})['d']['id']
    F=f'Karosserie Kunz {R}'
    ok1=cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'UI 904')==200 and cmd(cid,'start_repair')==200
    ok1=ok1 and cmd(cid,'add_external_cost',{'supplier':F,'amount_net':1234.5,'invoice_no':f'RE-{R}-1'})==200
    ok1=ok1 and cmd(cid,'add_external_cost',{'supplier':' '+F.upper()+' ','amount_net':200,'valuation':'estimate','invoice_no':f'RE-{R}-2'})==200
    ok1=ok1 and cmd(cid,'add_part',{'name':'Schraube M8','quantity':4})==200
    check(ok1,'Fremdleistungen/Teile erfasst')
    # Backlog 1056: Lagerentnahme erscheint als „Lager Werkstatt Dortmund“ statt „Lager DORTMUND“
    si=api('POST','/api/stock',{'name':f'Filter 1056 {R}','site':'DORTMUND','unit_price_net':'9,90','initial_qty':2})
    check(si['s']==201 and cmd(cid,'add_part',{'stock_item_id':si['d']['id'],'quantity':1})==200,f'Lagerentnahme erfasst {si["s"]}')
    for lang,(w,h) in [('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]:
        n+=1
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=ctx.new_page(); errs=[]
        q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':(me.get('user') or me).get('username'),'password':PW}])
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { t: S.csu_title, none: S.csu_none, est: S.estimate }; }", lang)
        q.goto(B+'/#/costs'); q.reload(); q.wait_for_selector('#costsup',timeout=15000)
        check(not q.locator('#costsup').evaluate('e => e.open'),f'{lang}/{w}: „Kosten je Firma“ zunächst zugeklappt')
        check(T['t'] in q.locator('#costsup summary').inner_text(),f'{lang}/{w}: Überschrift')
        q.locator('#costsup summary').click()
        q.wait_for_selector('#costsupbody .list, #costsupbody .alert',timeout=15000)
        rows=q.locator('#costsupbody [data-csup]')
        mine=q.locator(f'#costsupbody [data-csup="{F}"]')
        check(mine.count()==1,f'{lang}/{w}: beide Schreibweisen in einer Zeile ({mine.count()})')
        if mine.count():
            tx=mine.inner_text()
            check(T['est'] in tx and '200' in tx,f'{lang}/{w}: Schätzung getrennt')
            check(mine.locator('[data-csupnofile]').count()==1,f'{lang}/{w}: Hinweis ohne Beleg-Datei')
        stk=q.locator('#costsupbody [data-csup="Lager DORTMUND"]')
        check(stk.count()==1 and 'Werkstatt Dortmund' in stk.inner_text() and 'DORTMUND' not in stk.inner_text(),f'{lang}/{w}: Lager mit Werkstattnamen ({stk.inner_text()[:60] if stk.count() else "–"})')
        last=rows.nth(rows.count()-1)
        check(last.get_attribute('data-csup')=='' and T['none'] in last.inner_text(),f'{lang}/{w}: Teile ohne Lieferant zuletzt')
        sw=q.evaluate('document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang}/{w}: kein waagerechtes Scrollen ({sw})')
        if SHOTS: mine.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kosten-firma-{lang}-{w}.png')
        with q.expect_download(timeout=15000) as dl: q.locator('#csvsup').click()
        check(dl.value.suggested_filename.startswith('fuhrpark-kosten-je-firma_'),f'{lang}/{w}: CSV {dl.value.suggested_filename}')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER:' if fails else 'OK', len(fails))
raise SystemExit(1 if fails else 0)
