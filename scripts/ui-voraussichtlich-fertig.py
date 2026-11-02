# [CLAUDE] UI-Test (02.11.2026, Backlog 871, Blickwinkel „Fahrer fragt: wann ist mein Lkw fertig?“):
# Werkstatt trägt im Vorgang „Voraussichtlich fertig“ über das Formular ein → Vorgang zeigt das Datum; der Fahrer sieht es im Vorgang
# und in seiner Meldungsliste auf der Startseite sowie den Hinweis „Voraussichtlich fertig: neues Datum“ (Backlog 873). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vf.inhaber','display_name':'VF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'vf.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['dw.inhaber','ub.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'vf-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'vf.w{R}.{n}','display_name':f'VF Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        ud=api('POST','/api/users',{'username':f'vf.f{R}.{n}','display_name':f'VF Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(uw['s'] in (200,201) and ud['s'] in (200,201),f'{lang}/{w}: Konten')
        pl=f'VF-A {R%900}{n}'; vin=f'WVF{R:05d}{n:04d}0000000'[:17]
        vr=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(vr['s']==201,f'Lkw {pl}')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qd=login(ctx,f'vf.f{R}.{n}',lang,ud['d']['invite_token'])
        cr=qd.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Kupplung rutscht {n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'vf-{R}-{n}'}])
        check(cr['s'] in (200,201),f'{lang}/{w}: Fahrer meldet'); cid=cr['d']['id']
        qd.close(); ctx.clear_cookies()
        qw=login(ctx,f'vf.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Kupplung')==200 and cmd(qw,cid,'start_repair')==200,f'{lang}/{w}: in Reparatur')
        T=qw.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { a: S.act_set_ready_date, t: S.rdy_title }; }", lang)
        qw.goto(B+f'/#/cases/{cid}'); qw.reload()
        qw.wait_for_selector('button[data-act="set_ready_date"]',timeout=20000)
        check(T['a'] in qw.locator('button[data-act="set_ready_date"]').inner_text(),f'{lang}/{w}: Knopf beschriftet')
        qw.click('button[data-act="set_ready_date"]'); qw.wait_for_selector('#rdyd',timeout=10000)
        check(qw.locator('#rdyhint').is_visible(),f'{lang}/{w}: Hinweis im Formular')
        dt=(datetime.date.today()+datetime.timedelta(days=3)).isoformat()
        qw.fill('#rdyd',dt)
        if SHOTS: qw.locator('#af').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/fertig-formular-{lang}-{w}.png')
        qw.click('#af button.btn:not(.secondary)')
        qw.wait_for_selector('#rdy',timeout=15000)
        dd=dt.split('-'); x=qw.locator('#rdy').inner_text()
        check(dd[2] in x and dd[1] in x,f'{lang}/{w}: Vorgang zeigt Datum ({x[:40]})')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Werkstatt ohne Querscrollen')
        check(not errs,f'{lang}/{w}: Werkstatt ohne Skriptfehler {errs[:2]}')
        qw.close(); ctx.clear_cookies()
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'vf.f{R}.{n}','password':PW}]); q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B+'/#/'); q.reload()
        q.wait_for_selector(f'a.row[href="#/cases/{cid}"] [data-rdyl]',timeout=20000)
        y=q.locator(f'a.row[href="#/cases/{cid}"] [data-rdyl]').first.inner_text()
        check(T['t'] in y and dd[2] in y,f'{lang}/{w}: Fahrer-Startseite zeigt „{T["t"]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Fahrer-Startseite ohne Querscrollen')
        if SHOTS: q.locator(f'a.row[href="#/cases/{cid}"]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fertig-fahrer-start-{lang}-{w}.png')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#rdy',timeout=20000)
        check(dd[2] in q.locator('#rdy').inner_text(),f'{lang}/{w}: Fahrer sieht Datum im Vorgang')
        check(q.locator('button[data-act="set_ready_date"]').count()==0,f'{lang}/{w}: Fahrer ohne Knopf')
        if SHOTS: q.locator('#rdy').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fertig-fahrer-vorgang-{lang}-{w}.png')
        # Backlog 873: Hinweis „Voraussichtlich fertig: neues Datum“ im Posteingang des Fahrers (Sprache des Kontos)
        P=q.evaluate("async (l) => { const m = await import('/i18n.js'); return m.STRINGS[l].pk_ready_changed; }", lang)
        q.goto(B+'/#/inbox'); q.wait_for_selector('#nfil, .list, main',timeout=15000)
        q.wait_for_function("(p) => document.body.innerText.includes(p)", arg=P, timeout=15000)
        check(P in q.inner_text('body') and dd[2] in q.inner_text('body'),f'{lang}/{w}: Posteingang „{P}“ mit Datum')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Posteingang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fertig-fahrer-hinweis-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
