# [CLAUDE] UI-Test (02.11.2026, Backlog 880, Blickwinkel „Werkstatt wartet auf Teile, der Lkw fährt so lange weiter“):
# Fuhrparkleitung setzt im Vorgang „wartet auf Teile“ „Fahren bis zur Teilelieferung“ → Angabe oben im Vorgang mit Zeit/Name; Disposition sieht
# das Fahrzeug im eigenen Abschnitt (nicht unter „Nicht einplanen“); derselbe Knopf entfernt den Vermerk (Verlauf). DE/UK/EN bei 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pd.inhaber','display_name':'PD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'pd.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'pd-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    def newcase(tag):
        pl=f'PD-{tag} {R%900}{n}'; vin=f'WPD{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Luftbalg undicht {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'pd-{R}-{n}-{tag}'})
        cid=c['d']['id']; check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Luftbalg tauschen')==200,'freigegeben'); return cid
    import datetime
    eta=(datetime.date.today()+datetime.timedelta(days=4)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uf=api('POST','/api/users',{'username':f'pd.f{R}.{n}','display_name':f'PD Leitung {n}','role':'fleet','environment':envn,'language':lang})
        ud=api('POST','/api/users',{'username':f'pd.d{R}.{n}','display_name':f'PD Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(uf['s'] in (200,201) and ud['s'] in (200,201),f'{lang}/{w}: Konten')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qa=login(ctx,f'pd.f{R}.{n}',lang,uf['d']['invite_token']); qa.on('pageerror',lambda e: errs.append(str(e)))
        c1=newcase('A')
        check(cmd(a,c1,'start_repair')==200 and cmd(a,c1,'wait_parts',{'parts_expected_date':eta},'Luftbalg bestellt')==200,f'{lang}/{w}: wartet auf Teile')
        T=qa.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { act: S.act_set_parts_drive, yes: S.pdr_yes, on: S.pdr_on_hint, off: S.pdr_off_hint, evoff: S.pdr_ev_off, sec: S.dispo_pdrive, short: S.pdr_short }; }", lang)
        qa.goto(B+f'/#/cases/{c1}'); qa.reload(); qa.wait_for_selector('button[data-act=set_parts_drive]',timeout=15000)
        check(qa.locator('button[data-act=set_parts_drive]').inner_text().strip()==T['act'],f'{lang}/{w}: Knopf „{T["act"]}“')
        qa.click('button[data-act=set_parts_drive]'); qa.wait_for_selector('#pdrhint',timeout=10000)
        check(qa.locator('#pdrhint').inner_text().strip()==T['on'],f'{lang}/{w}: Hinweis beim Setzen')
        qa.fill('#af textarea[name=note]','nur Nahverkehr')
        if SHOTS: qa.locator('#af').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/teilefahrt-form-{lang}-{w}.png')
        qa.click('#af button.btn:not(.secondary)'); qa.wait_for_selector('#pdrive',timeout=15000); qa.wait_for_timeout(300)
        pv=qa.locator('#pdrive').inner_text()
        check(T['yes'] in pv and f'PD Leitung {n}' in pv,f'{lang}/{w}: Angabe im Vorgang mit Name')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS: qa.locator('#pdrive').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/teilefahrt-vorgang-{lang}-{w}.png')
        # Disposition: eigener Abschnitt, nicht „Nicht einplanen“
        ctx2=br.new_context(viewport={'width':w,'height':h}); qd=login(ctx2,f'pd.d{R}.{n}',lang,ud['d']['invite_token']); qd.on('pageerror',lambda e: errs.append(str(e)))
        qd.goto(B+'/#/'); qd.reload(); qd.wait_for_selector(f'a[data-dpdr][href="#/cases/{c1}"]',timeout=20000)
        rowt=qd.locator(f'a[data-dpdr][href="#/cases/{c1}"]').inner_text()
        check(T['short'] in rowt,f'{lang}/{w}: Disposition-Zeile „{T["short"]}“')
        check(T['sec'] in qd.locator('#dpdrive').inner_text(),f'{lang}/{w}: Abschnitt „{T["sec"]}“')
        NP=qd.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].dispo_not_plannable", lang)
        inNp=qd.evaluate("([h, id]) => { const hd = [...document.querySelectorAll('h2')].find((x) => x.textContent.trim() === h); const l = hd && hd.nextElementSibling; return !!(l && l.querySelector(`a[href=\"#/cases/${id}\"]`)); }", [NP, c1])
        check(not inNp,f'{lang}/{w}: nicht unter „Nicht einplanen“')
        check(qd.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Disposition)')
        if SHOTS: qd.locator(f'a[data-dpdr][href="#/cases/{c1}"]').scroll_into_view_if_needed(); qd.screenshot(path=f'{SHOTS}/teilefahrt-dispo-{lang}-{w}.png')
        ctx2.close()
        # Entfernen mit demselben Knopf
        qa.goto(B+f'/#/cases/{c1}'); qa.wait_for_selector('button[data-act=set_parts_drive]',timeout=15000)
        qa.click('button[data-act=set_parts_drive]'); qa.wait_for_selector('#pdrhint',timeout=10000)
        check(qa.locator('#pdrhint').inner_text().strip()==T['off'],f'{lang}/{w}: Hinweis beim Entfernen')
        qa.click('#af button.btn:not(.secondary)'); qa.wait_for_selector('[data-ev-pdr]',timeout=15000); qa.wait_for_timeout(300)
        check(qa.locator('#pdrive').count()==0 and any(T['evoff'] in x for x in qa.locator('[data-ev-pdr]').all_inner_texts()),f'{lang}/{w}: entfernt, Verlauf „{T["evoff"]}“')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
