# [CLAUDE] UI-Test (20.10.2026): Bußgeld mit Kennzeichen an zwei aktiven Fahrzeugen zeigt „mehrere aktive Fahrzeuge“ statt „keinem Fahrzeug
# zugeordnet“; Vertrag mit km-Stand unter „km bei Übernahme“ zeigt eigenen Hinweis statt „kein km-Stand seit Vertragsbeginn“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
AMB={'de':'mehreren aktiven Fahrzeugen','uk':'кілька активних','en':'several active vehicles'}
BELOW={'de':'liegt unter','uk':'менший за','en':'is below'}
NONE={'de':'kein km-Stand seit Vertragsbeginn','uk':'немає показника км з початку договору','en':'no km reading since contract start'}
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bm.inhaber','display_name':'BM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    r=api('POST','/api/login',{'username':'bm.inhaber','password':PW}); check(r['s']==200,f'Anmeldung ({r["s"]})')
    v1=api('POST','/api/vehicles',{'plate':'BM-MD 1','vin':'WDB96340310998101','site':'Dortmund'})
    v2=api('POST','/api/vehicles',{'plate':'BM MD 1','vin':'WDB96340310998102','site':'Dortmund'})
    check(v1['s'] in (201,409) and v2['s'] in (201,409),f'Fahrzeuge ({v1["s"]}/{v2["s"]})')
    vid='VIN:WDB96340310998101'
    o=api('POST',f'/api/vehicles/{vid}/odometer',{'km':20000}); check(o['s'] in (201,400),f'km-Stand ({o["s"]})')
    c=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'BM Leasing','evidence':'Vertrag','km_allowance':100000,'start_km':50000,'start_date':(today-datetime.timedelta(days=200)).isoformat()})
    check(c['s'] in (201,409),f'Vertrag ({c["s"]})')
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt','reference':'BM-AMB-1','offense_type':'geschwindigkeit','offense_at':off,'plate_in_letter':'BM-MD 1','response_due':(today+datetime.timedelta(days=14)).isoformat()})
    fid=f['d']['id'] if f['s']==201 else None
    if not fid:
        l=api('GET','/api/fines'); fid=next((x['id'] for x in l['d']['fines'] if x.get('reference')=='BM-AMB-1'),None)
    check(fid is not None,f'Bußgeld ({f["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bm.inhaber','password':PW}])
        q.goto(B+'/#/fines/'+fid); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(300)
        txt=q.inner_text('main')
        check(AMB[lang] in txt,f'{lang} {w}px: Bußgeld nennt mehrere aktive Fahrzeuge')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Bußgeld ohne Querscrollen ({sw})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bm-bussgeld-{lang}.png', full_page=True)
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('[data-ct-below]', timeout=15000)
        txt=q.inner_text('main')
        check(BELOW[lang] in q.inner_text('[data-ct-below]'),f'{lang} {w}px: Vertrag „km unter Übernahme“')
        check(NONE[lang] not in txt,f'{lang} {w}px: kein „kein km-Stand“')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Akte ohne Querscrollen ({sw})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bm-akte-{lang}.png', full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f'{"FEHLER" if fails else "OK"}: {len(fails)} Abweichungen')
raise SystemExit(1 if fails else 0)
