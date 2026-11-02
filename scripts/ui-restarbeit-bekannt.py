# [CLAUDE] UI-Test (02.11.2026, Backlog 881, Blickwinkel „Fahrer meldet einen Mangel, den die Werkstatt schon als Restarbeit kennt“):
# Lkw mit offener Restarbeit aus einem freigegebenen Vorgang wird erneut gemeldet → „Zum Fahrzeug“ im neuen Vorgang nennt die Restarbeit mit Link
# zum freigegebenen Vorgang und Hinweis (Leitung und Werkstatt desselben Standorts). DE/UK/EN bei 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rb.inhaber','display_name':'RB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'rb.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'rb-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])
        if r['s']!=200: print('   ',action,r)
        return r['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uf=api('POST','/api/users',{'username':f'rb.f{R}.{n}','display_name':f'RB Leitung {n}','role':'fleet','environment':envn,'language':lang})
        uw=api('POST','/api/users',{'username':f'rb.w{R}.{n}','display_name':f'RB Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(uf['s'] in (200,201) and uw['s'] in (200,201),f'{lang}/{w}: Konten')
        pl=f'RB-{R%900} {n}'; vin=f'WRB{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rückleuchte defekt (Test)','priority':'niedrig','driveability':'fahrbereit','request_key':f'rb-{R}-{n}-a'})
        c1=c['d']['id']
        ok1=cmd(a,c1,'approve_repair',{'workshop_site':'DORTMUND'},'Leuchte tauschen')==200 and cmd(a,c1,'start_repair')==200
        ok1=ok1 and cmd(a,c1,'add_open_item',{'description':'Spiegelhalter rechts lose – Teil bestellt'})==200 and cmd(a,c1,'record_work',{'hours':1,'description':'Leuchte getauscht'})==200
        ok1=ok1 and api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':c1,'request_key':f'rb-i-{R}-{n}','items':items})['s']==201
        ok1=ok1 and cmd(a,c1,'request_quality_check',{},'fertig')==200 and cmd(a,c1,'technical_release',{'confirm':True},'Kontrolle ok')==200
        check(ok1,f'{lang}/{w}: Vorgang mit Restarbeit freigegeben')
        c1no=api('GET',f'/api/cases/{c1}')['d']['case']['case_no']
        c2=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts wackelt bei Fahrt','priority':'niedrig','driveability':'fahrbereit','request_key':f'rb-{R}-{n}-b'})['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qa=login(ctx,f'rb.f{R}.{n}',lang,uf['d']['invite_token']); qa.on('pageerror',lambda e: errs.append(str(e)))
        T=qa.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { t: S.vi_rel_items, h: S.vi_rel_items_hint }; }", lang)
        qa.goto(B+f'/#/cases/{c2}'); qa.reload(); qa.wait_for_selector('[data-virelitems]',timeout=15000)
        dd=qa.locator('[data-virelitems]')
        check(qa.locator('details.vinfo').evaluate('e => e.open'),f'{lang}/{w}: „Zum Fahrzeug“ aufgeklappt')
        check('Spiegelhalter rechts lose' in dd.inner_text() and T['h'] in dd.inner_text(),f'{lang}/{w}: Restarbeit mit Hinweis')
        check(dd.locator(f'a[href="#/cases/{c1}"]').inner_text().strip()==c1no,f'{lang}/{w}: Link zum freigegebenen Vorgang {c1no}')
        dt=dd.evaluate('e => e.previousElementSibling && e.previousElementSibling.textContent.trim()')
        check(dt==T['t'],f'{lang}/{w}: Überschrift „{T["t"]}“')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Leitung)')
        if SHOTS: dd.scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/restarbeit-bekannt-leitung-{lang}-{w}.png')
        # Werkstatt desselben Standorts am neuen Auftrag
        check(cmd(a,c2,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel prüfen')==200,f'{lang}/{w}: neuer Auftrag freigegeben')
        ctx2=br.new_context(viewport={'width':w,'height':h}); qw=login(ctx2,f'rb.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        qw.goto(B+f'/#/cases/{c2}'); qw.reload(); qw.wait_for_selector('[data-virelitems]',timeout=15000)
        check(qw.locator(f'[data-virelitems] a[href="#/cases/{c1}"]').count()==1,f'{lang}/{w}: Werkstatt sieht Restarbeit mit Link')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Werkstatt)')
        if SHOTS: qw.locator('[data-virelitems]').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/restarbeit-bekannt-werkstatt-{lang}-{w}.png')
        qw.click(f'[data-virelitems] a[href="#/cases/{c1}"]'); qw.wait_for_function(f"location.hash === '#/cases/{c1}'",timeout=10000)
        qw.wait_for_selector('h1',timeout=10000)
        check(c1no in qw.locator('#app').inner_text(),f'{lang}/{w}: Link öffnet den freigegebenen Vorgang')
        ctx2.close()
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
