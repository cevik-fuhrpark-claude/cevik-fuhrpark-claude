# [CLAUDE] UI-Test (02.11.2026, Backlog 870, Blickwinkel „Disposition: Lkw steht halb zerlegt in der Werkstatt“):
# Werkstatt trägt einen Arbeitsstand ein → Startseite der Disposition „Nicht einplanen“ zeigt beim Fahrzeug ⏸ Arbeitsstand mit Text.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dw.inhaber','display_name':'DW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'dw.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['ub.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'dw-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'dw.w{R}.{n}','display_name':f'DW Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        ud=api('POST','/api/users',{'username':f'dw.d{R}.{n}','display_name':f'DW Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(uw['s'] in (200,201) and ud['s'] in (200,201),f'{lang}/{w}: Konten')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qw=login(ctx,f'dw.w{R}.{n}',lang,uw['d']['invite_token'])
        pl=f'DW-A {R%900}{n}'; vin=f'WDW{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Kupplung rutscht {n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'dw-{R}-{n}'})['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Kupplung')==200 and cmd(qw,cid,'start_repair')==200,f'{lang}/{w}: in Reparatur')
        txt=f'Getriebe ausgebaut – nicht bewegen {n}'
        check(cmd(qw,cid,'set_work_state',None,txt)==200,f'{lang}/{w}: Arbeitsstand eingetragen')
        qw.close(); ctx.clear_cookies()
        qd=login(ctx,f'dw.d{R}.{n}',lang,ud['d']['invite_token']); qd.on('pageerror',lambda e: errs.append(str(e)))
        T=qd.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { w: S.wst_short }; }", lang)
        qd.goto(B+'/#/'); qd.reload()
        qd.wait_for_selector(f'a.row[href="#/cases/{cid}"] [data-dwst]',timeout=20000)
        x=qd.locator(f'a.row[href="#/cases/{cid}"] [data-dwst]').first.inner_text()
        check(T['w'] in x and txt[:18] in x,f'{lang}/{w}: „Nicht einplanen“ zeigt Arbeitsstand')
        check(qd.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: qd.locator(f'a.row[href="#/cases/{cid}"]').first.scroll_into_view_if_needed(); qd.screenshot(path=f'{SHOTS}/dispo-arbeitsstand-{lang}-{w}.png')
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'set_work_state','command_id':f'dw-clr-{R}-{n}','expected_version':v,'note':''})
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
