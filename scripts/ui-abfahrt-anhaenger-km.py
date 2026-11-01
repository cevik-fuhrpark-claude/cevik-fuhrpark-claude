# [CLAUDE] UI-Test (01.11.2026, Backlog 827, Blickwinkel „Anhänger ohne eigene Zugmaschine – Fremd-Zugmaschine holt ihn ab“): In der
# Abfahrtskontrolle zeigt das km-Feld beim Anhänger den Hinweis „nur Achskilometerzähler des Anhängers“, beim Lkw nicht; Wechsel und
# QR-Vorauswahl (#/check/<id>) berücksichtigt. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR='VIN:WKV00000827000011'; TK='VIN:WMA06XZZ8RP827002'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ak.inhaber','display_name':'AK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ak.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r1=api('POST','/api/vehicles',{'vin':TR[4:],'plate':'AK-AN 827','site':'Dortmund','kind':'anhaenger'})
    r2=api('POST','/api/vehicles',{'vin':TK[4:],'plate':'AK-LK 827','site':'Dortmund','kind':'lkw'})
    check(r1['s'] in (200,201,409) and r2['s'] in (200,201,409),f'Fahrzeuge angelegt ({r1["s"]}/{r2["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ak.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        check(q.locator('#kmtr').is_hidden(),f'{lang}/{wd}: ohne Auswahl kein Hinweis')
        q.select_option('#v',TK); q.wait_for_timeout(50)
        check(q.locator('#kmtr').is_hidden(),f'{lang}/{wd}: Lkw ohne Hinweis')
        q.select_option('#v',TR); q.wait_for_timeout(50)
        check(q.locator('#kmtr').is_visible(),f'{lang}/{wd}: Anhänger mit Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: q.locator('#km').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/anhkm-{lang}-{wd}.png')
        q.select_option('#v',TK); q.wait_for_timeout(50)
        check(q.locator('#kmtr').is_hidden(),f'{lang}/{wd}: zurück zum Lkw ohne Hinweis')
        # QR-Vorauswahl des Anhängers
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check/'+TR); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        check(q.input_value('#v')==TR and q.locator('#kmtr').is_visible(),f'{lang}/{wd}: Vorauswahl Anhänger mit Hinweis')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
