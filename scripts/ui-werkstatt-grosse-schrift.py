# [CLAUDE] UI-Test (14.11.2026, Backlog 1487, Blickwinkel „Werkstatt-Tablet mit sehr großer Schrift (Bedienungshilfen 150–200 %)“):
# Browser-Grundschrift per CDP (Page.setFontSizes) wie die Android-Systemschrift – Breitenstufen in em greifen: Tablet 820 px bei 32 px Grundschrift
# zeigt Auftragszeilen wie am Handy (Titel in eigener Zeile, nicht „Bremse q…“), bei 16 px unverändert; Kostenbericht-Schnellwahl am Handy bei
# 24 px ohne waagrechtes Scrollen. Werkstatt (Start, Vorgänge, Auftrag, Werkstattplan, Lager, Arbeitszeit) und Inhaber (Kosten). DE/UK/EN.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MEAS = """() => { const W = document.documentElement.clientWidth; const over = [];
  for (const el of document.querySelectorAll('main *')) { const r = el.getBoundingClientRect(); if (!r.width || r.right <= W + 1) continue;
    let clip = false; for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).overflowX !== 'visible') { clip = true; break; }
    if (!clip && over.length < 4) over.push(el.tagName + ' ' + (el.textContent || '').trim().slice(0, 40)); }
  return { sw: document.documentElement.scrollWidth, over }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gw.inhaber','display_name':'GW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'gw.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['kw.inhaber','kf.inhaber','rb.inhaber','pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; U=(me.get('user') or me); envn=U.get('environment') or 'production'
    R=os.getpid()%100000
    vin=f'WGW{R:05d}1487000000'[:17]
    check(api('POST','/api/vehicles',{'plate':f'GW-{R%900} 1487','vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Lkw angelegt')
    cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht hinten links, Luftverlust am Anhänger (UI 1487)','priority':'mittel','driveability':'fahrbereit','request_key':f'gw-{R}'})['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'gw-{R}','expected_version':v,'payload':{'workshop_site':'DORTMUND'},'note':'UI 1487'})['s']==200,'Auftrag an Werkstatt')
    def ctx_fs(w,h,fs):
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if SHOTS else 1); q=ctx.new_page()
        cdp=ctx.new_cdp_session(q); cdp.send('Page.enable'); cdp.send('Page.setFontSizes',{'fontSizes':{'standard':fs,'fixed':max(13,int(fs*13/16))}})
        return ctx,q
    def title_row(q):
        q.wait_for_selector(f'main a.row[href="#/cases/{cid}"]',timeout=15000)
        return q.evaluate(f"""() => {{ const t = document.querySelector('main a.row[href="#/cases/{cid}"] > .title'); const cs = getComputedStyle(t); return {{ row: cs.gridRowStart, ws: cs.whiteSpace, cut: cs.whiteSpace === 'nowrap' && t.scrollWidth > t.clientWidth + 2 }}; }}""")
    for lang in ['de','uk','en']:
        u=api('POST','/api/users',{'username':f'gw.ws{R}{lang}','display_name':'GW Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c.close()
        for fs,(w,h) in [(32,(820,1180)),(16,(820,1180))]:
            ctx,q=ctx_fs(w,h,fs); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'gw.ws{R}{lang}','password':PW}])
            for rt in ['','cases']:
                q.goto(B+'/#/'+rt); q.reload()
                r=title_row(q)
                if fs==32: check(r['row']=='2' and r['ws']=='normal' and not r['cut'],f'{lang}/{w}/{fs}px #{rt or "start"}: Auftragstitel in eigener Zeile, nicht abgeschnitten {r}')
                else: check(r['row']!='2' and r['ws']=='nowrap',f'{lang}/{w}/{fs}px #{rt or "start"}: Tablet-Zeile wie bisher {r}')
                if SHOTS and fs==32 and rt=='cases': q.locator(f'main a.row[href="#/cases/{cid}"]').screenshot(path=f'{SHOTS}/ws-grosse-schrift-{lang}-{w}.png')
            for rt in ['','cases','cases/'+cid,'plan','stock','worklog']:
                q.goto(B+'/#/'+rt); q.reload()
                try: q.wait_for_selector('main h1',timeout=15000)
                except Exception: pass
                q.wait_for_timeout(500); m=q.evaluate(MEAS)
                check(m['sw']<=w+1 and not m['over'],f'{lang}/{w}/{fs}px #{rt[:12] or "start"}: kein waagrechtes Scrollen {m}')
            check(not errs,f'{lang}/{w}/{fs}px: keine Skriptfehler {errs}')
            ctx.close()
        # Inhaber am Handy mit 150 %: Kostenbericht-Schnellwahl bricht an Leerzeichen um
        api('PATCH','/api/me',{'language':lang})
        ctx,q=ctx_fs(390,844,24); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':U.get('username'),'password':PW}])
        q.goto(B+'/#/costs'); q.reload(); q.wait_for_selector('#crq',timeout=15000); q.wait_for_timeout(300)
        m=q.evaluate(MEAS); check(m['sw']<=391 and not m['over'],f'{lang}/390/24px Kosten: kein waagrechtes Scrollen {m}')
        if SHOTS: q.locator('#crq').screenshot(path=f'{SHOTS}/kosten-schnellwahl-24px-{lang}.png')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER:' if fails else 'OK', len(fails))
raise SystemExit(1 if fails else 0)
