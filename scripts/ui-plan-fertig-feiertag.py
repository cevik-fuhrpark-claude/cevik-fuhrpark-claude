# [CLAUDE] UI-Test (02.11.2026, Backlog 890, Blickwinkel „Werkstatt-Betriebsruhe zwischen den Jahren“):
# Werkstatt trägt „Voraussichtlich fertig“ auf den 25.12. ein → Formular nennt den Feiertag (nur Hinweis); der Werkstattplan zeigt
# „Voraussichtlich fertig“ beim Auftrag. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
# nächster 25.12., der nicht in der Vergangenheit und höchstens ein Jahr entfernt liegt
xmas=datetime.date(today.year,12,25)
if xmas<today: xmas=datetime.date(today.year+1,12,25)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pf.inhaber','display_name':'PF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'pf.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['vf.inhaber','dw.inhaber','ub.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'pf-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'pf.w{R}.{n}','display_name':f'PF Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        ud=api('POST','/api/users',{'username':f'pf.f{R}.{n}','display_name':f'PF Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(uw['s'] in (200,201) and ud['s'] in (200,201),f'{lang}/{w}: Konten')
        pl=f'PF-A {R%900}{n}'; vin=f'WPF{R:05d}{n:04d}0000000'[:17]
        vr=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(vr['s']==201,f'Lkw {pl}')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qd=login(ctx,f'pf.f{R}.{n}',lang,ud['d']['invite_token'])
        cr=qd.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Lichtmaschine lädt nicht {n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'pf-{R}-{n}'}])
        check(cr['s'] in (200,201),f'{lang}/{w}: Fahrer meldet'); cid=cr['d']['id']
        qd.close(); ctx.clear_cookies()
        qw=login(ctx,f'pf.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        pd=(today+datetime.timedelta(days=2)).isoformat()
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Lichtmaschine')==200 and cmd(qw,cid,'acknowledge',{'planned_date':pd})==200,f'{lang}/{w}: übernommen mit Termin')
        T=qw.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { h: S.hol_weihnacht1, t: S.rdy_title }; }", lang)
        qw.goto(B+f'/#/cases/{cid}'); qw.reload()
        qw.wait_for_selector('button[data-act="set_ready_date"]',timeout=20000)
        qw.click('button[data-act="set_ready_date"]'); qw.wait_for_selector('#rdyd',timeout=10000)
        qw.fill('#rdyd',xmas.isoformat()); qw.dispatch_event('#rdyd','change')
        hint=qw.locator('#af [data-offday]')
        check(hint.count()==1 and hint.is_visible() and T['h'] in hint.inner_text(),f'{lang}/{w}: Formular nennt „{T["h"]}“')
        if SHOTS: qw.locator('#af').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/plan-fertig-formular-{lang}-{w}.png')
        qw.click('#af button.btn:not(.secondary)')
        qw.wait_for_selector('#rdy',timeout=15000)
        qw.goto(B+'/#/plan'); qw.wait_for_selector(f'a.row[href="#/cases/{cid}"]',timeout=20000)
        y=qw.locator(f'a.row[href="#/cases/{cid}"] [data-wprdy]')
        check(y.count()==1 and T['t'] in y.inner_text() and xmas.strftime('%d') in y.inner_text(),f'{lang}/{w}: Werkstattplan zeigt „{T["t"]}“')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Werkstattplan ohne Querscrollen')
        if SHOTS: qw.locator(f'a.row[href="#/cases/{cid}"]').first.scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/plan-fertig-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: ohne Skriptfehler {errs[:2]}')
        qw.close(); ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK')
raise SystemExit(1 if fails else 0)
