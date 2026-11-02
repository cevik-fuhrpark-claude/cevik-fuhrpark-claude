# [CLAUDE] UI-Test (02.11.2026, Backlog 866, Blickwinkel „Neuer Mechaniker, erste Woche: welche Aufträge sind meine?“):
# Startseite der Werkstatt zeigt „Von dir bearbeitet“ mit dem selbst begonnenen Auftrag (nicht dem des Kollegen) vor den Arbeitsschritten;
# Reiter „Von mir bearbeitet“ in Vorgänge zeigt dieselben. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ma.inhaber','display_name':'MA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ma.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'ma-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    def newcase(tag):
        pl=f'MA-{tag} {R%900}{n}'; vin=f'WMA{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Spiegel locker {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'ma-{R}-{n}-{tag}'})
        cid=c['d']['id']; check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'freigegeben'); return cid
    SEC="""([k]) => { const h=[...document.querySelectorAll('#app h2')].find((x)=>x.textContent.trim().startsWith(k)); if(!h) return null;
      let el=h.nextElementSibling; while(el && !el.classList.contains('list') && el.tagName!=='H2') el=el.nextElementSibling;
      const hs=[...document.querySelectorAll('#app h2')]; return { ids: el && el.classList.contains('list') ? [...el.querySelectorAll('a.row')].map((x)=>x.getAttribute('href')) : [], idx: hs.indexOf(h), hint: !!document.querySelector('#wsminehint'), heads: hs.map((x)=>x.textContent.trim()) }; }"""
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ua=api('POST','/api/users',{'username':f'ma.a{R}.{n}','display_name':f'MA Mechaniker A {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        ub=api('POST','/api/users',{'username':f'ma.b{R}.{n}','display_name':f'MA Mechaniker B {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(ua['s'] in (200,201) and ub['s'] in (200,201),f'{lang}/{w}: zwei Werkstatt-Konten')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qa=login(ctx,f'ma.a{R}.{n}',lang,ua['d']['invite_token']); qa.on('pageerror',lambda e: errs.append(str(e)))
        ctxb=br.new_context(); qb=login(ctxb,f'ma.b{R}.{n}',lang,ub['d']['invite_token'])
        c1=newcase('A'); c2=newcase('B')
        check(cmd(qa,c1,'start_repair')==200 and cmd(qb,c2,'start_repair')==200,f'{lang}/{w}: A beginnt c1, B beginnt c2')
        T=qa.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { mine: S.ws_mine, filt: S.filter_mine, step: S.st_in_reparatur, also: S.ws_also_above }; }", lang)
        qa.goto(B+'/#/'); qa.reload(); qa.wait_for_selector('#wsminehint',timeout=15000); qa.wait_for_timeout(500)
        r=qa.evaluate(SEC,[T['mine']])
        check(r and f'#/cases/{c1}' in r['ids'] and f'#/cases/{c2}' not in r['ids'],f'{lang}/{w}: „{T["mine"]}“ mit eigenem, ohne Kollegen-Auftrag')
        rs=qa.evaluate(SEC,[T['step']])
        check(r and rs and r['idx']<rs['idx'] and f'#/cases/{c1}' in rs['ids'] and f'#/cases/{c2}' in rs['ids'],f'{lang}/{w}: vor dem Arbeitsschritt, dort beide')
        check(qa.evaluate("(id) => { const a=[...document.querySelectorAll('a.row')].filter((x)=>x.getAttribute('href')==='#/cases/'+id).pop(); return !!(a && a.querySelector('[data-alsoabove]')); }", c1),f'{lang}/{w}: Eintrag unten trägt „{T["also"]}“')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Start)')
        if SHOTS: qa.locator('#wsminehint').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/meine-{lang}-{w}.png')
        qa.click('#wsminehint a'); qa.wait_for_selector('.seg-tabs a[data-f=mine].on',timeout=15000); qa.wait_for_timeout(500)
        tab=qa.locator('.seg-tabs a[data-f=mine]').inner_text().strip()
        check(tab==T['filt'],f'{lang}/{w}: Reiter „{tab}“')
        hrefs=qa.evaluate("[...document.querySelectorAll('#cl a.row')].map((x)=>x.getAttribute('href'))")
        check(f'#/cases/{c1}' in hrefs and f'#/cases/{c2}' not in hrefs,f'{lang}/{w}: Liste nur eigene')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Liste)')
        if SHOTS: qa.screenshot(path=f'{SHOTS}/meine-liste-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close(); ctxb.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
