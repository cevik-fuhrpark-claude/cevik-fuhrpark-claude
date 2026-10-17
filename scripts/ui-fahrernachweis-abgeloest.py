# [CLAUDE] UI-Test (17.10.2026): Fahrerakte – abgelaufene Unterweisung, die durch eine neuere gleichen Titels abgelöst ist, zeigt
# „abgelöst durch neueren Nachweis (gültig bis …)“ und macht die Akte nicht mehr „kritisch“; andere Unterweisung (anderer Titel) bleibt eigenständig.
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
REPL={'de':'abgelöst durch neueren Nachweis','uk':'замінено новішим документом','en':'replaced by a newer record'}
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
    def driver(name, docs):
        r=api('POST','/api/drivers',{'display_name':name}); did=r['d']['id']
        for d in docs: check(api('POST',f'/api/drivers/{did}/documents',d)['s'] in (200,201),f'{name}: Nachweis {d["kind"]} {d.get("title")} {d.get("valid_until")}')
        return did
    lic={'kind':'fuehrerschein','evidence':'Führerschein vorgelegt','valid_until':'2033-01-01'}
    d1=driver('FA Abgelöst',[lic,{'kind':'unterweisung','title':'Ladungssicherung','valid_until':'2026-09-30','evidence':'Unterweisung 2025'},{'kind':'unterweisung','title':'ladungssicherung','valid_until':'2099-09-30','evidence':'Unterweisung 2026'}])
    d2=driver('FA Anderes Thema',[lic,{'kind':'unterweisung','title':'Ladungssicherung','valid_until':'2026-09-30','evidence':'Unterweisung 2025'},{'kind':'unterweisung','title':'Gefahrgut','valid_until':'2099-09-30','evidence':'Unterweisung Gefahrgut'}])
    dt=api('GET',f'/api/drivers/{d1}')['d']
    check(dt['status']['overall']!='kritisch' and len(dt['status']['replaced'])==1,f'API: abgelöst, nicht kritisch ({dt["status"]["overall"]})')
    check(api('GET',f'/api/drivers/{d2}')['d']['status']['overall']=='kritisch','API: anderes Thema bleibt kritisch')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fa.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/drivers/{d1}'); q.reload(); q.wait_for_selector('[data-ddoc-replaced]'); q.wait_for_timeout(300)
        t1=q.inner_text('[data-ddoc-replaced]')
        check(REPL[lang] in t1 and '30' in t1 and '2099' in t1,f'{lang} {w}px Akte: „{t1.strip()}“')
        check(q.locator('[data-ddoc-replaced]').count()==1,f'{lang} {w}px genau ein abgelöster Nachweis')
        check(q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),f'{lang} {w}px Akte: kein Querscrollen')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/fahrernachweis_{lang}_{w}.png',full_page=True)
        q.goto(B+f'/#/drivers/{d2}'); q.wait_for_selector('text=Gefahrgut'); q.wait_for_timeout(300)
        check(q.locator('[data-ddoc-replaced]').count()==0,f'{lang} {w}px anderes Thema: kein „abgelöst“')
        q.goto(B+'/#/drivers'); q.wait_for_selector('text=FA Anderes Thema'); q.wait_for_timeout(300)
        row1=q.locator('a.row',has_text='FA Abgelöst'); row2=q.locator('a.row',has_text='FA Anderes Thema')
        check('p-kritisch' not in (row1.get_attribute('class') or ''),f'{lang} {w}px Liste: abgelöst nicht kritisch')
        check('p-kritisch' in (row2.get_attribute('class') or ''),f'{lang} {w}px Liste: anderes Thema kritisch')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
