# [CLAUDE] UI-Test (09.11.2026, Backlog 1235, Blickwinkel „Werkstatt/Leitung speichert und tippt sofort auf eine andere Seite“): Ansichten,
# die sich nach einer Aktion selbst neu laden, überschrieben bei langsamem Netz die inzwischen geöffnete Seite (Adresse „Fahrzeuge“, Inhalt
# Artikelakte). Jetzt: Buchung in der Artikelakte bzw. km-Stand in der Fahrzeugakte senden (Antwort künstlich 1,2 s verzögert), sofort andere
# Seite öffnen → die neue Seite bleibt stehen, gespeichert wurde trotzdem; ohne Seitenwechsel baut die Akte wie bisher mit dem neuen Stand auf.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Antworten auf Buchung/km-Stand verzögern (wie Funkloch am Werkstatttor) – nur im Browser, der Server bucht sofort
SLOW = """() => { if (window.cfpSlow) return; window.cfpSlow = true; const f = window.fetch;
  window.fetch = async (u, o) => { const r = await f(u, o); if (o && o.method === 'POST' && /\\/(movements|odometer)$/.test(String(u))) await new Promise((x) => setTimeout(x, 1200)); return r; }; }"""
noscroll = 'document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sw.inhaber', 'display_name': 'SW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['sw.inhaber', 'bs.inhaber', 'is.inhaber', 'wn.inhaber', 'tl.inhaber', 'we.inhaber', 'rp.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    tag = uuid.uuid4().hex[:4]; pid = int(uuid.uuid4().int % 10**7)
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        api('PATCH', '/api/me', {'language': lang})
        iid = api('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Bremsbelag {tag}{i}', 'part_number': f'SW{tag}{i}', 'initial_qty': '5'})['d']['id']
        vin = f'WDB9634033{(pid + i):07d}'[:17]; vid = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'SW-NS {(pid + i) % 9000 + 1}', 'vin': vin, 'site': 'Dortmund'})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        oh = lambda: q.evaluate(JS, ['GET', f'/api/stock/{iid}', None])['d']['item']['on_hand']
        # 1) Artikelakte: buchen, sofort „Fahrzeuge“ öffnen
        q.goto(B + '/#/stock/' + iid); q.reload(); q.wait_for_selector('#mf'); q.evaluate(SLOW)
        q.select_option('#mf select[name=type]', 'zugang'); q.fill('#mf input[name=qty]', '2'); q.click('#mf button.btn')
        q.wait_for_timeout(150); q.evaluate("location.hash = '#/vehicles'"); q.wait_for_timeout(2600)
        check(q.evaluate('location.hash') == '#/vehicles' and q.locator('#mf').count() == 0 and f'Bremsbelag {tag}' not in q.inner_text('h1'), f'{lang}: nach dem Buchen „Fahrzeuge“ geöffnet → Fahrzeugliste bleibt (keine Artikelakte darüber)')
        check(oh() == 7, f'{lang}: Buchung trotzdem gespeichert (Bestand 7)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/seitenwechsel-{lang}-{w}-liste.png', full_page=False)
        # 2) ohne Seitenwechsel: Akte baut mit neuem Bestand auf
        q.evaluate("location.hash = '#/stock/%s'" % iid); q.wait_for_selector('#mf')
        q.select_option('#mf select[name=type]', 'zugang'); q.fill('#mf input[name=qty]', '1'); q.click('#mf button.btn')
        q.wait_for_function("() => /\\b8\\b/.test(document.querySelector('#main dl.kv dd b')?.textContent || '')", timeout=8000)
        check(q.input_value('#mf input[name=qty]') == '' and oh() == 8, f'{lang}: ohne Seitenwechsel Akte neu aufgebaut (Bestand 8, Menge leer)')
        # 3) Fahrzeugakte: km-Stand speichern, sofort „Lager“ öffnen
        q.evaluate("location.hash = '#/vehicles/%s'" % vid); q.wait_for_selector('details:has(#kf) > summary'); q.evaluate("document.querySelector('#kf').closest('details').open = true")
        q.fill('#kf input[name=km]', '123456'); q.click('#kf button.btn')
        q.wait_for_timeout(150); q.evaluate("location.hash = '#/stock'"); q.wait_for_timeout(2600)
        check(q.evaluate('location.hash') == '#/stock' and q.locator('#kf').count() == 0 and q.locator('#q').count() > 0 and not q.evaluate("[...document.querySelectorAll('h1')].some((x) => /SW-NS/.test(x.textContent))"), f'{lang}: nach km-Stand „Lager“ geöffnet → Lagerliste bleibt (keine Fahrzeugakte darüber)')
        km = q.evaluate(JS, ['GET', f'/api/vehicles/{vid}', None])['d']
        check(any(int(o.get('km') or 0) == 123456 for o in (km.get('odometer') or [])), f'{lang}: km-Stand trotzdem gespeichert')
        # 4) ohne Seitenwechsel: Fahrzeugakte baut neu auf (Feld leer, Stand sichtbar)
        q.evaluate("location.hash = '#/vehicles/%s'" % vid); q.wait_for_selector('details:has(#kf) > summary'); q.evaluate("document.querySelector('#kf').closest('details').open = true")
        q.fill('#kf input[name=km]', '123999'); q.click('#kf button.btn')
        q.wait_for_function("() => document.querySelector('#kf input[name=km]') && document.querySelector('#kf input[name=km]').value === '' && /123\\D?999/.test(document.body.innerText)", timeout=8000)
        check(q.evaluate("location.hash").startswith('#/vehicles/'), f'{lang}: ohne Seitenwechsel Fahrzeugakte neu aufgebaut (neuer km-Stand)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/seitenwechsel-{lang}-{w}-akte.png', full_page=False)
        check(q.evaluate(noscroll), f'{lang}: kein Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
