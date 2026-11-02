# [CLAUDE] UI-Test (02.11.2026, Backlog 882, Folge aus 881): Werkstatt erledigt im neuen Auftrag die bekannte Restarbeit eines freigegebenen
# Vorgangs mit „Hier mit erledigt“ (Formular nennt Restarbeit + Vorgang, Vermerk Pflicht) → Restarbeit verschwindet aus „Zum Fahrzeug“,
# Verlauf nennt sie; im alten Vorgang „Erledigt in Vorgang …: Vermerk“ in der Oberflächensprache. DE/UK/EN bei 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rb.inhaber','display_name':'RH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'rb.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'rh-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])
        if r['s']!=200: print('   ',action,r)
        return r['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'rh.w{R}.{n}','display_name':f'RH Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(uw['s'] in (200,201),f'{lang}/{w}: Konto')
        pl=f'RH-{R%900} {n}'; vin=f'WRH{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c1=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rückleuchte defekt (Test)','priority':'niedrig','driveability':'fahrbereit','request_key':f'rh-{R}-{n}-a'})['d']['id']
        ok1=cmd(a,c1,'approve_repair',{'workshop_site':'DORTMUND'},'Leuchte tauschen')==200 and cmd(a,c1,'start_repair')==200
        ok1=ok1 and cmd(a,c1,'add_open_item',{'description':'Spiegelhalter rechts lose – Teil bestellt'})==200 and cmd(a,c1,'record_work',{'hours':1,'description':'Leuchte getauscht'})==200
        ok1=ok1 and api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':c1,'request_key':f'rh-i-{R}-{n}','items':items})['s']==201
        ok1=ok1 and cmd(a,c1,'request_quality_check',{},'fertig')==200 and cmd(a,c1,'technical_release',{'confirm':True},'Kontrolle ok')==200
        check(ok1,f'{lang}/{w}: Vorgang mit Restarbeit freigegeben')
        c1no=api('GET',f'/api/cases/{c1}')['d']['case']['case_no']
        c2=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts wackelt bei Fahrt','priority':'niedrig','driveability':'fahrbereit','request_key':f'rh-{R}-{n}-b'})['d']['id']
        check(cmd(a,c2,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel prüfen')==200 and cmd(a,c2,'start_repair')==200,f'{lang}/{w}: neuer Auftrag in Reparatur')
        c2no=api('GET',f'/api/cases/{c2}')['d']['case']['case_no']
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qw=login(ctx,f'rh.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        T=qw.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { btn: S.rri_btn, hint: S.rri_hint, din: S.rri_done_in, ev: S.rri_ev, act: S.act_resolve_released_item }; }", lang)
        qw.goto(B+f'/#/cases/{c2}'); qw.reload(); qw.wait_for_selector('[data-virelitems] [data-relres]',timeout=15000)
        b=qw.locator('[data-virelitems] [data-relres]')
        check(b.count()==1 and b.inner_text().strip()==T['btn'],f'{lang}/{w}: Knopf „{T["btn"]}“')
        check(qw.locator('button[data-act=resolve_released_item]').count()==0,f'{lang}/{w}: nicht unter den Hauptknöpfen')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: qw.locator('[data-virelitems]').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/restarbeit-hier-knopf-{lang}-{w}.png')
        b.click(); qw.wait_for_selector('#af [data-rrihint]',timeout=10000)
        hint=qw.locator('#af [data-rrihint]').inner_text()
        check('Spiegelhalter rechts lose' in hint and T['hint'].replace('{v}',c1no) in hint,f'{lang}/{w}: Formular nennt Restarbeit und Vorgang {c1no}')
        if SHOTS: qw.locator('#af').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/restarbeit-hier-formular-{lang}-{w}.png')
        qw.fill('#af [name=note]','Halter neu verschraubt (Test)'); qw.locator('#af .actions button.btn:not(.secondary)').click()
        qw.wait_for_selector('[data-relres]',state='detached',timeout=15000)
        check(qw.locator('[data-relres]').count()==0,f'{lang}/{w}: Restarbeit nicht mehr genannt')
        tl=qw.locator('ol.timeline').inner_text()
        check(T['ev'].replace('{v}',c1no).replace('{d}','Spiegelhalter rechts lose – Teil bestellt') in tl,f'{lang}/{w}: Verlauf im Auftrag')
        qw.goto(B+f'/#/cases/{c1}'); qw.reload(); qw.wait_for_selector('ol.timeline',timeout=15000)
        app=qw.locator('#app').inner_text()
        check(T['din'].replace('{v}',c2no)+': Halter neu verschraubt (Test)' in app,f'{lang}/{w}: alter Vorgang „{T["din"].replace("{v}",c2no)}“')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: alter Vorgang ohne Querscrollen')
        if SHOTS: qw.screenshot(path=f'{SHOTS}/restarbeit-hier-alt-{lang}-{w}.png',full_page=True)
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
