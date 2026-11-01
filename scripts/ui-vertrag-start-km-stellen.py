# [CLAUDE] UI-Test (01.11.2026, Backlog 844, Blickwinkel „Leasingvertrag: km bei Übernahme mit einer Ziffer zu wenig“): Vertragsübersicht und
# Fahrzeugakte zeigen an der km-Zeile (Backlog 845: auch das Formular „Vertrag erfassen“ beim Tippen) „km bei Übernahme hat weniger Stellen als der km-Stand vor Vertragsbeginn“ (nur beim betroffenen Vertrag); DE/UK/EN,
# 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vk.inhaber','display_name':'VK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: str(today+datetime.timedelta(days=n))
    for vin,plate,sk in [('WDB96340310844001','VK-SK 841',45000),('WDB96340310844002','VK-SK 842',450000)]:
        api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})
        check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':450000,'measured_on':d(-310)})['s']==201,'km vor Beginn')
        r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',{'kind':'leasing','partner':'UI-Leasing '+plate[-3:],'evidence':'UI-Test','start_date':d(-300),'end_date':d(400),'km_allowance':100000,'start_km':sk})
        check(r['s'] in (200,201),'Vertrag angelegt '+str(r['s']))
        check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':480000,'measured_on':d(-3)})['s']==201,'km aktuell')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'vk.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for route in ['/#/contracts', '/#/vehicles/VIN:WDB96340310844001']:
            q.goto(B+route); q.reload(); q.wait_for_selector('[data-ctread]', timeout=15000)
            n=q.locator('[data-ctstartdigits]').count()
            check(n==1,f'{lang} {w} {route}: genau ein Übernahme-Hinweis ({n})')
            txt=q.inner_text('[data-ctstartdigits]') if n else ''
            check(('450' in txt),f'{lang} {w}: nennt km vor Beginn ({txt})')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w} {route}: ohne Querscrollen')
            if SHOTS and n: q.locator('[data-ctstartdigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vertragstartkm-{lang}-{w}-{route[3:9]}.png')
        # Backlog 845: Formular „Vertrag erfassen“ in der Akte warnt beim Tippen (Beginn nach der Ablesung 450 000)
        q.goto(B+'/#/vehicles/VIN:WDB96340310844002'); q.reload(); q.wait_for_selector('#ctf', state='attached', timeout=15000)
        q.evaluate("() => { const f = document.querySelector('#ctf'); f.closest('details').open = true; }")
        q.fill('#ctf input[name=start_date]', d(-300)); q.fill('#ctf input[name=start_km]', '45000')
        check(q.locator('#ctf [data-ctskdigits]').count()==1,f'{lang} {w}: Formular warnt bei 45 000')
        if SHOTS: q.locator('#ctf [data-ctskdigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vertragstartkm-form-{lang}-{w}.png')
        q.fill('#ctf input[name=start_km]', '450000')
        check(q.locator('#ctf [data-ctskdigits]').count()==0,f'{lang} {w}: Formular ohne Hinweis bei 450 000')
        q.fill('#ctf input[name=start_km]', '45000'); q.fill('#ctf input[name=start_date]', d(-320))
        check(q.locator('#ctf [data-ctskdigits]').count()==0,f'{lang} {w}: Beginn vor der Ablesung → kein Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w} Formular: ohne Querscrollen')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
