# [CLAUDE] UI-Test (02.11.2026, Backlog 875, Blickwinkel „Fuhrparkleitung: Werkstatt verschiebt den Fertigtermin immer wieder“):
# „Voraussichtlich fertig“ dreimal gesetzt (davon zweimal nach hinten) → Vorgang zeigt „2-mal verschoben (erste Angabe …)“ in der Kontosprache.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fv.inhaber','display_name':'FV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'fv.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['vf.inhaber','dw.inhaber','ub.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'fv-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    day=lambda k:(datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uf=api('POST','/api/users',{'username':f'fv.l{R}.{n}','display_name':f'FV Leitung {n}','role':'fleet','environment':envn,'language':lang})
        check(uf['s'] in (200,201),f'{lang}/{w}: Konto Leitung')
        pl=f'FV-A {R%900}{n}'; vin=f'WFV{R:05d}{n:04d}0000000'[:17]
        vr=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(vr['s']==201,f'Lkw {pl}')
        cr=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Getriebe schaltet hart {n} (Test)','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':f'fv-{R}-{n}'})
        check(cr['s'] in (200,201),f'{lang}/{w}: Vorgang'); cid=cr['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Getriebe')==200 and cmd(a,cid,'start_repair')==200,f'{lang}/{w}: in Reparatur')
        for k in [2,5,4,8]: check(cmd(a,cid,'set_ready_date',{'ready_expected_on':day(k)})==200,f'{lang}/{w}: Datum +{k}')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':uf['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'fv.l{R}.{n}','password':PW}]); q.on('pageerror',lambda e: errs.append(str(e)))
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); return { m: m.PLURALS[l].rdy_moved, f: m.STRINGS[l].rdy_first }; }", lang)
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#rdy [data-rdymoves]',timeout=20000)
        x=q.locator('#rdy [data-rdymoves]').inner_text(); d2=day(2).split('-')
        check('2' in x and T['f'] in x and d2[2] in x and d2[1] in x,f'{lang}/{w}: „{x}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#rdy').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fertig-verschoben-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
