# [CLAUDE] UI-Test: Höchstzahlen sichtbar statt Serverfehler – Hinweise zum Fahrzeug (20 aktive): ab der Hälfte „noch N von 20“,
# voll → Hinweis statt Formular; Panne & Notfall (50 aktive Rufnummern): voll → Hinweis statt „Neue Rufnummer“, Bearbeiten bleibt möglich.
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MANY = """async ([path, n, pre]) => { let ok = 0; for (let i = 0; i < n; i++) { const b = pre === 'em' ? { kind: 'dispo', scope: 'all', label: 'UI-Test ' + i, phone: '0000 ' + i } : { text: pre + ' ' + i };
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: JSON.stringify(b) }); ok += r.ok ? 1 : 0; } return ok; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    em=api('GET','/api/emergency/contacts')['d']; n0=len(em['contacts'])
    check(a.evaluate(MANY,['/api/emergency/contacts',em['max_active']-n0,'em'])==em['max_active']-n0,'Rufnummern bis zur Höchstzahl angelegt')
    for i,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        vin=f'WDB96340310555{i:03d}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'FM-HZ {i+1}','site':'Dortmund'})
        base=f'/api/vehicles/VIN:{vin}/notes'
        check(a.evaluate(MANY,[base,12,'UI-Test Hinweis'])==12,f'{w}px: 12 Hinweise vorab')
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+f'/#/vehicles/VIN:{vin}'); q.wait_for_selector('#vnf',state='attached')
        check('noch 8 von 20' in (q.inner_text('#vnfree') if q.locator('#vnfree').count() else ''),f'{w}px: „noch 8 von 20 möglich“')
        check(q.evaluate(MANY,[base,8,'UI-Test Rest'])==8,f'{w}px: bis 20 aufgefüllt')
        q.reload(); q.wait_for_selector('#vnfull',timeout=15000)
        check(not q.locator('#vnf').count(),f'{w}px: voll → kein Formular')
        check('Höchstzahl von 20' in q.inner_text('#vnfull'),f'{w}px: Hinweis „Höchstzahl erreicht“')
        if SHOTS: q.locator('#vnfull').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hinweise_voll_{w}.png')
        q.goto(B+'/#/emergency/edit'); q.wait_for_selector('#emfull',timeout=15000)
        check(not q.locator('#emf').count() and 'Höchstzahl von 50' in q.inner_text('#emfull'),f'{w}px: Rufnummern voll → Hinweis statt Formular')
        if SHOTS: q.screenshot(path=f'{SHOTS}/rufnummern_voll_{w}.png')
        q.locator('[data-emedit]').first.click(); q.wait_for_selector('#emf',timeout=10000)
        check(not q.locator('#emfull').count(),f'{w}px: Bearbeiten einer vorhandenen Nummer bleibt möglich')
        check(not errs,f'{w}px: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
