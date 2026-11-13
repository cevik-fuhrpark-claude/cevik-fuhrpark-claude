# [CLAUDE] UI-Test (13.11.2026, Backlog 1427, Blickwinkel „Disposition sieht am Montag, welche Lkw diese Woche wegen Teilelieferung zurückkommen“):
# Abschnitt „Fährt bis zur Teilelieferung“ zeigt den Rückkehrtermin der Werkstatt (mit Hinweis) bzw. „Rückkehrtermin noch nicht vereinbart“,
# sortiert nach Rückkehr, Zähler „Rückkehr diese Woche“. DE/UK/EN bei 390/820/1366 px.
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
        b={'action':action,'command_id':f'tu-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def newcase(tag, eta_days, plan_days=None):
        pl=f'TU-{tag} {R%900}{n}'; vin=f'WTU{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Luftbalg undicht {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'tu-{R}-{n}-{tag}'})
        cid=c['d']['id']
        eta=(datetime.date.today()+datetime.timedelta(days=eta_days)).isoformat()
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Luftbalg tauschen')==200 and cmd(cid,'start_repair')==200 and cmd(cid,'wait_parts',{'parts_expected_date':eta},'Luftbalg bestellt')==200,f'{tag}: wartet auf Teile')
        check(cmd(cid,'set_parts_drive',{'on':True},'nur Nahverkehr')==200,f'{tag}: fährt bis zur Teilelieferung')
        if plan_days is not None: check(cmd(cid,'set_planned_date',{'planned_date':(datetime.date.today()+datetime.timedelta(days=plan_days)).isoformat(),'planned_note':'nur vormittags'})==200,f'{tag}: Rückkehrtermin')
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ud=api('POST','/api/users',{'username':f'tu.r{R}.{n}','display_name':f'TU Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(ud['s'] in (200,201),f'{lang}/{w}: Konto')
        withplan=newcase('P',3,1); noplan=newcase('N',2)
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':ud['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'tu.r{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { back: S.dispo_pdrive_back, noplan: S.dispo_pdrive_noplan, week: S.dispo_pdrive_week }; }", lang)
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector(f'a[data-dpdr][href="#/cases/{withplan}"]',timeout=20000)
        rp=q.locator(f'a[data-dpdr][href="#/cases/{withplan}"]')
        check(rp.locator('[data-dpdrplan]').count()==1 and T['back'].split('{d}')[0] in rp.inner_text(),f'{lang}/{w}: Rückkehrtermin in der Zeile')
        check('nur vormittags' in rp.inner_text(),f'{lang}/{w}: Hinweis zum Termin')
        check(rp.locator('[data-dpdrnoplan]').count()==0,f'{lang}/{w}: mit Termin kein „nicht vereinbart“')
        rn=q.locator(f'a[data-dpdr][href="#/cases/{noplan}"]')
        check(rn.locator('[data-dpdrnoplan]').count()==1 and T['noplan'] in rn.inner_text(),f'{lang}/{w}: „{T["noplan"][:30]}…“')
        # Sortierung nach Rückkehr: Termin in 1 Tag vor Liefertermin in 2 Tagen (obwohl Liefertermin des ersten später)
        order=q.evaluate("([a,b]) => { const r=[...document.querySelectorAll('#dpdrive ~ .list a[data-dpdr]')].map(x=>x.getAttribute('href')); return r.indexOf('#/cases/'+a) < r.indexOf('#/cases/'+b); }",[withplan,noplan])
        check(order,f'{lang}/{w}: sortiert nach Rückkehr')
        # Zähler „Rückkehr diese Woche“: Erwartung aus der Woche (Mo–So) von heute
        td=datetime.date.today(); wk_end=td+datetime.timedelta(days=6-td.weekday())
        exp_in=sum(1 for d in (1,2) if td+datetime.timedelta(days=d)<=wk_end)
        wc=q.locator('#dpdrive [data-dpdrweek]')
        if exp_in: check(wc.count()==1 and wc.inner_text().startswith(T['week'].split('{n}')[0]),f'{lang}/{w}: Zähler „{wc.inner_text() if wc.count() else "-"}“')
        else: check(True,f'{lang}/{w}: Zähler (heute ohne Rückkehr in dieser Woche nicht prüfbar)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#dpdrive').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teilefahrt-rueckkehr-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        for cid in (withplan,noplan): cmd(cid,'set_parts_drive',{'on':False})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
