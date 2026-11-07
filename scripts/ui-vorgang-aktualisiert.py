# [CLAUDE] UI-Test (07.11.2026, Backlog 1117, Blickwinkel „Fuhrparkleitung hat einen Vorgang den ganzen Tag offen, die Werkstatt arbeitet daran“):
#  Der geöffnete Vorgang blieb auf dem Stand des Öffnens. Jetzt fragt die App ihn alle 2 Min. im Hintergrund ab (x-cfp-bg) und baut ihn bei
#  einer Änderung still neu auf (kurzer Hinweis); unverändert passiert nichts. Bei Eingaben nur der Hinweis „inzwischen geändert · Neu laden“,
#  Eingaben bleiben. DE/UK/EN 390/820/1366 px, kein Überstand; Screenshots mit CFP_SHOTS.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'va.inhaber', 'display_name': 'VA Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'va.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    fu = api('POST', '/api/users', {'username': 'va.leitung', 'display_name': 'VA Leitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': fu['d']['invite_token'], 'password': PW}]); c0.close()
    check(api('POST', '/api/vehicles', {'vin': 'WVA00000000000001', 'plate': 'VA-L 910', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, 'Lkw VA-L 910')
    r = api('POST', '/api/cases', {'vehicle_id': 'VIN:WVA00000000000001', 'description': 'Spiegel rechts lose (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
    check(r['s'] in (200, 201), 'Meldung zu VA-L 910'); cid = r['d']['case']['id'] if r['d'] and 'case' in r['d'] else r['d']['id']
    def kommentar(txt):
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        rr = api('POST', f'/api/cases/{cid}/commands', {'action': 'comment', 'command_id': str(uuid.uuid4()), 'expected_version': v, 'note': txt})
        check(rr['s'] == 200, f'Inhaber kommentiert „{txt}“ ({rr["s"]})')

    ctx = br.new_context(viewport={'width': 960, 'height': 1000}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': 'va.leitung', 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + f'/#/cases/{cid}'); w.wait_for_selector('#cf', timeout=15000); w.wait_for_timeout(800)
    w.evaluate("() => { document.querySelector('h1').dataset.mark = '1'; }")
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/cases/' in q.url else None)
    # unverändert: keine Neuaufbau
    w.clock.fast_forward('02:10'); w.wait_for_timeout(1500)
    check(any('/api/cases/' in u for u, _ in reqs), 'nach 2 Min.: Vorgang im Hintergrund abgefragt')
    check(w.locator('h1[data-mark]').count() == 1, 'unverändert: Seite wird nicht neu aufgebaut')
    # Änderung durch andere Person → still neu aufgebaut
    kommentar('Teil bestellt, Einbau morgen')
    w.clock.fast_forward('02:10'); w.wait_for_timeout(2000)
    check('Teil bestellt, Einbau morgen' in w.inner_text('main'), 'neuer Kommentar erscheint ohne Neuladen')
    check(w.locator('h1[data-mark]').count() == 0, 'Seite neu aufgebaut')
    check(any('inzwischen geändert' in x for x in w.locator('.toast').all_inner_texts()), 'kurzer Hinweis „inzwischen geändert – Ansicht aktualisiert“')
    gets = [h for u, h in reqs if u.rstrip('/').endswith(cid)]
    check(gets and all(h == '1' for h in gets), f'Abfragen als Hintergrund (x-cfp-bg) – verlängern die Sitzung nicht ({len(gets)})')
    check(w.url.endswith(f'#/cases/{cid}'), 'Fenster bleibt auf dem Vorgang')
    # Eingabe im Kommentarfeld: nur Hinweis, Eingabe bleibt
    w.fill('#ct', 'Meine halbe Notiz'); w.evaluate("() => document.activeElement.blur()")
    kommentar('Werkstatt meldet: fertig gegen 15 Uhr')
    w.clock.fast_forward('02:10'); w.wait_for_timeout(2000)
    check('fertig gegen 15 Uhr' not in w.inner_text('main'), 'mit Eingabe: Seite wird nicht neu aufgebaut')
    check(w.locator('#casechg').count() == 1 and 'inzwischen geändert' in w.inner_text('#casechg'), 'stattdessen Hinweis „inzwischen geändert · Neu laden“')
    check(w.input_value('#ct') == 'Meine halbe Notiz', 'Eingabe bleibt stehen')
    if SHOTS: w.screenshot(path=f'{SHOTS}/vorgang-geaendert-banner-960.png')
    w.click('#casechgre'); w.wait_for_timeout(1500)
    check('fertig gegen 15 Uhr' in w.inner_text('main'), '„Neu laden“ zeigt den neuen Stand')
    check(w.input_value('#ct') == 'Meine halbe Notiz', 'Eingabe bleibt auch nach „Neu laden“')
    check(w.locator('#casechg').count() == 0, 'Hinweis nach dem Neuladen weg')
    # andere Seite: Vorgang wird nicht darüber geschrieben
    w.fill('#ct', ''); w.goto(B + '/#/cases'); w.wait_for_selector('#cl', timeout=15000)
    kommentar('noch ein Kommentar')
    w.clock.fast_forward('02:10'); w.wait_for_timeout(1500)
    check(w.url.endswith('#/cases') and w.locator('#cf').count() == 0, 'Vorgangsliste bleibt, kein Vorgang darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # Sprachen und Geräte: Eingabe → Hinweis in der Sprache, kein Überstand
    for k, (lang, (vw, vh)) in enumerate([('uk', (390, 844)), ('en', (820, 1180)), ('de', (1366, 900))]):
        c = br.new_context(viewport={'width': vw, 'height': vh}); c.clock.install(); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'va.leitung', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#cf', timeout=15000); q.wait_for_timeout(800)
        q.fill('#ct', 'x y z'); q.evaluate("() => document.activeElement.blur()")
        kommentar(f'Sprachtest {lang}')
        q.clock.fast_forward('02:10'); q.wait_for_timeout(2000)
        tx = q.inner_text('#casechg') if q.locator('#casechg').count() else ''
        check(tx and ('Vorgang' in tx) == (lang == 'de'), f'{lang} {vw} px: Hinweis „{tx.strip()}“')
        vis = q.evaluate("() => { const b = document.getElementById('casechg'); if (!b) return false; const r = b.getBoundingClientRect(); return scrollY > 50 && r.top >= 0 && r.bottom <= innerHeight; }")
        check(vis, f'{lang} {vw} px: Hinweis bleibt beim Tippen unten im Kommentarfeld sichtbar (oben angeheftet)')
        m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgang-geaendert-{vw}-{lang}.png')
        q.fill('#ct', ''); q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
