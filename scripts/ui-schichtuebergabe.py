# [CLAUDE] UI-Test (05.11.2026, Backlog 1026, Blickwinkel „Schichtübergabe in der Werkstatt“):
# Tafel nennt beim übernommenen, nicht begonnenen Auftrag, wer übernommen hat; Vorgang zeigt „übernommen“ mit Name, Teile mit buchender
# Person und Uhrzeit (heute), Arbeitszeit mit Buchungszeit und beim Arbeitsstand „danach N weitere Buchungen“. DE/UK/EN bei 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'su.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'su.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'su-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    def newcase(tag):
        pl=f'SU-{tag} {R%900}{n}'; vin=f'WSU{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Spiegel locker {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'su-{R}-{n}-{tag}'})
        cid=c['d']['id']; check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'freigegeben'); return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ua=api('POST','/api/users',{'username':f'su.a{R}.{n}','display_name':f'SU Frueh {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(ua['s'] in (200,201),f'{lang}/{w}: Werkstatt-Konto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qa=login(ctx,f'su.a{R}.{n}',lang,ua['d']['invite_token']); qa.on('pageerror',lambda e: errs.append(str(e)))
        T=qa.evaluate("async (l) => { const m = await import('/i18n.js'); return { ack: m.STRINGS[l].ws_ack_by, one: m.PLURALS[l].wst_later }; }", lang)
        c0=newcase('U'); check(cmd(qa,c0,'acknowledge')==200,f'{lang}/{w}: übernommen')
        c1=newcase('R'); check(cmd(qa,c1,'start_repair')==200,f'{lang}/{w}: Reparatur begonnen')
        check(cmd(qa,c1,'set_work_state',{},'Bremse HL zerlegt, Scheibe bestellt')==200,f'{lang}/{w}: Arbeitsstand')
        qa.wait_for_timeout(30)
        check(cmd(qa,c1,'add_part',{'name':'Bremsscheibe','quantity':1})==200,f'{lang}/{w}: Teil gebucht')
        check(cmd(qa,c1,'record_work',{'hours':1.5,'description':'Bremse HL'})==200,f'{lang}/{w}: Arbeitszeit gebucht')
        qa.goto(B+'/#/'); qa.reload(); qa.wait_for_selector(f'a.row[href="#/cases/{c0}"] [data-ackl]',timeout=15000)
        row=qa.locator(f'a.row[href="#/cases/{c0}"] [data-ackl]').first.inner_text()
        check(T['ack'] in row and f'SU Frueh {n}' in row,f'{lang}/{w}: Tafel nennt, wer übernommen hat')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Start)')
        if SHOTS: qa.locator(f'a.row[href="#/cases/{c0}"]').first.scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/schicht-start-{lang}-{w}.png')
        qa.goto(B+f'/#/cases/{c1}'); qa.wait_for_selector('#wstate [data-wstlater]',timeout=15000)
        lt=qa.locator('#wstate [data-wstlater]').inner_text()
        check('2' in lt,f'{lang}/{w}: Arbeitsstand nennt 2 spätere Buchungen ({lt})')
        check(qa.locator('[data-ackby]').count()==1 and f'SU Frueh {n}' in qa.locator('[data-ackby]').inner_text(),f'{lang}/{w}: übernommen mit Name')
        bk=qa.locator('[data-bkby]').first.inner_text()
        check(f'SU Frueh {n}' in bk and ':' in bk,f'{lang}/{w}: Teil mit Uhrzeit und Person ({bk})')
        check(qa.locator('[data-bkat]').count()>=1,f'{lang}/{w}: Arbeitszeit mit Buchungszeit')
        check(qa.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS:
            qa.locator('#wstate').scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/schicht-stand-{lang}-{w}.png')
            qa.locator('[data-bkby]').first.scroll_into_view_if_needed(); qa.screenshot(path=f'{SHOTS}/schicht-teile-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
