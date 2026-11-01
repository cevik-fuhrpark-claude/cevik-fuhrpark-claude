# [CLAUDE] UI-Test (01.11.2026, Backlog 840, Blickwinkel „Monatsmeldung an den Leasinggeber mit einer Ziffer zu viel“): Verträge zeigen neben
# dem km-Stand den Hinweis „mehr Stellen als der vorherige – Ziffern vor der Meldung prüfen“ (nur beim betroffenen Vertrag); DE/UK/EN,
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
    for vin,plate,kms in [('WDB96340310840001','VK-ON 841',[(100480,-10),(1004900,-3)]),('WDB96340310840002','VK-ON 842',[(200480,-10),(204900,-3)])]:
        api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})
        r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',{'kind':'leasing','partner':'UI-Leasing '+plate[-3:],'evidence':'UI-Test','start_date':d(-400)})
        check(r['s'] in (200,201),'Vertrag angelegt '+str(r['s']))
        for km,n in kms: check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':km,'measured_on':d(n)})['s']==201,f'km {km}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'vk.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/contracts'); q.reload(); q.wait_for_selector('[data-ctread]', timeout=15000)
        check(q.locator('[data-ctdigits]').count()==1,f'{lang} {w}: genau ein Ziffern-Hinweis')
        txt=q.inner_text('[data-ctdigits]') if q.locator('[data-ctdigits]').count() else ''
        check(('100' in txt and '480' in txt),f'{lang} {w}: nennt vorherigen Stand ({txt})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: ohne Querscrollen')
        if SHOTS and q.locator('[data-ctdigits]').count(): q.locator('[data-ctdigits]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vertragkm-{lang}-{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
