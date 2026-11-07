# [CLAUDE] UI-Test (07.11.2026, Backlog 1116, Blickwinkel „Fuhrparkleitung am PC ohne Push-Erlaubnis hat ‚Hinweise‘ den ganzen Tag offen“):
#  Ohne Push zählte die Glocke neue Hinweise, die geöffnete Liste blieb aber auf dem Stand des Öffnens. Jetzt baut sich die Liste still neu
#  auf, sobald die Zahl steigt (Hintergrund-Abfrage x-cfp-bg, Filter bleibt) – bei Eingaben/aufgeklapptem Bereich/nachgeladenen älteren
#  Hinweisen nur der Hinweis „Liste aktualisieren“. DE/UK/EN 390/820/1366 px, kein Überstand; Screenshots mit CFP_SHOTS.
# Voraussetzung: frischer Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hw.inhaber', 'display_name': 'HW Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'hw.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    fu = api('POST', '/api/users', {'username': 'hw.leitung', 'display_name': 'HW Leitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': fu['d']['invite_token'], 'password': PW}]); c0.close()
    vins = []
    for i in range(6):
        vin = f'WHW{i:05d}000000000'[:17]; vins.append(vin)
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'HW-L {900 + i}', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, f'Lkw HW-L {900 + i}')
    def melden(i):
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': 'Bremse quietscht beim Anfahren (Test)', 'priority': 'kritisch', 'driveability': 'eingeschraenkt', 'request_key': str(uuid.uuid4())})
        check(r['s'] in (200, 201), f'kritische Meldung zu HW-L {900 + i}')
    melden(0)

    ctx = br.new_context(viewport={'width': 960, 'height': 1000}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': 'hw.leitung', 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + '/#/inbox'); w.wait_for_selector('#nlist', timeout=15000); w.wait_for_timeout(800)
    n0 = w.locator('#nlist [data-ack], #nlist a').count()
    check('HW-L 900' in w.inner_text('#nlist'), 'vorher: Hinweis zu HW-L 900 in der Liste')
    check('HW-L 901' not in w.inner_text('#nlist'), 'vorher: HW-L 901 noch nicht')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    melden(1)
    ctx.clock.fast_forward('02:10'); w.wait_for_timeout(2000)
    check('HW-L 901' in w.inner_text('#nlist'), 'nach 2 Min. (Glocke fragt nach): neuer Hinweis HW-L 901 erscheint ohne Neuladen')
    nl = [h for u, h in reqs if '/api/notifications' in u]
    check(nl and all(h == '1' for h in nl), f'Abfragen als Hintergrund (x-cfp-bg) – verlängern die Sitzung nicht ({len(nl)})')
    check(w.locator('#nnew').count() == 0, 'kein Zusatzhinweis bei stiller Aktualisierung')
    check(w.url.endswith('#/inbox'), 'Fenster bleibt auf „Hinweise“')
    # aufgeklappter Bereich „Push für diese Hinweise“: nur Hinweis, Liste bleibt
    w.click('#np summary'); w.wait_for_timeout(600); w.evaluate("() => document.activeElement.blur()")
    melden(2)
    ctx.clock.fast_forward('02:10'); w.wait_for_timeout(2000)
    check('HW-L 902' not in w.inner_text('#nlist'), 'aufgeklappter Bereich: Liste wird nicht neu aufgebaut')
    check(w.locator('#nnew').count() == 1 and w.evaluate("() => document.getElementById('np').open"), 'stattdessen Hinweis „Liste aktualisieren“, Bereich bleibt offen')
    if SHOTS: w.screenshot(path=f'{SHOTS}/hinweise-neu-banner-960.png')
    w.click('#nnewb'); w.wait_for_timeout(1500)
    check('HW-L 902' in w.inner_text('#nlist'), 'Knopf „Liste aktualisieren“ zeigt den neuen Hinweis')
    # andere Seite: Liste wird nicht darüber geschrieben
    w.goto(B + '/#/cases'); w.wait_for_selector('#cl', timeout=15000)
    melden(3)
    ctx.clock.fast_forward('02:10'); w.wait_for_timeout(1500)
    check(w.url.endswith('#/cases') and w.locator('#nlist').count() == 0, 'Vorgangsliste bleibt, keine Hinweisliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # Sprachen und Geräte: aufgeklappter Bereich → Hinweis „Liste aktualisieren“ in der Sprache, kein Überstand
    for k, (lang, (vw, vh)) in enumerate([('uk', (390, 844)), ('en', (820, 1180)), ('de', (1366, 900))]):
        c = br.new_context(viewport={'width': vw, 'height': vh}); c.clock.install(); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'hw.leitung', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/inbox'); q.reload(); q.wait_for_selector('#nlist', timeout=15000); q.wait_for_timeout(800)
        q.click('#np summary'); q.wait_for_timeout(500); q.evaluate("() => document.activeElement.blur()")
        melden(4 + k % 2)
        q.clock.fast_forward('02:10'); q.wait_for_timeout(2000)
        tx = q.inner_text('#nnew') if q.locator('#nnew').count() else ''
        check(tx and ('Hinweise' in tx) == (lang == 'de'), f'{lang} {vw} px: Hinweis „{tx.strip()}“')
        m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/hinweise-{vw}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
