# [CLAUDE] UI-Test (22.10.2026): Falsch gehende Geräteuhr – die App misst die Abweichung am Date-Kopf der API-Antworten,
# zeigt ab 5 Min. einen Hinweis (DE/UK/EN) und rechnet „heute“ (z. B. höchstes km-Datum in der Fahrzeugakte) mit der Serverzeit.
# Richtige Uhr: kein Hinweis. 390/820/1366 px. Läuft gegen einen Dev-Server (CFP_URL, Standard Port 8787).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
VIN='WDB96340310779911'; VID='VIN:'+VIN
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'en.inhaber','display_name':'EN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'en.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'UHR-UI 1','vin':VIN,'site':'Dortmund'})
    real=datetime.datetime.now(datetime.timezone.utc)
    import zoneinfo
    today=real.astimezone(zoneinfo.ZoneInfo('Europe/Berlin')).date().isoformat()
    cases=[('de',390,-25*3600,'geht','nach'),('uk',820,-3*3600,'відстає',None),('en',1366,2*86400*3,'ahead',None),('de',1366,0,None,None)]
    for lang,w,off,word,word2 in cases:
        c=br.new_context(viewport={'width':w,'height':900},locale='de-DE'); q=c.new_page()
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        if off: q.clock.install(time=real+datetime.timedelta(seconds=off))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'en.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+VID); q.reload(); q.wait_for_selector('.topbar',timeout=15000); q.wait_for_selector('input[name=measured_on]',state='attached',timeout=15000)
        if off: q.clock.run_for(1000)
        band=q.locator('.clockband')
        if word:
            check(band.count()==1 and word in band.inner_text() and (word2 is None or word2 in band.inner_text()),f'{lang} {w}: Hinweis Geräteuhr ({band.inner_text() if band.count() else "-"})')
            check(band.get_attribute('role')=='status',f'{lang} {w}: role=status')
            bw=q.evaluate("() => { const b = document.querySelector('.clockband').getBoundingClientRect(); return [b.width, document.documentElement.scrollWidth] }")
            check(bw[1]<=w+1,f'{lang} {w}: kein waagerechtes Scrollen ({bw})')
        else:
            check(band.count()==0,f'{lang} {w}: richtige Uhr – kein Hinweis')
        try: mx=q.get_attribute('input[name=measured_on]','max',timeout=8000)
        except Exception: mx=None; print('   URL', q.url)
        check(mx==today,f'{lang} {w}: „heute“ nach Serverzeit (max={mx}, erwartet {today})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/geraeteuhr_{lang}_{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
