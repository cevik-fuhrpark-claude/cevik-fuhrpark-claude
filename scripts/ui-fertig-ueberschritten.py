# [CLAUDE] UI-Test (02.11.2026, Backlog 872, Folge aus 871): „Voraussichtlich fertig“ vorbei → Fuhrparkleitung sieht den Auftrag unter
# „Heute zu tun → Voraussichtlich fertig – überschritten“, im Listenfilter (#/cases?f=ready_overdue) und im Vorgang „überschritten“.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Vergangenes Datum über /__dev/backdate (nur lokaler Dev-Server).
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fu.inhaber','display_name':'UB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'fu.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['ub.inhaber','dw.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'fu-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'fu.w{R}.{n}','display_name':f'FU Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        uf=api('POST','/api/users',{'username':f'fu.f{R}.{n}','display_name':f'FU Leitung {n}','role':'fleet','environment':envn,'language':lang})
        check(uw['s'] in (200,201) and uf['s'] in (200,201),f'{lang}/{w}: Konten')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qw=login(ctx,f'fu.w{R}.{n}',lang,uw['d']['invite_token'])
        pl=f'FU-A {R%900}{n}'; vin=f'WFU{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Getriebe schaltet hart {n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'fu-{R}-{n}'})['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Getriebe')==200 and cmd(qw,cid,'start_repair')==200,f'{lang}/{w}: in Reparatur')
        tom=(datetime.date.today()+datetime.timedelta(days=1)).isoformat()
        check(cmd(qw,cid,'set_ready_date',{'ready_expected_on':tom})==200,f'{lang}/{w}: voraussichtlich fertig eingetragen')
        bd=a.evaluate("async (u) => (await fetch(u, { method: 'POST', headers: { 'x-cfp': '1' } })).status", f'/__dev/backdate?case={cid}&hours=0&ready_days=3')
        check(bd==200,f'{lang}/{w}: Datum zurückgesetzt (Dev)')
        qw.close(); ctx.clear_cookies()
        qf=login(ctx,f'fu.f{R}.{n}',lang,uf['d']['invite_token']); qf.on('pageerror',lambda e: errs.append(str(e)))
        T=qf.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { todo: S.todo_ready_overdue, p: S.rdy_passed }; }", lang)
        qf.goto(B+'/#/'); qf.reload()
        sm=qf.locator('details.panel summary', has_text=T['todo']); sm.first.wait_for(timeout=20000)
        check(sm.count()==1,f'{lang}/{w}: „Heute zu tun → {T["todo"]}“')
        sm.first.click(); dt=qf.locator('details.panel').filter(has=qf.locator('summary', has_text=T['todo'])).first
        cnt=int(''.join(ch for ch in sm.first.locator('.chip').inner_text() if ch.isdigit()) or 0)
        row=dt.locator(f'a.row[href="#/cases/{cid}"]')
        if cnt<=8: check(row.count()==1 and pl in row.inner_text(),f'{lang}/{w}: Zeile mit Kennzeichen')
        else: check(dt.locator('[data-todomore] a').count()==1,f'{lang}/{w}: mehr als 8 → Link zur Liste')
        check(qf.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Start)')
        if SHOTS: dt.scroll_into_view_if_needed(); qf.screenshot(path=f'{SHOTS}/fertig-ueberschritten-start-{lang}-{w}.png')
        qf.goto(B+'/#/cases?f=ready_overdue'); qf.wait_for_selector('.seg-tabs a.on[data-f=ready_overdue]',timeout=15000); qf.wait_for_selector(f'a.row[href="#/cases/{cid}"] [data-rdyl] [data-rdypast]',timeout=15000)
        on=qf.locator('.seg-tabs a.on')
        check(on.count()==1 and on.inner_text().strip()==T['todo'],f'{lang}/{w}: Reiter „{T["todo"]}“ aktiv')
        check(qf.evaluate("[...document.querySelectorAll('.list a.row')].every((r) => r.querySelector('[data-rdypast]'))"),f'{lang}/{w}: nur überschrittene')
        check(qf.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Liste)')
        if SHOTS: qf.screenshot(path=f'{SHOTS}/fertig-ueberschritten-liste-{lang}-{w}.png')
        qf.goto(B+f'/#/cases/{cid}'); qf.wait_for_selector('#rdy [data-rdypast]',timeout=15000)
        check(T['p'] in qf.locator('#rdy').inner_text(),f'{lang}/{w}: Vorgang „{T["p"]}“')
        # aufräumen: Datum entfernen, damit andere Skripte nicht mehr als 8 Einträge sehen
        v=qf.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        qf.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'set_ready_date','command_id':f'fu-clr-{R}-{n}','expected_version':v,'payload':{'ready_expected_on':''}}])
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
