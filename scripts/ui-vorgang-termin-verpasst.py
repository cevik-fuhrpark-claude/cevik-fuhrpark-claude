# [CLAUDE] UI-Test (13.11.2026, Backlog 1432, Blickwinkel „Werkstatt öffnet den Auftrag, dessen Termin gestern verstrichen ist“):
# Vorgangsansicht markiert den verstrichenen Termin (rot) mit Hinweis je Rolle: Inhaber (darf verschieben) bzw. Disposition; Vorgangsliste mit Marke (Backlog 1433). DE/UK/EN 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tu.inhaber','display_name':'TU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; me_un=(me.get('user') or me).get('username'); envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'vv-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=api('POST',f'/api/cases/{cid}/commands',b)
        if r['s']!=200: print('   ',action,r)
        return r['s']
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'VV-W {R%900}{n}'; vin=f'WVV{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Kupplung rutscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'vv-{R}-{n}'})['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Kupplung prüfen')==200 and cmd(cid,'acknowledge')==200,'freigegeben + übernommen')
        check(cmd(cid,'set_planned_date',{'planned_date':iso(-1)})==200,'Termin gestern')
        d=iso(-1); dates=[f'{d[8:10]}.{d[5:7]}.', f'{d[8:10]}/{d[5:7]}/']
        un=f'vv.di{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'VV Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Dispokonto')
        for who in ['own','dispo']:
            ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
            q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
            if who=='own': q.evaluate(JS,['POST','/api/login',{'username':me_un,'password':PW}])
            else:
                q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
                q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
            q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return S.STRINGS[l]; }", lang)
            q.goto(B+f'/#/cases/{cid}'); q.reload()
            q.wait_for_selector('[data-planmissed]',timeout=20000)
            chip=q.locator('[data-planmissed]'); hint=q.locator('[data-planmissedhint]').inner_text()
            check(T['drv_ws_missed'] in chip.inner_text() and 'kritisch' in chip.get_attribute('class'),f'{lang}/{w}/{who}: rote Markierung „{T["drv_ws_missed"]}“')
            key='cpm_set' if who=='own' else 'cpm_other'
            check(T[key].split('{d}')[1][:30] in hint and any(x in hint for x in dates),f'{lang}/{w}/{who}: Hinweis {key} mit Datum')
            if who=='own': check(T['act_set_planned_date'] in hint and q.locator('button[data-a="set_planned_date"], button[data-action="set_planned_date"]').count()+q.get_by_role('button',name=T['act_set_planned_date']).count()>=1,f'{lang}/{w}: Knopf „{T["act_set_planned_date"]}“ vorhanden')
            if who=='own':
                q.goto(B+'/#/cases'); q.wait_for_selector(f'a[href="#/cases/{cid}"] [data-planmissedl]',timeout=20000)
                lm=q.locator(f'a[href="#/cases/{cid}"] [data-planmissedl]')
                check(T['drv_ws_missed'] in lm.inner_text() and 'kritisch' in lm.get_attribute('class'),f'{lang}/{w}: Vorgangsliste mit Marke (Backlog 1433)')
                check(lm.evaluate('e => e.getClientRects().length') == 1,f'{lang}/{w}: Marke einzeilig')
                if SHOTS: lm.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vorgangsliste-verpasst-{lang}-{w}.png')
                q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-planmissed]',timeout=20000)
            if SHOTS: q.locator('[data-planmissed]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vorgang-verpasst-{who}-{lang}-{w}.png')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}/{who}: ohne Querscrollen')
            check(not errs,f'{lang}/{w}/{who}: keine Skriptfehler {errs[:2]}')
            ctx.close()
        # neuer Termin → keine Markierung
        cmd(cid,'set_planned_date',{'planned_date':iso(2)})
        a.goto(B+f'/#/cases/{cid}'); a.reload(); a.wait_for_selector('h1[data-title]',timeout=20000)
        check(a.locator('[data-planmissed]').count()==0,f'{lang}/{w}: kommender Termin ohne Markierung')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
