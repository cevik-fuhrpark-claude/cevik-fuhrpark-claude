# [CLAUDE] UI-Test (19.11.2026, Backlog 1592, Blickwinkel „Werkstatt hat ‚fertig ca. 21.‘ eingetragen und verschiebt den noch nicht
# begonnenen Termin auf den 25.“): Terminformular warnt beim Eintippen eines Termins nach „Voraussichtlich fertig“, der Server lehnt ab und
# markiert das Terminfeld; ein Termin am Fertig-Tag geht durch. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
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
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tf.inhaber','display_name':'TF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tf.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pf.inhaber','vf.inhaber','dw.inhaber','ub.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'tf-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def login(ctx,un,lang,tok):
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); return q
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uw=api('POST','/api/users',{'username':f'tf.w{R}.{n}','display_name':f'TF Mechaniker {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(uw['s'] in (200,201),f'{lang}/{w}: Konto')
        pl=f'TF-A {R%900}{n}'; vin=f'WTF{R:05d}{n:04d}0000000'[:17]
        vr=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(vr['s']==201,f'Lkw {pl}')
        cr=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Lichtmaschine lädt nicht {n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'tf-{R}-{n}'})
        check(cr['s'] in (200,201),f'{lang}/{w}: Meldung'); cid=cr['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        qw=login(ctx,f'tf.w{R}.{n}',lang,uw['d']['invite_token']); qw.on('pageerror',lambda e: errs.append(str(e)))
        d=lambda k:(today+datetime.timedelta(days=k)).isoformat()
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Lichtmaschine')==200 and cmd(qw,cid,'acknowledge',{'planned_date':d(2)})==200 and cmd(qw,cid,'set_ready_date',{'ready_expected_on':d(3)})==200,f'{lang}/{w}: Termin + voraussichtlich fertig')
        T=qw.evaluate("async (l) => { const m = await import('/i18n.js'); return { r: m.STRINGS[l].act_set_ready_date }; }", lang)
        qw.goto(B+f'/#/cases/{cid}'); qw.reload()
        qw.wait_for_selector('button[data-act="set_planned_date"]',timeout=20000)
        qw.click('button[data-act="set_planned_date"]'); qw.wait_for_selector('#af input[name=planned_date]',timeout=10000)
        f='#af input[name=planned_date]'
        qw.fill(f,d(5)); qw.dispatch_event(f,'change')
        hint=qw.locator('#af [data-etaplan]')
        check(hint.count()==1 and hint.is_visible() and T['r'] in hint.inner_text(),f'{lang}/{w}: Hinweis beim Eintippen nennt „{T["r"]}“')
        check(qw.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        if SHOTS: qw.locator('#af').scroll_into_view_if_needed(); qw.screenshot(path=f'{SHOTS}/termin-nach-fertig-{lang}-{w}.png')
        qw.click('#af button.btn:not(.secondary)')
        qw.wait_for_selector('#af .fielderr',timeout=15000)
        fe=qw.locator('#af .fielderr').first.inner_text()
        check(T['r'] in fe and qw.locator(f+'[aria-invalid="true"]').count()==1,f'{lang}/{w}: Server lehnt ab, Fehler am Terminfeld: {fe[:80]}')
        if SHOTS: qw.screenshot(path=f'{SHOTS}/termin-nach-fertig-fehler-{lang}-{w}.png')
        qw.fill(f,d(3)); qw.dispatch_event(f,'change')
        check(qw.locator('#af [data-etaplan]').is_hidden(),f'{lang}/{w}: am Fertig-Tag kein Hinweis')
        qw.click('#af button.btn:not(.secondary)')
        qw.wait_for_function(f"async () => (await (await fetch('/api/cases/{cid}')).json()).case.planned_date === '{d(3)}'",timeout=15000)
        check(True,f'{lang}/{w}: Termin am Fertig-Tag gespeichert')
        check(not errs,f'{lang}/{w}: ohne Skriptfehler {errs[:2]}')
        qw.close(); ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK')
raise SystemExit(1 if fails else 0)
