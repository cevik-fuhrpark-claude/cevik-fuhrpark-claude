# [CLAUDE] UI-Test: Kennzahlen – Fahrzeugliste zeigt die ersten 20 mit Gesamtzahl und Hinweis, „Alle anzeigen“ zeigt alle,
# Druck enthält alle (kein stilles Abschneiden). 390/820/1366 px, keine Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
ROWS="()=>document.querySelectorAll('#kpivl a.row').length"
N=23
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    made=0
    for j in range(N):
        api('POST','/api/vehicles',{'vin':f'WDB96340310555{j:03d}','plate':f'FM-KZ {j+1}','site':'Dortmund'})
        r=api('POST','/api/cases',{'vehicle_id':f'VIN:WDB96340310555{j:03d}','description':f'Kennzahlen Spiegel {j}','priority':'niedrig','driveability':'fahrbereit','request_key':f'fm-kz-{j}'})
        made+= r['s'] in (200,201)
    check(made==N,f'{N} Vorgänge angelegt ({made})')
    for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+'/#/kpi'); q.wait_for_selector('#kpiveh')
        tot=int(q.inner_text('#kpiveh .chip'))
        check(tot>=N,f'{w}px: Zähler über alle Fahrzeuge ({tot})')
        check(q.evaluate(ROWS)==20,f'{w}px: zuerst 20 Zeilen ({q.evaluate(ROWS)})')
        hint=q.inner_text('#kpivmore') if q.locator('#kpivmore').count() else ''
        check(f'20 von {tot}' in hint,f'{w}px: Hinweis „20 von {tot}“')
        if SHOTS: q.locator("#kpiveh").scroll_into_view_if_needed(); q.screenshot(path=f"{SHOTS}/kpi_fahrzeuge_{w}.png")
        q.click('#kpivall'); q.wait_for_timeout(500)
        check(q.evaluate(ROWS)==tot,f'{w}px: „Alle anzeigen“ → {tot} Zeilen ({q.evaluate(ROWS)})')
        check(not q.locator('#kpivmore').count(),f'{w}px: Hinweis danach weg')
        # Neuer Zeitraum: wieder die ersten 20
        q.click('#kf2 button:not([type])'); q.wait_for_timeout(500)
        check(q.evaluate(ROWS)==20,f'{w}px: „Anzeigen“ setzt auf 20 zurück')
        # Druck: zeigt alle
        q.evaluate("()=>{ window.print = () => { window.__printed = document.querySelectorAll('#kpivl a.row').length; }; }")
        q.click('#kpiprt'); q.wait_for_timeout(600)
        check(q.evaluate("()=>window.__printed")==tot,f'{w}px: Druck enthält alle {tot}')
        check(not errs,f'{w}px: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
