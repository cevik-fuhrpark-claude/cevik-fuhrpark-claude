# [CLAUDE] UI-Test (01.11.2026, Backlog 847, Blickwinkel „Werkstatt misst die Profiltiefe an der falschen Position oder vertippt sich“):
# Einstellungen zeigen „Reifen: Hinweis, wenn die Profiltiefe … steigt“ (leer = aus); Reifen erfassen in der Fahrzeugakte warnt beim Tippen,
# wenn die Profiltiefe an der gewählten Position um mindestens die Grenze über der letzten Messung liegt (nicht bei Reifenwechsel, nicht
# ohne Einstellung); nach dem Speichern Hinweis im Toast. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V='VIN:WMA06XZZ8RP847012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pa.inhaber','display_name':'PA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/vehicles',{'vin':V[4:],'plate':'PA-LK 847','site':'Dortmund','kind':'lkw'})
    check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
    m=api('POST',f'/api/vehicles/{V}/tires/events',{'event_type':'messung','position':'VA-L','tread_mm':'8','request_key':'pa-847-va-l'})
    check(m['s'] in (200,201),f'Messung VA-L 8 mm ({m["s"]})')
    check(api('PUT','/api/settings',{'tire_tread_rise_mm':''})['s']==200,'Einstellung leer')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate(JS,['PUT','/api/settings',{'tire_tread_rise_mm':''}])
        # ohne Einstellung: kein Hinweis
        q.goto(B+f'/#/vehicles/{V}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        q.select_option('#tf select[name="event_type"]','messung'); q.select_option('#tf select[name="position"]','VA-L')
        q.fill('#tf input[name="tread_mm"]','12'); q.wait_for_timeout(50)
        check(q.locator('[data-tfrise]').count()==0,f'{lang}/{wd}: ohne Einstellung kein Hinweis')
        # Einstellungen: Feld vorhanden, Komma je Sprache
        q.goto(B+'/#/settings'); q.wait_for_selector('#tire_tread_rise_mm',timeout=15000)
        check(q.locator('#tire_tread_rise_mm').is_visible() and q.locator('#tirerisehint').is_visible(),f'{lang}/{wd}: Einstellungsfeld + Erklärung')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: Einstellungen ohne Querscrollen')
        q.evaluate(JS,['PUT','/api/settings',{'tire_tread_rise_mm':'1.5'}])
        q.goto(B+f'/#/vehicles/{V}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        q.select_option('#tf select[name="event_type"]','messung'); q.select_option('#tf select[name="position"]','VA-L')
        q.fill('#tf input[name="tread_mm"]','9'); q.wait_for_timeout(50)
        check(q.locator('[data-tfrise]').count()==0,f'{lang}/{wd}: +1 mm unter der Grenze → kein Hinweis')
        q.fill('#tf input[name="tread_mm"]','12,5' if lang!='en' else '12.5'); q.wait_for_timeout(50)
        hint=q.locator('[data-tfrise="VA-L"]')
        check(hint.count()==1 and hint.is_visible() and '8' in hint.inner_text() and '12' in hint.inner_text(),f'{lang}/{wd}: Hinweis {hint.inner_text() if hint.count() else ""!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: hint.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifenprofil-{lang}-{wd}.png')
        q.select_option('#tf select[name="position"]','VA-R'); q.wait_for_timeout(50)
        check(q.locator('[data-tfrise]').count()==0,f'{lang}/{wd}: andere Position ohne Messung → kein Hinweis')
        q.select_option('#tf select[name="position"]','VA-L'); q.wait_for_timeout(50)
        check(q.locator('[data-tfrise]').count()==1,f'{lang}/{wd}: zurück → Hinweis')
        q.select_option('#tf select[name="event_type"]','wechsel'); q.wait_for_timeout(50)
        check(q.locator('[data-tfrise]').count()==0,f'{lang}/{wd}: Reifenwechsel → kein Hinweis')
        q.fill('#tf input[name="tread_mm"]',''); q.wait_for_timeout(50)
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Speichern: Hinweis im Toast (einmal, DE)
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    q.goto(B+f'/#/vehicles/{V}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
    q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
    q.select_option('#tf select[name="event_type"]','messung'); q.select_option('#tf select[name="position"]','VA-L')
    q.fill('#tf input[name="tread_mm"]','12,5'); q.locator('#tf button.btn').click()
    q.wait_for_function("() => [...document.querySelectorAll('.toast, #toast')].some((x) => /mehr Profil als zuletzt/.test(x.textContent))",timeout=10000)
    check(True,'Speichern: Hinweis im Toast')
    check(not errs,f'Speichern: keine Skriptfehler {errs[:2]}')
    ctx.close()
    api('PUT','/api/settings',{'tire_tread_rise_mm':''})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
