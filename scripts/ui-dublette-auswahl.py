# [CLAUDE] UI-Test: Ablehnen als Dublette – bei mehr als 5 anderen offenen Vorgängen desselben Fahrzeugs lädt das Formular
# die vollständige Auswahl nach (neueste zuerst, Hinweis „Alle N …“); der älteste Vorgang ist wählbar und wird gespeichert.
# 390/820/1366 px, DE/UK/EN-Hinweis, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Alle 7 anderen','uk':'усі інші відкриті заявки цього авто: 7','en':'All 7 other'}
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
    for i,((w,h),lang) in enumerate(zip([(390,844),(820,1180),(1366,900)],['de','uk','en'])):
        vin=f'WDB96340310556{i:03d}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'FM-DU {i+1}','site':'Dortmund'})
        ids=[]
        for k in range(8):
            r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'UI-Dublettenauswahl {k}','priority':'mittel','driveability':'fahrbereit','request_key':f'ui-dup-{i}-{k}'})
            ids.append(r['d']['id'])
        oldest=api('GET',f'/api/cases/{ids[0]}')['d']['case']['case_no']
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{ids[-1]}'); q.wait_for_selector('[data-act=reject]',timeout=15000)
        q.click('[data-act=reject]'); q.wait_for_selector('#dupsel',timeout=10000)
        q.wait_for_function("() => document.querySelectorAll('#dupsel option').length === 8",timeout=10000)
        opts=q.eval_on_selector_all('#dupsel option','els => els.map((e) => e.textContent)')
        check(len(opts)==8,f'{w}px/{lang}: 7 Vorgänge + „keine Dublette“ zur Auswahl ({len(opts)})')
        check(opts[-1].startswith(oldest),f'{w}px/{lang}: ältester Vorgang ({oldest}) zuletzt')
        check(HINT[lang] in q.inner_text('#dupmore'),f'{w}px/{lang}: Hinweis „{HINT[lang]} …“')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dublette_auswahl_{w}.png')
        q.select_option('#dupsel',ids[0]); q.click('#af button.btn:not(.secondary)')
        ok=False
        for _ in range(30):
            d=api('GET',f'/api/cases/{ids[-1]}')['d']
            if d['case']['status']=='abgelehnt': ok=d['case']['duplicate_of']==ids[0]; break
            q.wait_for_timeout(300)
        check(ok,f'{w}px/{lang}: als Dublette des ältesten Vorgangs abgelehnt')
        check(not errs,f'{w}px/{lang}: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
