# [CLAUDE] UI-Test (13.11.2026, Backlog 1429, Blickwinkel „Rückkehrtermin verpasst: Lkw fährt bis zur Teilelieferung und kam am vereinbarten
# Tag nicht in die Werkstatt“): Disposition sieht „⚠ Rückkehrtermin … überschritten“ statt „noch nicht vereinbart“, Werkstatt-Startseite eigener
# Abschnitt mit Hinweis, Werkstattplan führt den Auftrag unter „Termin überschritten“ mit 🚚-Vermerk. DE/UK/EN bei 390/820/1366 px.
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
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'rv-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'RV-M {R%900}{n}'; vin=f'WRV{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Luftbalg undicht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'rv-{R}-{n}'})['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Luftbalg tauschen')==200 and cmd(cid,'start_repair')==200 and cmd(cid,'wait_parts',{'parts_expected_date':iso(1)},'Luftbalg bestellt')==200,'wartet auf Teile')
        check(cmd(cid,'set_parts_drive',{'on':True},'nur Nahverkehr')==200,'fährt bis zur Teilelieferung')
        check(cmd(cid,'set_planned_date',{'planned_date':iso(-2),'planned_note':'7 Uhr Halle 2'})==200,'Rückkehrtermin vorgestern')
        users={}
        for role,extra in [('dispatch',{}),('workshop',{'workshop_site':'DORTMUND'})]:
            u=api('POST','/api/users',{'username':f'rv.{role[:2]}{R}.{n}','display_name':f'RV {role} {n}','role':role,'environment':envn,'language':lang,**extra})
            check(u['s'] in (200,201),f'{lang}/{w}: Konto {role}'); users[role]=u['d']['invite_token']
        for role in ['dispatch','workshop']:
            ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
            q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
            q.evaluate(JS,['POST','/api/invite/accept',{'token':users[role],'password':PW}])
            q.evaluate(JS,['POST','/api/login',{'username':f'rv.{role[:2]}{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            T=q.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { missed: S.dispo_pdrive_missed, noplan: S.dispo_pdrive_noplan, lane: S.ws_pdr_missed, hint: S.ws_pdr_missed_hint, wp: S.wplan_pdr, over: S.wplan_overdue }; }", lang)
            q.goto(B+'/#/'); q.reload()
            if role=='dispatch':
                q.wait_for_selector(f'a[data-dpdr][href="#/cases/{cid}"]',timeout=20000)
                r=q.locator(f'a[data-dpdr][href="#/cases/{cid}"]')
                check(r.locator('[data-dpdrmissed]').count()==1 and T['missed'].split('{d}')[0] in r.inner_text(),f'{lang}/{w} Dispo: „{T["missed"][:40]}…“')
                check(r.locator('[data-dpdrnoplan]').count()==0,f'{lang}/{w} Dispo: nicht „{T["noplan"][:30]}…“')
                first=q.evaluate("() => { const x=document.querySelector('#dpdrive ~ .list a[data-dpdr]'); return x && x.getAttribute('href'); }")
                check(first==f'#/cases/{cid}',f'{lang}/{w} Dispo: verpasster Termin zuerst ({first})')
                if SHOTS: r.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rueckkehr-verpasst-dispo-{lang}-{w}.png')
            else:
                q.wait_for_selector('#wspdrmiss',timeout=20000)
                check(T['hint'][:40] in q.locator('#wspdrmiss').inner_text(),f'{lang}/{w} Werkstatt: Hinweis')
                hd=q.locator('h2',has_text=T['lane'][:25])
                check(hd.count()>=1,f'{lang}/{w} Werkstatt: Abschnitt „{T["lane"][:30]}…“')
                check(q.locator(f'#wspdrmiss ~ .list a[href="#/cases/{cid}"]').count()>=1 or q.locator(f'a[href="#/cases/{cid}"]').count()>=1,f'{lang}/{w} Werkstatt: Auftrag verlinkt')
                if SHOTS: q.locator('#wspdrmiss').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rueckkehr-verpasst-ws-{lang}-{w}.png')
                q.goto(B+'/#/plan'); q.wait_for_selector('[data-wppdr]',timeout=20000)
                row=q.locator(f'a[href="#/cases/{cid}"]',has=q.locator('[data-wppdr]'))
                check(row.count()>=1 and T['wp'][:20] in row.first.inner_text(),f'{lang}/{w} Plan: 🚚-Vermerk „{T["wp"][:30]}…“')
                check(q.evaluate("(id) => { const a=document.querySelector(`a[href=\"#/cases/${id}\"] [data-wppdr]`); if(!a) return false; let el=a.closest('.list'); let h=el && el.previousElementSibling; while(h && h.tagName!=='H2') h=h.previousElementSibling; return !!h && h.id!=='wp-inwork'; }", cid),f'{lang}/{w} Plan: nicht unter „in Arbeit“')
                if SHOTS: row.first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rueckkehr-verpasst-plan-{lang}-{w}.png')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w} {role}: ohne Querscrollen')
            check(not errs,f'{lang}/{w} {role}: keine Skriptfehler {errs[:2]}')
            ctx.close()
        cmd(cid,'set_parts_drive',{'on':False})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
