# [CLAUDE] UI-Test (25.10.2026, Backlog 270/278/279/280/274/275/277): Sturmnacht und Schadenaufstellung –
# Vorgangsliste Filter „Eingang nicht bestätigt“ (Reiter, gesperrte zuerst), Dateianzahl, Knopf „Nächste unbestätigte Meldung“,
# Meldeformular zeigt der Leitung offene Vorgänge des Fahrzeugs, Versicherungsfälle mit Zeitraum/Versicherer und Summen je Jahr.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NEXT={'de':'Nächste unbestätigte Meldung','uk':'Наступне непідтверджене повідомлення','en':'Next unconfirmed report'}
SUMS={'de':'Summen je Meldejahr','uk':'Суми за роком повідомлення','en':'Totals per reporting year'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sn.inhaber','display_name':'SN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    pid=os.getpid(); va=f'WDB9634031Y{pid%10000:04d}01'[:17].ljust(17,'0')
    check(api('POST','/api/vehicles',{'vin':va,'plate':'SN-AB 11','site':'Dortmund'})['s']==201,'Fahrzeug')
    ids=[]
    for desc,prio,drv in [('Plane gerissen SN1 (Test)','niedrig','fahrbereit'),('Ast auf Kabine SN2 (Test)','niedrig','nicht_fahrbereit'),('Spiegel ab SN3 (Test)','mittel','fahrbereit')]:
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':desc,'priority':prio,'driveability':drv,'request_key':str(uuid.uuid4())}); check(r['s']==201,'Meldung'); ids.append(r['d']['id'])
    today=datetime.date.today().isoformat()
    check(api('PUT',f'/api/cases/{ids[2]}/claim',{'insurer':'SN-Versicherung','reported_on':today,'evidence':'Meldung','deductible_net':'500','status':'gemeldet'})['s']==200,'Versicherungsfall')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,wd)
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sn.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases?f=unreceived'); q.reload(); q.wait_for_selector('.seg-tabs a[data-f=unreceived]',timeout=15000)
        rows=q.locator('#cl a.row').all_inner_texts()
        check(len(rows)>=3 and 'SN2' in rows[0],f'{lang} {wd}px: Reiter „Eingang nicht bestätigt“, gesperrte zuerst')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Liste ohne Querscrollen')
        q.goto(B+f'/#/cases/{ids[0]}'); q.wait_for_selector('#nextunrec',timeout=15000)
        check(NEXT[lang] in q.inner_text('#nextunrec'),f'{lang} {wd}px: Knopf nächste Meldung')
        check(q.locator('[data-ocdesc]').count()>=1,f'{lang} {wd}px: Kurzinfo mit Beschreibung')
        q.click('#nextunrec'); q.wait_for_function("(c)=>!location.hash.includes(c)",arg=ids[0],timeout=15000)
        check(True,f'{lang} {wd}px: springt weiter')
        q.goto(B+'/#/new'); q.wait_for_selector('input[name=veh]',state='attached',timeout=15000)
        q.locator(f'input[name=veh][value="VIN:{va}"]').check(force=True); q.wait_for_selector('#known details.known',timeout=15000)
        check('SN1' in q.inner_text('#known') or 'SN2' in q.inner_text('#known'),f'{lang} {wd}px: Meldeformular zeigt offene Vorgänge')
        q.goto(B+'/#/claims'); q.wait_for_selector('#clfrom',timeout=15000)
        q.click('[data-clf=alle]'); q.wait_for_selector('#clsums',timeout=15000)
        check(SUMS[lang] in q.inner_text('#clsums'),f'{lang} {wd}px: Summen je Jahr')
        q.fill('#clfrom','2000-01-01'); q.dispatch_event('#clfrom','change'); q.wait_for_selector('#clfrom',timeout=15000); q.wait_for_timeout(500)
        check(q.input_value('#clfrom')=='2000-01-01',f'{lang} {wd}px: Zeitraum gesetzt')
        check(q.locator('#cl3p').count()==1,f'{lang} {wd}px: Export für Dritte')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Versicherungsfälle ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sturmnacht-claims-{lang}-{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
