# [CLAUDE] UI-Test: Dateien am Vorgang – Höchstzahl (10) vor dem Hochladen sichtbar: „Noch N von 10“, bei mehr Auswahl als frei
# (Inhalte je Datei verschieden – gleiche Inhalte legt der Server nur einmal ab) werden nur die freien Plätze hochgeladen und der Rest in einer Meldung genannt (kein Serverfehler je Datei); voll → Hinweis statt Knopf.
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([cid, n]) => { const b = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgAAAAAgABVKJPXQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
  let ok = 0; for (let i = 0; i < n; i++) { const r = await fetch(`/api/cases/${cid}/files`, { method: 'POST', headers: { 'x-cfp': '1', 'x-filename': `vorab${i}.png`, 'content-type': 'image/png' }, body: Uint8Array.from([...b, 100 + i, cid.charCodeAt(0)]) }); ok += r.ok ? 1 : 0; } return ok; }"""
PNG=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
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
    for i,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        api('POST','/api/vehicles',{'vin':f'WDB96340310444{i:03d}','plate':f'FM-VD {i+1}','site':'Dortmund'})
        r=api('POST','/api/cases',{'vehicle_id':f'VIN:WDB96340310444{i:03d}','description':'UI-Test: Dateigrenze','priority':'niedrig','driveability':'fahrbereit','request_key':f'fm-vd-{i}'})
        cid=r['d']['id']
        check(a.evaluate(UP,[cid,7])==7,f'{w}px: 7 Dateien vorab')
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#file',state='attached')
        check('Noch 3 von 10' in (q.inner_text('#filesfree') if q.locator('#filesfree').count() else ''),f'{w}px: „Noch 3 von 10 Dateien möglich“')
        q.set_input_files('#file',[{'name':f'neu{k}.png','mimeType':'image/png','buffer':PNG+bytes([k, i])} for k in range(5)])
        q.wait_for_selector('#filesfull',timeout=15000)
        n=len(api('GET',f'/api/cases/{cid}')['d']['files'])
        check(n==10,f'{w}px: genau 10 Dateien am Vorgang ({n})')
        tt=q.evaluate("()=>[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' | ')")
        check('2 Datei(en) nicht angehängt' in tt and 'neu3.png' in tt and 'neu4.png' in tt and 'too_many' not in tt and 'Maximal' not in tt,f'{w}px: eine Meldung nennt die 2 Überzähligen ({tt[:90]})')
        check(not q.locator('#file').count(),f'{w}px: voll → kein Hochladeknopf')
        check('Höchstzahl von 10' in q.inner_text('#filesfull'),f'{w}px: Hinweis „Höchstzahl erreicht“')
        if SHOTS: q.locator('#filesfull').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vorgangsdateien_{w}.png')
        check(not errs,f'{w}px: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
