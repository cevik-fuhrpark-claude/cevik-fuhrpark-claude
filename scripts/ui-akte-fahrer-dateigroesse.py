# [CLAUDE] UI-Test (20.10.2026): Fahrzeugakte – ohne Fahrer der angezeigten Umgebung Hinweis statt leerer Auswahl (Fahrer der anderen
# Umgebung erscheinen nicht), Dokument-Dateigröße im Zahlenformat der Sprache mit Einheit (DE „1.172 KB“, EN „1,172 KB“, UK „1 172 КБ“).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, n]) => { const b = new Uint8Array(n); b.set(new TextEncoder().encode('%PDF-1.4\\n')); crypto.getRandomValues(b.subarray(9, 9 + 60000));
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-cfp': '1', 'x-filename': 'zulassung.pdf' }, body: b });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SIZE={'de':'1.172 KB','uk':'1 172 КБ','en':'1,172 KB'}
HINT={'de':'Keine aktiven Fahrer in dieser Umgebung','uk':'У цьому середовищі немає активних водіїв','en':'No active drivers in this environment'}
VIN='WDB96340310888875'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fa.inhaber','display_name':'FA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; env=(me.get('user') or me).get('environment')
    other='production' if env=='test' else 'test'
    check(api('POST','/api/users',{'username':'fa.fahrer.andere','display_name':'Fahrer Andere Umgebung','role':'driver','environment':other})['s'] in (200,201),'Fahrer der anderen Umgebung angelegt')
    vid=api('POST','/api/vehicles',{'plate':'FA-UI 1','vin':VIN,'site':'Dortmund'})['d']['id']
    check(a.evaluate(UP,[f'/api/vehicles/{vid}/documents?kind=zulassung',1200000])['s']==201,'Dokument 1,2 MB hochgeladen')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fa.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#df')
        q.wait_for_function("()=>!document.querySelector('#drvsel') || document.querySelector('#drvsel').options.length>0 || document.querySelector('#df').innerText.length>0")
        q.wait_for_timeout(300)
        txt=q.inner_text('body').replace(' ',' ').replace(' ',' ')
        check(SIZE[lang] in txt,f'{lang} {w}px: Dateigröße {SIZE[lang]}')
        check(HINT[lang] in txt,f'{lang} {w}px: Hinweis ohne Fahrer')
        check('Fahrer Andere Umgebung' not in q.inner_html('#df'),f'{lang} {w}px: kein Fahrer der anderen Umgebung')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS: q.locator('#df').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/akte_fahrer_{lang}_{w}.png')
        c.close()
    br.close()
print('OK' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
