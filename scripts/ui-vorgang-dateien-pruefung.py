# [CLAUDE] UI-Test (29.10.2026, Backlog 603, Blickwinkel „Werkstatt-Tablet UK mit Fotos“): Dateien am Vorgang auf Ukrainisch –
# ein 6-MB-PDF und ein HEIC-Foto werden schon im Browser abgelehnt (keine Übertragung, HEIC mit Hinweis statt „zu groß“), ein gültiges Foto
# wird angehängt, dasselbe Foto erneut meldet „вже є в заявці“ statt „✓“. 390/820/1366 px, ohne Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PNG=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dp.inhaber','display_name':'DP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('PATCH','/api/me',{'language':'uk'})
    for i,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        api('POST','/api/vehicles',{'vin':f'WDB96340310603{i:03d}','plate':f'DP-UK {i+1}','site':'Dortmund'})
        cid=api('POST','/api/cases',{'vehicle_id':f'VIN:WDB96340310603{i:03d}','description':'UI-Test: Dateiprüfung','priority':'niedrig','driveability':'fahrbereit','request_key':f'dp-uk-{i}'})['d']['id']
        c=br.new_context(viewport={'width':w,'height':h},locale='uk-UA'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        posts=[]; q.on('request',lambda r: posts.append(r.url) if r.method=='POST' and '/files' in r.url else None)
        q.evaluate(JS,['POST','/api/login',{'username':'dp.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#file',state='attached',timeout=15000)
        big=b'%PDF-1.4\n'+b'0'*(5*1024*1024+10)
        heic=b'\x00\x00\x00\x18ftypheic'+b'1'*2000
        q.set_input_files('#file',[{'name':'skan.pdf','mimeType':'application/pdf','buffer':big},{'name':'IMG_0001.HEIC','mimeType':'image/heic','buffer':heic},{'name':'foto.png','mimeType':'image/png','buffer':PNG+bytes([i])}])
        q.wait_for_selector('.toast',timeout=20000); q.wait_for_timeout(500)
        msg=' '.join(q.locator('.toast').all_inner_texts())
        check('skan.pdf' in msg and 'Файл завеликий' in msg,f'{w}: PDF > 5 МБ одразу відхилено ({msg[:160]!r})')
        check('IMG_0001.HEIC' in msg and 'HEIC/HEIF' in msg and 'Максимальна сумісність' in msg,f'{w}: HEIC з підказкою')
        check(len(posts)==1,f'{w}: nur das gültige Foto übertragen ({len(posts)} POST)')
        n=len(api('GET',f'/api/cases/{cid}')['d']['files'])
        check(n==1,f'{w}: 1 Datei am Vorgang ({n})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dateipruefung-uk-{w}.png')
        q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
        q.wait_for_selector('#file',state='attached',timeout=15000)
        q.set_input_files('#file',[{'name':'foto-nochmal.png','mimeType':'image/png','buffer':PNG+bytes([i])}])
        q.wait_for_selector('.toast',timeout=20000); q.wait_for_timeout(300)
        msg=' '.join(q.locator('.toast').all_inner_texts())
        check('Вже є в заявці' in msg and 'foto-nochmal.png' in msg,f'{w}: Dublette gemeldet ({msg[:120]!r})')
        check(len(api('GET',f'/api/cases/{cid}')['d']['files'])==1,f'{w}: keine zweite Datei')
        check(not errs,f'{w}: ohne Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'OK')
if fails: raise SystemExit(1)
