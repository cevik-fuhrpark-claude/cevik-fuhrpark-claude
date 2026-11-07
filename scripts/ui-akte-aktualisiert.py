# [CLAUDE] UI-Test (07.11.2026, Backlog 1118, Blickwinkel „Fuhrparkleitung hat die Fahrzeugakte eines gesperrten Lkw den ganzen Tag offen“):
#  Die Akte blieb auf dem Stand des Öffnens. Jetzt fragt die App sie alle 2 Min. im Hintergrund ab (x-cfp-bg) und zeigt bei einer Änderung
#  den angehefteten Hinweis „Fahrzeugakte inzwischen geändert · Neu laden“ – ohne stillen Neuaufbau (KI-Vorschlag, nachgeladene Teile,
#  Eingaben bleiben). Die mit der Uhr wachsende Standzeit des gesperrten Lkw zählt nicht als Änderung. DE/UK/EN 390/820/1366 px, kein
#  Überstand; Screenshots mit CFP_SHOTS.
# Voraussetzung: frischer Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid, time
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WAA00000000000001'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'aa.inhaber', 'display_name': 'AA Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'aa.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    fu = api('POST', '/api/users', {'username': 'aa.leitung', 'display_name': 'AA Leitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': fu['d']['invite_token'], 'password': PW}]); c0.close()
    check(api('POST', '/api/vehicles', {'vin': VIN, 'plate': 'AA-L 920', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, 'Lkw AA-L 920')
    r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + VIN, 'description': 'Bremse blockiert (Test)', 'priority': 'kritisch', 'driveability': 'nicht_fahrbereit', 'request_key': str(uuid.uuid4())})
    check(r['s'] in (200, 201), 'kritische Meldung, nicht fahrbereit')
    d1 = api('GET', f'/api/vehicles/VIN:{VIN}')['d']
    check(bool(d1.get('downtime')), 'Akte liefert Standzeit (wächst mit der Uhr)')

    ctx = br.new_context(viewport={'width': 960, 'height': 1000}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': 'aa.leitung', 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + f'/#/vehicles/VIN:{VIN}'); w.wait_for_selector('#kf', state='attached', timeout=15000); w.wait_for_timeout(800)
    w.evaluate("() => { document.querySelector('h1').dataset.mark = '1'; }")
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/vehicles/' in q.url else None)
    time.sleep(2)  # echte Zeit vergeht: Standzeit des gesperrten Lkw ändert sich am Server
    w.clock.fast_forward('02:10'); w.wait_for_timeout(1500)
    gets = [h for u, h in reqs if u.endswith(VIN) or u.endswith('VIN%3A' + VIN)]
    check(len(gets) >= 1 and all(h == '1' for h in gets), f'nach 2 Min.: Akte im Hintergrund abgefragt (x-cfp-bg, {len(gets)})')
    check(w.locator('#vehchg').count() == 0 and w.locator('h1[data-mark]').count() == 1, 'unverändert (nur Standzeit gewachsen): kein Hinweis, kein Neuaufbau')
    # km-Stand durch andere Person → Hinweis, kein Neuaufbau, Eingabe bleibt
    w.click('#kf >> xpath=..//summary'); w.fill('#kfkm', '123456'); w.evaluate("() => document.activeElement.blur()")
    check(api('POST', f'/api/vehicles/VIN:{VIN}/odometer', {'km': 250000})['s'] == 201, 'Inhaber erfasst km-Stand 250.000')
    w.clock.fast_forward('02:10'); w.wait_for_timeout(2000)
    check(w.locator('#vehchg').count() == 1 and 'inzwischen geändert' in w.inner_text('#vehchg'), 'Hinweis „Fahrzeugakte inzwischen geändert · Neu laden“')
    check(w.locator('h1[data-mark]').count() == 1, 'kein stiller Neuaufbau')
    check(w.input_value('#kfkm') == '123456', 'Eingabe bleibt stehen')
    if SHOTS: w.screenshot(path=f'{SHOTS}/akte-geaendert-banner-960.png')
    w.click('#vehchgre'); w.wait_for_timeout(1500)
    check('250' in w.inner_text('main') and w.locator('#vehchg').count() == 0, '„Neu laden“ zeigt den neuen Stand, Hinweis weg')
    check(w.input_value('#kfkm') == '123456', 'Eingabe bleibt auch nach „Neu laden“')
    # andere Seite: kein Hinweis darüber
    w.fill('#kfkm', ''); w.goto(B + '/#/cases'); w.wait_for_selector('#cl', timeout=15000)
    api('POST', f'/api/vehicles/VIN:{VIN}/odometer', {'km': 250100})
    w.clock.fast_forward('02:10'); w.wait_for_timeout(1500)
    check(w.url.endswith('#/cases') and w.locator('#vehchg').count() == 0, 'Vorgangsliste bleibt, kein Hinweis der Akte')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    km = 250200
    for k, (lang, (vw, vh)) in enumerate([('uk', (390, 844)), ('en', (820, 1180)), ('de', (1366, 900))]):
        c = br.new_context(viewport={'width': vw, 'height': vh}); c.clock.install(); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'aa.leitung', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + f'/#/vehicles/VIN:{VIN}'); q.reload(); q.wait_for_selector('#kf', state='attached', timeout=15000); q.wait_for_timeout(800)
        q.click('#kf >> xpath=..//summary'); q.locator('#kfkm').scroll_into_view_if_needed()
        km += 100; api('POST', f'/api/vehicles/VIN:{VIN}/odometer', {'km': km})
        q.clock.fast_forward('02:10'); q.wait_for_timeout(2000)
        tx = q.inner_text('#vehchg') if q.locator('#vehchg').count() else ''
        check(tx and ('Fahrzeugakte' in tx) == (lang == 'de'), f'{lang} {vw} px: Hinweis „{tx.strip()}“')
        vis = q.evaluate("() => { const b = document.getElementById('vehchg'); if (!b) return false; const r = b.getBoundingClientRect(); return scrollY > 50 && r.top >= 0 && r.bottom <= innerHeight; }")
        check(vis, f'{lang} {vw} px: Hinweis bleibt weiter unten in der Akte sichtbar (oben angeheftet)')
        m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/akte-geaendert-{vw}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
