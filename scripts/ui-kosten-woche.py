# [CLAUDE] UI-Test (14.11.2026, Backlog 1486, Blickwinkel „Leitung prüft montags die Kosten der Vorwoche je Fahrzeug“):
# Kostenbericht → „Kosten einer Woche je Fahrzeug“ aufklappen: Vorwoche mit der Arbeitszeit vom Arbeitstag, „Woche danach ›“ zur laufenden Woche
# (markiert, Positionen mit Vorgangslink, „ersetzt eigene Arbeit/Teile“), „Vorwoche“ zurück, Zustand bleibt beim Neuaufbau offen, CSV-Knopf.
# DE 390 / UK 820 / EN 1366 px, keine Skriptfehler, kein waagerechtes Scrollen.
import os, datetime
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kw.inhaber','display_name':'KW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'kw.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['kf.inhaber','rb.inhaber','pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; U=(me.get('user') or me)
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    d7=(datetime.date.fromisoformat(today)-datetime.timedelta(days=7)).isoformat()
    R=os.getpid()%100000
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'kw-{action}-{R}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=api('POST',f'/api/cases/{cid}/commands',b)
        if r['s']!=200: print('   ',action,r)
        return r['s']
    vin=f'WKW{R:05d}1486000000'[:17]; pl=f'KW-{R%900} 1486'
    check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Lkw angelegt')
    cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel abgefahren (UI 1486)','priority':'mittel','driveability':'fahrbereit','request_key':f'kw-{R}'})['d']['id']
    ok1=cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'UI 1486')==200 and cmd(cid,'start_repair')==200
    ok1=ok1 and cmd(cid,'record_work',{'hours':2.5,'description':'Halter gerichtet','work_date':d7})==200
    ok1=ok1 and cmd(cid,'add_external_cost',{'supplier':f'Komplett {R}','amount_net':321,'covers_work_and_parts':True,'invoice_no':f'KG-{R}'})==200
    ok1=ok1 and cmd(cid,'add_part',{'name':'Clip ohne Preis','quantity':4})==200
    check(ok1,'Arbeitszeit (Vorwoche), Fremdleistung und Teil erfasst')
    VID='VIN:'+vin
    for lang,(w,h) in [('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=ctx.new_page(); errs=[]
        q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':U.get('username'),'password':PW}])
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { t: S.cw_title, run: S.cw_running, rep: S.cw_replaces, next: S.cw_next, last: S.cw_last, unv: S.unvalued }; }", lang)
        q.goto(B+'/#/costs'); q.reload(); q.wait_for_selector('#costweek',timeout=15000)
        check(not q.locator('#costweek').evaluate('e => e.open'),f'{lang}/{w}: Woche zunächst zugeklappt')
        check(T['t'] in q.locator('#costweek summary').inner_text(),f'{lang}/{w}: Überschrift')
        q.locator('#costweek summary').click()
        q.wait_for_selector('#costweekbody [data-cwhead]',timeout=15000)
        mine=q.locator(f'#costweekbody [data-cwv="{VID}"]')
        check(mine.count()==1,f'{lang}/{w}: Lkw in der Vorwoche')
        check(q.locator('#costweekbody [data-cwrun]').count()==0,f'{lang}/{w}: Vorwoche nicht als laufend markiert')
        if mine.count():
            mine.locator('summary').click()
            its=mine.locator('[data-cwi]')
            check(its.count()==1 and its.first.get_attribute('data-cwi')=='arbeitszeit',f'{lang}/{w}: nur Arbeitszeit vom Arbeitstag ({its.count()})')
        if SHOTS: q.locator('#costweek').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kosten-woche-vorwoche-{lang}-{w}.png')
        q.locator('#costweekbody [data-cwnav]', has_text=T['next']).click()
        q.wait_for_selector('#costweekbody [data-cwrun]',timeout=15000)
        check(q.locator('#costweekbody [data-cwnav]', has_text=T['next']).count()==0,f'{lang}/{w}: laufende Woche ohne „Woche danach“')
        mine=q.locator(f'#costweekbody [data-cwv="{VID}"]')
        check(mine.count()==1,f'{lang}/{w}: Lkw in der laufenden Woche')
        if mine.count():
            mine.locator('summary').click()
            tx=mine.inner_text()
            check(T['rep'] in tx and T['unv'] in tx and 'Komplett' in tx,f'{lang}/{w}: Fremdleistung „ersetzt“, Teil unbewertet')
            check(mine.locator('[data-cwi] a[href^="#/cases/"]').count()>=2,f'{lang}/{w}: Positionen mit Vorgangslink')
            check(mine.locator('[data-cwnc]').count()==1,f'{lang}/{w}: Teil im Vorgang mit „ersetzt eigene Arbeit/Teile“ als nicht gezählt markiert')
        sw=q.evaluate('document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang}/{w}: kein waagerechtes Scrollen ({sw})')
        if SHOTS: mine.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kosten-woche-laufend-{lang}-{w}.png')
        with q.expect_download(timeout=15000) as dl: q.locator('#cwcsv').click()
        check(dl.value.suggested_filename.startswith('fuhrpark-kosten-woche_') and today[:4] in dl.value.suggested_filename,f'{lang}/{w}: CSV {dl.value.suggested_filename}')
        # Neuaufbau (Sortierung ändern o. Ä.): Abschnitt bleibt offen, gewählte Woche bleibt
        q.evaluate("() => { const f = document.getElementById('cr'); f.requestSubmit(); }")
        q.wait_for_selector('#costweekbody [data-cwrun]',timeout=15000)
        check(q.locator('#costweek').evaluate('e => e.open'),f'{lang}/{w}: nach „Anzeigen“ weiter offen, gleiche Woche')
        q.locator('#costweekbody [data-cwnav]', has_text=T['last']).click()
        q.wait_for_function("() => document.querySelector('#costweekbody [data-cwhead]') && !document.querySelector('#costweekbody [data-cwrun]')",timeout=15000)
        check(q.locator('#costweekbody [data-cwnav]', has_text=T['last']).count()==0,f'{lang}/{w}: „Vorwoche“ führt zurück')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER:' if fails else 'OK', len(fails))
raise SystemExit(1 if fails else 0)
