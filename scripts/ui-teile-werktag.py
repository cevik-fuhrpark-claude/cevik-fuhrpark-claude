# [CLAUDE] UI-Test (13.11.2026, Backlog 1428, Blickwinkel „Werkstatt sieht am Freitag, welche Teile nächste Woche kommen und welche Lkw dafür zurück müssen“):
# Abschnitt „Teile … erwartet“ der Werkstatt-Startseite reicht bis zum nächsten Werktag (freitags also bis Montag), die Überschrift nennt
# dann den Tag; Fahrzeuge, die bis zur Lieferung fahren, ohne Rückkehrtermin werden gezählt. DE/UK/EN bei 390/820/1366 px.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tw.inhaber','display_name':'TW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tw.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['tu.inhaber','pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    # heute (Berlin) und nächster Werktag wie in der App (Sa/So und bundesweite Feiertage übersprungen)
    today=a.evaluate("() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())")
    hol=lambda d: a.evaluate("async (d) => !!(await import('/holidays.js')).federalHoliday(d)", d)
    d=datetime.date.fromisoformat(today)
    while True:
        d+=datetime.timedelta(days=1)
        if d.weekday()<5 and not hol(d.isoformat()): break
    nwd=d.isoformat(); after=(d+datetime.timedelta(days=1)).isoformat(); tomorrow=(datetime.date.fromisoformat(today)+datetime.timedelta(days=1)).isoformat()
    print(f'  heute {today}, nächster Werktag {nwd}' + (' (nicht morgen – Freitags-/Feiertagsfall)' if nwd!=tomorrow else ''))
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'tw-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def newcase(tag, eta, drive):
        pl=f'TW-{tag} {R%900}{n}'; vin=f'WTW{tag}{R:05d}{n:04d}000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Bremsscheibe hinten {tag} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'tw-{R}-{n}-{tag}'})
        cid=c['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Bremsscheibe tauschen')==200 and cmd(cid,'start_repair')==200 and cmd(cid,'wait_parts',{'parts_expected_date':eta},'Bremsscheibe bestellt')==200,f'{tag}: wartet auf Teile ({eta})')
        if drive: check(cmd(cid,'set_parts_drive',{'on':True},'nur Nahverkehr')==200,f'{tag}: fährt bis zur Teilelieferung')
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        u=api('POST','/api/users',{'username':f'tw.ws{R}.{n}','display_name':f'TW Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Konto')
        due=newcase('D',nwd,True); later=newcase('L',after,False)
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'tw.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')).STRINGS[l]; return { wd: S.ws_parts_due_wd, due: S.ws_parts_due, noplan: S.ws_pdr_noplan }; }", lang)
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-wspdr]',timeout=20000)
        cd=q.locator(f'a[href="#/cases/{due}"]').count(); cl=q.locator(f'a[href="#/cases/{later}"]').count()
        check(cd==cl+1,f'{lang}/{w}: Lieferung am nächsten Werktag oben hervorgehoben, danach nicht ({cd}/{cl})')
        heads=q.locator('h2').all_inner_texts()
        if nwd!=tomorrow: check(any(T['wd'].split('{d}')[0] in x for x in heads),f'{lang}/{w}: Überschrift „{T["wd"].split("{d}")[0]}…“ mit Tag')
        else: check(any(T['due'] in x for x in heads),f'{lang}/{w}: Überschrift „{T["due"][:30]}…“')
        nc=q.locator('[data-wspdrnoplan]')
        check(nc.count()==1 and T['noplan'].split('{n}')[0] in nc.inner_text(),f'{lang}/{w}: Zähler „Rückkehrtermin noch nicht vereinbart“')
        # Rückkehrtermin setzen → Zähler verschwindet (sofern kein anderer Lkw ohne Termin)
        api('POST',f'/api/cases/{due}/commands',{'action':'set_planned_date','command_id':f'tw-pl-{R}-{n}','expected_version':api('GET',f'/api/cases/{due}')['d']['case']['version'],'payload':{'planned_date':nwd}})
        q.reload(); q.wait_for_selector('[data-wspdr]',timeout=20000)
        others=q.evaluate("() => document.querySelector('[data-wspdrnoplan]')?.textContent || ''")
        check(not others or T['noplan'].split('{n}')[0] in others,f'{lang}/{w}: nach Termin nur noch andere ohne Termin gezählt')
        sw=q.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1")
        check(sw,f'{lang}/{w}: keine waagerechte Scrollleiste')
        if SHOTS: q.locator('[data-wspdr]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teile-werktag-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine JS-Fehler {errs[:1]}')
        # aufräumen: Fahrzeuge des Tests nicht in späteren Durchläufen zählen
        for cid in (due,later): cmd(cid,'resume_repair',None,'Teile da (Test)')
        ctx.close()
    br.close()
print('UI-Test Teile bis zum nächsten Werktag:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
