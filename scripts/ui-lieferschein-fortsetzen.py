# [CLAUDE] UI-Test (05.11.2026, Backlog 1032–1034, Blickwinkel „Werkstatt bekommt die Teile und fotografiert den Lieferschein“):
# Werkstatt öffnet „Reparatur fortsetzen“ bei einem Auftrag, der bis zur Teilelieferung fährt und einen Arbeitsstand hat → Hinweis (fährt bis
# zur Lieferung endet), Auswahl Lieferschein, Häkchen „Arbeitsstand entfernen“; danach Verlauf mit Lieferschein-Link und „Arbeitsstand entfernt“.
# DE/UK/EN bei 390/820/1366 px.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([cid, name]) => { const b = new Uint8Array(400); crypto.getRandomValues(b); b.set([0xff, 0xd8, 0xff, 0xe0]);
  const r = await fetch(`/api/cases/${cid}/files`, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-filename': name, 'x-cfp': '1' }, body: b });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ls.inhaber','display_name':'LS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ls.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'ls-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'ls.w{R}.{n}','display_name':f'LS Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(uw['s'] in (200,201),f'{lang}/{w}: Konto Werkstatt')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qw=login(ctx,f'ls.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        pl=f'LS-A {R%900}{n}'; vin=f'WLS{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremssattel fest (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'ls-{R}-{n}'})
        cid=c['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Bremse instand setzen')==200 and cmd(qw,cid,'start_repair')==200,f'{lang}/{w}: in Reparatur')
        check(cmd(qw,cid,'set_work_state',{},'Rad demontiert, warte auf Bremssattel')==200 and cmd(qw,cid,'wait_parts',{},'Bremssattel bestellt')==200,f'{lang}/{w}: Arbeitsstand, wartet auf Teile')
        check(cmd(a,cid,'set_parts_drive',{'on':'1'})==200,f'{lang}/{w}: fährt bis zur Lieferung')
        up=qw.evaluate(UP,[cid,'lieferschein-bremssattel.jpg']); check(up['s']==201,f'{lang}/{w}: Lieferschein hochgeladen')
        T=qw.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { act: S.act_resume_repair, pdr: S.rr_pdr, clr: S.rr_ws_clear, cleared: S.rr_ws_cleared, dlv: S.dlv_file }; }", lang)
        qw.goto(B+f'/#/cases/{cid}'); qw.reload(); qw.wait_for_selector('button[data-act=resume_repair]',timeout=15000)
        qw.click('button[data-act=resume_repair]'); qw.wait_for_selector('#af',timeout=10000)
        check(qw.locator('#rrpdr').count()==1 and T['pdr'] in qw.locator('#rrpdr').inner_text(),f'{lang}/{w}: Hinweis „fährt bis zur Lieferung endet“')
        check(qw.locator('#dlvfile option').count()==2,f'{lang}/{w}: Lieferschein wählbar')
        check(qw.locator('#rrws').count()==1 and 'Bremssattel' in qw.locator('#rrws').inner_text(),f'{lang}/{w}: aktueller Arbeitsstand im Formular')
        check(T['clr'] in qw.locator('label.check:has(#rrwsclr)').inner_text(),f'{lang}/{w}: Häkchen „{T["clr"]}“')
        qw.select_option('#dlvfile',index=1); qw.check('#rrwsclr')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        if SHOTS: qw.locator('#af').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/lieferschein-form-{lang}-{w}.png')
        qw.click('#af button.btn:not(.secondary)'); qw.wait_for_selector('[data-dlvev]',timeout=15000); qw.wait_for_timeout(300)
        ev=qw.locator('[data-dlvev]').first.inner_text()
        check(T['dlv'] in ev and 'lieferschein-bremssattel.jpg' in ev,f'{lang}/{w}: Verlauf mit Lieferschein')
        check(qw.locator('[data-wscev]').count()==1 and T['cleared'] in qw.locator('[data-wscev]').inner_text(),f'{lang}/{w}: Verlauf „{T["cleared"]}“')
        d=qw.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']
        check(d['status']=='in_reparatur' and not d.get('work_state_note') and not d.get('parts_drive_at'),f'{lang}/{w}: Server-Stand')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS: qw.locator('[data-dlvev]').first.scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/lieferschein-verlauf-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
