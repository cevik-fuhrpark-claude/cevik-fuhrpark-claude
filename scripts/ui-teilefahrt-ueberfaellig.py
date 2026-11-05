# [CLAUDE] UI-Test (05.11.2026, Backlog 1035, Blickwinkel „Disposition plant einen Lkw, dessen Teillieferung überfällig ist“):
# Fahrzeug „fährt bis zur Teilelieferung“ – Liefertermin überschritten bzw. heute → Disposition sieht in der Zeile „Termin überschritten“/„heute“
# mit Warnhinweis und in der Überschrift „Liefertermin erreicht: N“. Vergangene Liefertermine per /__dev/backdate?parts_days=N (nur Dev-Server).
# Backlog 1036: Fahrer des Lkw sieht „Liefertermin der Teile erreicht“ (ohne Datum). Backlog 1037: Werkstatt sieht „Unterwegs bis zur Teilelieferung: N“. DE/UK/EN bei 390/820/1366 px.
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
    def newcase(tag, back):
        pl=f'TU-{tag} {R%900}{n}'; vin=f'WTU{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Luftbalg undicht {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'tu-{R}-{n}-{tag}'})
        cid=c['d']['id']
        eta=(datetime.date.today()+datetime.timedelta(days=3)).isoformat()
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Luftbalg tauschen')==200 and cmd(cid,'start_repair')==200 and cmd(cid,'wait_parts',{'parts_expected_date':eta},'Luftbalg bestellt')==200,f'{tag}: wartet auf Teile')
        check(cmd(cid,'set_parts_drive',{'on':True},'nur Nahverkehr')==200,f'{tag}: fährt bis zur Teilelieferung')
        r=api('POST',f'/__dev/backdate?case={cid}&parts_days={back}')
        check(r['s']==200,f'{tag}: Liefertermin zurückdatiert')
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ud=api('POST','/api/users',{'username':f'tu.d{R}.{n}','display_name':f'TU Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(ud['s'] in (200,201),f'{lang}/{w}: Konto')
        late=newcase('L',5); today=newcase('H',3)
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':ud['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'tu.d{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { passed: S.parts_eta_passed, late: S.dispo_pdrive_late, due: S.dispo_pdrive_due, today: S.dispo_pdrive_today, n: S.dispo_pdrive_n }; }", lang)
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector(f'a[data-dpdr][href="#/cases/{late}"]',timeout=20000)
        rl=q.locator(f'a[data-dpdr][href="#/cases/{late}"]').inner_text()
        check(T['passed'] in rl and T['late'] in rl,f'{lang}/{w}: überschritten – „{T["passed"]}“ + Warnhinweis')
        check(T['today'] not in q.locator(f'a[data-dpdr][href="#/cases/{late}"] [data-dpdreta]').evaluate("e => [...e.querySelectorAll('[data-dpdrtoday]')].map(x=>x.textContent).join('')"),f'{lang}/{w}: überschritten ohne „heute“')
        rh=q.locator(f'a[data-dpdr][href="#/cases/{today}"]').inner_text()
        check(T['today'] in rh and T['due'] in rh and T['passed'] not in rh,f'{lang}/{w}: heute – „{T["today"]}“ + Hinweis')
        hd=q.locator('#dpdrive [data-dpdrlaten]').inner_text()
        prefix=T['n'].split('{n}')[0]
        check(hd.startswith(prefix) and int(hd[len(prefix):].strip())>=2,f'{lang}/{w}: Überschrift „{hd}“')
        # überschrittene vor heutigen (Sortierung nach Liefertermin)
        order=q.evaluate("([a,b]) => { const r=[...document.querySelectorAll('#dpdrive ~ .list a[data-dpdr]')].map(x=>x.getAttribute('href')); return r.indexOf('#/cases/'+a) < r.indexOf('#/cases/'+b); }",[late,today])
        check(order,f'{lang}/{w}: überschritten vor heute')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#dpdrive').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teilefahrt-ueberfaellig-{lang}-{w}.png')
        # Backlog 1036: Fahrer des Lkw sieht „Liefertermin erreicht“ ohne Datum
        uf=api('POST','/api/users',{'username':f'tu.f{R}.{n}','display_name':f'TU Fahrer {n}','role':'driver','environment':envn,'language':lang})
        vid=api('GET',f'/api/cases/{late}')['d']['case']['vehicle_id']
        check(api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uf['d']['id'],'evidence':'UI-Test 1036'})['s'] in (200,201),f'{lang}/{w}: Fahrer zugeordnet')
        ctx3=br.new_context(viewport={'width':w,'height':h}); qf=ctx3.new_page(); qf.on('pageerror',lambda e: errs.append(str(e))); qf.goto(B)
        qf.evaluate(JS,['POST','/api/invite/accept',{'token':uf['d']['invite_token'],'password':PW}])
        qf.evaluate(JS,['POST','/api/login',{'username':f'tu.f{R}.{n}','password':PW}]); qf.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        KD=qf.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].kd_pdr_reached", lang)
        qf.goto(B+'/#/'); qf.reload(); qf.wait_for_selector('[data-kdpdrlate]',state='attached',timeout=20000)
        qf.evaluate("() => document.querySelectorAll('details').forEach((d) => { if (d.querySelector('[data-kdpdrlate]')) d.open = true; })")
        lt=qf.locator('[data-kdpdrlate]').first.inner_text()
        check(KD in lt,f'{lang}/{w}: Fahrer – „{KD[:30]}…“')
        li=qf.locator('[data-kdpdrlate]').first.evaluate("e => e.closest('li').textContent")
        PE=qf.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].parts_eta", lang)
        check(PE not in li,f'{lang}/{w}: Fahrer ohne überschrittenes Datum')
        check(qf.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Fahrer ohne Querscrollen')
        if SHOTS: qf.locator('[data-kdpdrlate]').first.scroll_into_view_if_needed(); qf.screenshot(path=f'{SHOTS}/teilefahrt-ueberfaellig-fahrer-{lang}-{w}.png')
        ctx3.close()
        # Backlog 1037: Werkstatt sieht über „Teile heute/überfällig“ den Hinweis, dass Fahrzeuge unterwegs sind
        uw=api('POST','/api/users',{'username':f'tu.w{R}.{n}','display_name':f'TU Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        ctx4=br.new_context(viewport={'width':w,'height':h}); qw=ctx4.new_page(); qw.on('pageerror',lambda e: errs.append(str(e))); qw.goto(B)
        qw.evaluate(JS,['POST','/api/invite/accept',{'token':uw['d']['invite_token'],'password':PW}])
        qw.evaluate(JS,['POST','/api/login',{'username':f'tu.w{R}.{n}','password':PW}]); qw.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        WT=qw.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { due: S.ws_pdr_due, hint: S.ws_pdr_due_hint }; }", lang)
        qw.goto(B+'/#/'); qw.reload(); qw.wait_for_selector('[data-wspdr]',timeout=20000)
        wt=qw.locator('[data-wspdr]').inner_text(); pre=WT['due'].split('{n}')[0]
        check(pre in wt and WT['hint'] in wt,f'{lang}/{w}: Werkstatt – „{wt[:50]}…“')
        check(int(wt.split(pre)[1].split(' ')[0].strip(' –'))>=2,f'{lang}/{w}: Werkstatt zählt beide Fahrzeuge')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Werkstatt ohne Querscrollen')
        if SHOTS: qw.locator('[data-wspdr]').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/teilefahrt-ueberfaellig-werkstatt-{lang}-{w}.png')
        ctx4.close()
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        for cid in (late,today): cmd(cid,'set_parts_drive',{'on':False})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
