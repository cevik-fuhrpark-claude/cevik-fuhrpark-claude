# [CLAUDE] UI-Test (01.11.2026, Backlog 842, Folge aus 841): Agentenbefund „km-Wartung überfällig“, dessen letzte Ablesung mehr Stellen hat als
# die vorherige → Befundtext nennt „Ziffern prüfen: vorher N km“, nächster Schritt „Zuerst den km-Stand prüfen …“ in der Sprache der Oberfläche;
# Master-Panel und Fahrzeugakte, DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DIG={'de':'Ziffern prüfen','uk':'Перевірте цифри','en':'Check the digits'}
ACT={'de':'Zuerst den km-Stand prüfen','uk':'Спершу перевірте показник пробігу','en':'Check the odometer reading first'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ak.inhaber','display_name':'AK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ak.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: str(today+datetime.timedelta(days=n))
    VA='VIN:WDB96340310842001'
    for vin,plate,km2 in [('WDB96340310842001','AK-ON 842',1400500),('WDB96340310842002','AK-ON 843',160500)]:
        api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'})
        r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'Ölwechsel','interval_km':100000,'last_done_km':50000,'evidence':'UI-Test 842'})
        check(r['s']==201,'Wartungsregel '+str(r['s']))
        for km,n in [(140000,-5),(km2,0)]: check(api('POST',f'/api/vehicles/VIN:{vin}/odometer',{'km':km,'measured_on':d(n)})['s']==201,f'km {km}')
    check(api('POST','/api/agent/run',{})['s'] in (200,202),'Agent-Lauf')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ak.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master?q=AK-ON'); q.reload(); q.wait_for_selector('#afl [data-afi]', timeout=15000); q.wait_for_timeout(300)
        rows=[r for r in q.locator('#afl [data-afi]').all() if r.is_visible() and 'AK-ON' in r.inner_text()]
        dig=[r for r in rows if DIG[lang] in r.inner_text()]
        check(len(dig)==1,f'{lang} {w}: Master genau ein Befund mit Ziffern-Zusatz ({len(dig)}/{len(rows)})')
        if dig:
            t=dig[0].inner_text()
            check('843' not in t and ACT[lang] in t,f'{lang} {w}: richtiges Fahrzeug, nächster Schritt übersetzt')
            if SHOTS: dig[0].scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/agentkm-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Master ohne Querscrollen')
        q.goto(B+'/#/vehicles/'+VA); q.wait_for_selector('#vaf', state='attached', timeout=15000)
        q.wait_for_load_state('networkidle'); q.wait_for_timeout(400)
        q.evaluate("() => { const d = document.getElementById('vaf'); if (d) d.open = true; }")
        vt=q.inner_text('#vaf')
        check(DIG[lang] in vt and ACT[lang] in vt,f'{lang} {w}: Fahrzeugakte zeigt Zusatz und Schritt')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: Akte ohne Querscrollen')
        if SHOTS: q.locator('#vaf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/agentkm-akte-{lang}-{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
