# [CLAUDE] UI-Test (05.11.2026, Backlog 1038, Blickwinkel „Lieferant nennt neuen Liefertermin, der Lkw fährt bis zur Teilelieferung“):
# Formulare „Liefertermin ändern“ und „Teillieferung eingegangen“ zeigen bei „fährt bis zur Teilelieferung“ den Hinweis, dass die Disposition den
# geänderten Termin erfährt (#etapdr); ohne Vermerk kein Hinweis. Absenden über die Oberfläche → Disposition hat den Hinweis „Liefertermin der
# Teile geändert“ in ihrer Sprache und sieht ihn in der Hinweisliste. DE/UK/EN bei 390/820/1366 px.
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
    check(api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    d=lambda k: (datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'le-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def newcase(tag, drive):
        pl=f'TU-{tag} {R%900}{n}'; vin=f'WLE{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Luftbalg undicht {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'le-{R}-{n}-{tag}'})['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Luftbalg tauschen')==200 and cmd(cid,'start_repair')==200 and cmd(cid,'wait_parts',{'parts_expected_date':d(5)},'Luftbalg bestellt')==200,f'{tag}: wartet auf Teile')
        if drive: check(cmd(cid,'set_parts_drive',{'on':True},'nur Nahverkehr')==200,f'{tag}: fährt bis zur Teilelieferung')
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ud=api('POST','/api/users',{'username':f'le.d{R}.{n}','display_name':f'LE Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(ud['s'] in (200,201),f'{lang}/{w}: Konto Disposition')
        # Konto vorher aktivieren (Hinweise gehen nur an aktive Konten)
        ctx2=br.new_context(viewport={'width':w,'height':h}); qd=ctx2.new_page(); errs2=[]; qd.on('pageerror',lambda e: errs2.append(str(e))); qd.goto(B)
        qd.evaluate(JS,['POST','/api/invite/accept',{'token':ud['d']['invite_token'],'password':PW}])
        drv=newcase('F',True); still=newcase('S',False)
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/login',{'username':'tu.inhaber','password':PW}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { hint: S.eta_pdr_hint, pk: S.pk_parts_eta_changed }; }", lang)
        # ohne Vermerk: kein Hinweis
        q.goto(B+'/#/cases/'+still); q.reload(); q.wait_for_selector('button[data-act="set_parts_eta"]',timeout=20000)
        q.locator('button[data-act="set_parts_eta"]').first.click(); q.wait_for_selector('#af input[name="parts_expected_date"]',timeout=10000)
        check(q.locator('#etapdr').count()==0,f'{lang}/{w}: ohne Vermerk kein Hinweis')
        # mit Vermerk: Hinweis in „Liefertermin ändern“, Absenden
        q.goto(B+'/#/cases/'+drv); q.reload(); q.wait_for_selector('button[data-act="set_parts_eta"]',timeout=20000)
        q.locator('button[data-act="set_parts_eta"]').first.click(); q.wait_for_selector('#etapdr',timeout=10000)
        check(T['hint'] in q.locator('#etapdr').inner_text(),f'{lang}/{w}: Hinweis „{T["hint"][:30]}…“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#etapdr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/liefertermin-teilefahrt-{lang}-{w}.png')
        q.fill('#af input[name="parts_expected_date"]',d(2)); q.locator('#af button.btn:not(.secondary)').first.click()
        q.wait_for_function(f"async () => (await (await fetch('/api/cases/{drv}')).json()).case.parts_expected_date === '{d(2)}'",timeout=15000)
        # Teillieferung: Hinweis ebenfalls
        q.goto(B+'/#/cases/'+drv); q.reload(); q.wait_for_selector('button[data-act="parts_partial"]',timeout=20000)
        q.locator('button[data-act="parts_partial"]').first.click(); q.wait_for_selector('#pphint',timeout=10000)
        check(q.locator('#etapdr').count()==1,f'{lang}/{w}: Hinweis auch bei Teillieferung')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        # Disposition sieht den Hinweis in ihrer Sprache
        qd.evaluate(JS,['POST','/api/login',{'username':f'le.d{R}.{n}','password':PW}])
        nl=qd.evaluate(JS,['GET','/api/notifications'])['d']['notifications']
        mine=[x for x in nl if x['kind']=='parts_eta_changed' and x.get('case_id')==drv]
        check(len(mine)==1 and mine[0]['title']==T['pk'],f'{lang}/{w}: Disposition – „{T["pk"]}“')
        check(len([x for x in nl if x['kind']=='parts_eta_changed' and x.get('case_id')==still])==0,f'{lang}/{w}: ohne Vermerk kein Hinweis an Disposition')
        qd.goto(B+'/#/inbox'); qd.reload(); qd.wait_for_timeout(1500)
        check(T['pk'] in qd.locator('#app').inner_text(),f'{lang}/{w}: Hinweisliste zeigt den Titel')
        check(not errs2,f'{lang}/{w}: Disposition ohne Skriptfehler {errs2[:2]}')
        ctx2.close()
    br.close()
print(f"\n{'ALLE GRÜN' if not fails else str(len(fails))+' FEHLER'}")
if fails: raise SystemExit(1)
