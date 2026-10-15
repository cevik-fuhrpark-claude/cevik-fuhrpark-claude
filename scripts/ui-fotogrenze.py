# [CLAUDE] UI-Test: Mehr als 10 Fotos gewählt (Schadensmeldung, Abfahrtskontrolle) → sichtbarer Hinweis „nur die ersten 10“; bei ≤ 10 kein Hinweis.
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); SHOTS=os.environ.get('CFP_SHOTS')
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
B=B; PW='Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
PNG=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'fm.inhaber','password':PW})
    api('POST','/api/vehicles',{'vin':'WDB96340310555000','plate':'FM-PH 1','site':'Dortmund'})
    for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        for route in ['#/new','#/check']:
            # Hash-Wechsel #/new → #/check: neu laden, sonst greift set_input_files ggf. das alte Feld der vorigen Seite (Flake 15.10.2026)
            q.goto(B+'/'+route); q.reload(); q.wait_for_selector('#ph', state='attached')
            q.set_input_files('#ph',[{'name':f'b{i}.png','mimeType':'image/png','buffer':PNG} for i in range(12)])
            try: q.wait_for_selector('[data-photomax]', state='visible', timeout=3000)
            except Exception: pass
            t=q.locator('[data-photomax]').inner_text() if q.locator('[data-photomax]').is_visible() else ''
            check('12 Bilder' in t and 'ersten 10' in t,f'{w}px {route}: Hinweis bei 12 Bildern')
            if SHOTS: q.locator('#ph').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fotogrenze_{w}_{route[2:]}.png')
            q.set_input_files('#ph',[{'name':f'b{i}.png','mimeType':'image/png','buffer':PNG} for i in range(3)]); q.wait_for_timeout(100)
            check(not q.locator('[data-photomax]').is_visible(),f'{w}px {route}: kein Hinweis bei 3 Bildern')
        check(not errs,f'{w}px: keine Skriptfehler {errs}'); c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
