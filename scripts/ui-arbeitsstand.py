# [CLAUDE] UI-Test (02.11.2026, Backlog 867, Blickwinkel „Werkstatt-Tablet: Mechaniker wird mitten in der Reparatur zu einem Notfall gerufen“):
# Im Vorgang „Arbeitsstand eintragen“ → Text steht oben im Vorgang mit Uhrzeit/Name und auf der Werkstatt-Startseite beim Auftrag;
# Formular erneut geöffnet ist vorbelegt; leeren entfernt ihn (Verlauf „entfernt“). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'as-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    def newcase(tag):
        pl=f'AS-{tag} {R%900}{n}'; vin=f'WAS{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Spiegel locker {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'as-{R}-{n}-{tag}'})
        cid=c['d']['id']; check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'freigegeben'); return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ua=api('POST','/api/users',{'username':f'as.a{R}.{n}','display_name':f'AS Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(ua['s'] in (200,201),f'{lang}/{w}: Werkstatt-Konto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qa=login(ctx,f'as.a{R}.{n}',lang,ua['d']['invite_token']); qa.on('pageerror',lambda e: errs.append(str(e)))
        qa.on('dialog',lambda dlg: dlg.accept())
        c1=newcase('A')
        check(cmd(qa,c1,'start_repair')==200,f'{lang}/{w}: Reparatur begonnen')
        T=qa.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { act: S.act_set_work_state, title: S.wst_title, cleared: S.wst_cleared }; }", lang)
        txt=f'Rad HL abgebaut, Bremse zerlegt – Lkw nicht bewegen {n}'
        qa.goto(B+f'/#/cases/{c1}'); qa.reload(); qa.wait_for_selector('button[data-act=set_work_state]',timeout=15000)
        check(qa.locator('button[data-act=set_work_state]').inner_text().strip()==T['act'],f'{lang}/{w}: Knopf „{T["act"]}“')
        qa.click('button[data-act=set_work_state]'); qa.wait_for_selector('#af textarea[name=note]',timeout=10000)
        check(qa.locator('#wsthint').count()==1 and qa.locator('#wstclear').count()==1,f'{lang}/{w}: Hinweise im Formular')
        qa.fill('#af textarea[name=note]',txt)
        if SHOTS: qa.locator('#af').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/arbeitsstand-form-{lang}-{w}.png')
        qa.click('#af button.btn:not(.secondary)'); qa.wait_for_selector('#wstate',timeout=15000); qa.wait_for_timeout(300)
        ws=qa.locator('#wstate').inner_text()
        check(txt in ws and f'AS Mechaniker {n}' in ws,f'{lang}/{w}: Arbeitsstand im Vorgang mit Name')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS: qa.locator('#wstate').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/arbeitsstand-vorgang-{lang}-{w}.png')
        # Startseite der Werkstatt: beim Auftrag
        qa.goto(B+'/#/'); qa.wait_for_selector(f'a.row[href="#/cases/{c1}"] [data-wstate]',timeout=15000)
        row=qa.locator(f'a.row[href="#/cases/{c1}"] [data-wstate]').first.inner_text()
        check(T['title'] in row and 'Rad HL' in row,f'{lang}/{w}: Startseite zeigt Arbeitsstand')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Start)')
        if SHOTS: qa.locator(f'a.row[href="#/cases/{c1}"]').first.scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/arbeitsstand-start-{lang}-{w}.png')
        # erneut öffnen: vorbelegt; leeren entfernt
        qa.goto(B+f'/#/cases/{c1}'); qa.wait_for_selector('button[data-act=set_work_state]',timeout=15000)
        qa.click('button[data-act=set_work_state]'); qa.wait_for_selector('#af textarea[name=note]',timeout=10000)
        check(qa.input_value('#af textarea[name=note]')==txt,f'{lang}/{w}: Formular vorbelegt')
        qa.fill('#af textarea[name=note]',''); qa.click('#af button.btn:not(.secondary)')
        qa.wait_for_selector('[data-ev-wstclear]',timeout=15000)
        check(qa.locator('#wstate').count()==0 and T['cleared'] in qa.locator('[data-ev-wstclear]').first.inner_text(),f'{lang}/{w}: geleert = entfernt, Verlauf „{T["cleared"]}“')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
