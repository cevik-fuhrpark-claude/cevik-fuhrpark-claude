# [CLAUDE] UI-Test (13.11.2026, Backlog 1440, Blickwinkel „Werkstatt trägt nachträglich einen Termin in der Vergangenheit ein – gemeint war die
# Durchführung oder das Jahr ist vertippt“): Fahrzeugakte → „Termin planen“ mit Datum vor heute zeigt am Feld einen Warnhinweis, ein künftiges Datum
# nicht; nach dem Speichern meldet die App „liegt in der Vergangenheit … Erledigt eintragen“. Werkstattkonto, DE/UK/EN 390/820/1366 px.
# Backlog 1441: Vorgang → „Termin setzen/verschieben“ mit Datum vor heute: Hinweis am Feld, Rückfrage (Abbrechen speichert nichts, OK speichert). Inhaber.
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
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'; me_un=(me.get('user') or me).get('username')
    R=os.getpid()%100000; n=0
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'TV-T {R%900}{n}'; vin=f'WTV{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Feuerlöscher','last_done_date':iso(-30),'interval_months':24,'evidence':'Prüfplakette (Test)'})
        check(r['s']==201,f'{lang}/{w}: Feuerlöscher angelegt'); rid=r['d']['id']
        un=f'tv.ws{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'TV Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(u['s'] in (200,201),f'{lang}/{w}: Werkstattkonto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { m: S.STRINGS[l].plan_past_maint, s: S.STRINGS[l].plan_past_saved }; }", lang)
        q.goto(B+'/#/vehicles/'+vid.replace(':','%3A')); q.reload()
        fm=q.locator(f'form[data-hsplan="{rid}"]')
        fm.wait_for(state='attached',timeout=20000)
        fm.locator('xpath=ancestor::details[1]/summary').click()
        inp=fm.locator('input[name=planned_date]'); hint=fm.locator('[data-pastplan]')
        check(hint.count()==1 and hint.is_hidden(),f'{lang}/{w}: ohne Eingabe kein Hinweis')
        inp.fill(iso(1)); check(hint.is_hidden(),f'{lang}/{w}: morgen → kein Hinweis')
        inp.fill(iso(-1))
        d=iso(-1)
        check(hint.is_visible() and T['m'].split('{d}')[1][:25] in hint.inner_text() and (f'{d[8:10]}.{d[5:7]}.' in hint.inner_text() or f'{d[8:10]}/{d[5:7]}/' in hint.inner_text()),f'{lang}/{w}: gestern → Hinweis mit Datum')
        if SHOTS: inp.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-vergangenheit-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        fm.locator('button').click()
        q.wait_for_selector('.toast.err',timeout=15000)
        tt=q.locator('.toast.err').last.inner_text()
        check(T['s'].split('{d}')[1][:25] in tt,f'{lang}/{w}: Meldung nach dem Speichern „{tt[:50]}…“')
        rows=api('GET','/api/maintenance')['d']['rows']
        check(any(x['id']==rid and x.get('planned_date')==d for x in rows),f'{lang}/{w}: Termin gespeichert')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        # Backlog 1441: Werkstatttermin am Vorgang (Inhaber)
        import uuid
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':'Kupplung rutscht (Test 1441)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        ver=lambda: api('GET',f'/api/cases/{cid}')['d']['case']['version']
        cmd=lambda a,pl=None,nt=None: api('POST',f'/api/cases/{cid}/commands',{'action':a,'command_id':str(uuid.uuid4()),'expected_version':ver(),'payload':pl or {},**({'note':nt} if nt else {})})['s']
        check(cmd('approve_repair',{'workshop_site':'DORTMUND'},'Kupplung prüfen')==200 and cmd('acknowledge',{'planned_date':iso(2)})==200,f'{lang}/{w}: Vorgang freigegeben + übernommen (Termin in 2 Tagen)')
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/login',{'username':me_un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { c: S.STRINGS[l].plan_past_case, q: S.STRINGS[l].plan_past_confirm }; }", lang)
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="set_planned_date"]',timeout=20000)
        q.locator('button[data-act="set_planned_date"]').click(); q.wait_for_selector('#af input[name=planned_date]',timeout=5000)
        hint=q.locator('#af [data-pastplan]')
        check(hint.count()==1 and hint.is_hidden(),f'{lang}/{w}: Vorgang – alter Termin ohne Hinweis')
        q.fill('#af input[name=planned_date]',iso(-1))
        check(hint.is_visible() and T['c'].split('{d}')[1][:25] in hint.inner_text(),f'{lang}/{w}: Vorgang – Hinweis am Feld')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-vergangenheit-vorgang-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        msgs=[]
        def dlg(dd, accept):
            msgs.append(dd.message); (dd.accept() if accept else dd.dismiss())
        q.once('dialog',lambda dd: dlg(dd,False)); q.click('#af button.btn:not(.secondary)'); q.wait_for_timeout(1500)
        check(msgs and T['q'].split('{d}')[1][:25] in msgs[0],f'{lang}/{w}: Rückfrage „{(msgs or [""])[0][:50]}…“')
        check(api('GET',f'/api/cases/{cid}')['d']['case']['planned_date']==iso(2),f'{lang}/{w}: Abbrechen speichert nichts')
        q.once('dialog',lambda dd: dlg(dd,True)); q.click('#af button.btn:not(.secondary)'); q.wait_for_timeout(2500)
        check(api('GET',f'/api/cases/{cid}')['d']['case']['planned_date']==iso(-1),f'{lang}/{w}: OK speichert')
        check(not errs,f'{lang}/{w}: Vorgang keine Skriptfehler {errs[:2]}')
        ctx.close()
        api('POST',f'/api/maintenance/{rid}/complete',{'done_date':iso(-1),'evidence':'Prüfplakette (Test 2)'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
