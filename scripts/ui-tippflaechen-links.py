# [CLAUDE] UI-Test (22.10.2026, Backlog 147): Kennzeichen-/Vorgangsnummer-Links in Tabellenzellen und „Fahrzeug ›“ im Kostenbericht
# mit Tippfläche ≥ 24 px (WCAG 2.5.8; vorher 20–23 px). Links mitten im Satz sind ausgenommen. 390/820/1366 px, Inhaber.
# Hilfe: Abschnitte „Einrichtungsstand“ (Inhaber: Einstellungen) und „Standort ändern“ (Fuhrparkleitung) in DE/UK/EN vorhanden.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# kleine Links, die nicht Teil eines Satzes sind (Elternelement enthält kaum mehr Text als der Link)
MEAS = """() => [...document.querySelectorAll('main a[href]')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); const p = e.parentElement;
  const inl = p && /^(P|LI|SPAN|SMALL)$/.test(p.tagName) && p.textContent.trim().length > e.textContent.trim().length + 15;
  return { h: Math.round(r.height), t: e.textContent.trim().slice(0, 30), inl }; }).filter((x) => x.h < 24 && !x.inl)"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tl.inhaber','display_name':'TL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'TL-AB 1','vin':'WDB96340310776011','site':'Dortmund'})
    for i in range(2): api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310776011','description':f'TL Spiegel {i}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'tl-{i}'})
    for w in (390,820,1366):
        ctx=br.new_context(viewport={'width':w,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tl.inhaber','password':PW}])
        for route in ['/#/','/#/cases','/#/vehicles','/#/vehicles/VIN:WDB96340310776011','/#/master','/#/maintenance','/#/costs','/#/kpi','/#/quality','/#/plan']:
            q.goto(B+route); q.wait_for_timeout(900)
            if route=='/#/costs': q.evaluate("()=>document.querySelectorAll('main details').forEach((d)=>d.open=true)"); q.wait_for_timeout(100)
            small=q.evaluate(MEAS)
            check(not small,f'{w}px {route}: Links ≥ 24 px {small[:4]}')
            if SHOTS and route in ('/#/master','/#/costs'): q.screenshot(path=f'{SHOTS}/tipp_{w}_{route.strip("/#").replace("/","_") or "start"}.png')
        for lang,needle in [('de','Einrichtungsstand (nur Inhaber)'),('uk','Стан налаштування» (лише власник)'),('en','Setup status (owner only)')]:
            q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+'/#/help'); q.reload(); q.wait_for_selector('#help-settings',timeout=15000)
            check(needle in q.inner_text('#help-settings'),f'{w}px {lang}: Hilfe Einrichtungsstand')
            check(q.locator('#help-fleet li').count()>=1 and any(k in q.inner_text('#help-fleet') for k in ('Standort eines Fahrzeugs ändern','Змінити локацію транспорту','Changing a vehicle’s site')),f'{w}px {lang}: Hilfe Standort ändern')
        q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
