# [CLAUDE] UI-Test (07.11.2026, Backlog 1113, Blickwinkel „Fuhrparkleitung hat Vorgangsliste und Vorgang in zwei Fenstern“):
#  Die Vorgangsliste blieb in einem dauerhaft sichtbaren Fenster auf dem Stand des Öffnens (neue Meldungen fehlten, bis man den Reiter
#  wechselte). Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung nur der Liste alle 5 Min. (Reiter/Suche/Sortierung bleiben),
#  Abfrage als Hintergrund (x-cfp-bg), nie bei Fokus/ungesuchter Eingabe im Suchfeld, Fahrer ohne Standzeile.
#  Zwei Fenster 960 px (ein Browserprofil), DE/UK/EN, kein Überstand; Screenshots 390/820/1366 px mit CFP_SHOTS.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vl.inhaber', 'display_name': 'VL Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'vl.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    for role, un in [('fleet', 'vl.leitung'), ('driver', 'vl.fahrer')]:
        u = api('POST', '/api/users', {'username': un, 'display_name': 'VL ' + role, 'role': role, 'environment': 'production'})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    vins = []
    for i in range(6):
        vin = f'WVL{i:05d}000000000'[:17]; vins.append(vin)
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'VL-W {800 + i}', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, f'Lkw VL-W {800 + i}')
    mk = lambda i, txt: api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': txt, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
    for i in (0, 1): mk(i, 'Bremse hinten links quietscht stark beim Anfahren auf dem Betriebshof (Test)')

    # --- zwei Fenster nebeneinander (je 960 px): links Liste, rechts ein Vorgang
    ctx = br.new_context(viewport={'width': 960, 'height': 640}); ctx.clock.install()
    w1 = ctx.new_page(); errs = []; w1.on('pageerror', lambda e: errs.append(str(e)))
    w1.goto(B); check(w1.evaluate(JS, ['POST', '/api/login', {'username': 'vl.leitung', 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w1.goto(B + '/#/cases'); w1.wait_for_selector('#casesasof', timeout=15000); w1.wait_for_timeout(500)
    t0 = w1.inner_text('#casesasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Vorgangsliste nennt den Stand: „{t0}“')
    m = w1.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
    check(m['sw'] <= m['cw'], f'960 px: kein Überstand ({m["sw"]}/{m["cw"]})')
    check('VL-W 805' not in w1.inner_text('#cl'), 'vorher: VL-W 805 nicht in der Liste')
    # Sortierung wählen (bleibt bei der stillen Aktualisierung)
    w1.select_option('#csort', index=1); w1.wait_for_timeout(800); sort0 = w1.eval_on_selector('#csort', 'e => e.value')
    w2 = ctx.new_page(); w2.on('pageerror', lambda e: errs.append(str(e))); w2.goto(B + '/#/cases'); w2.wait_for_selector('#cl', timeout=15000); w2.wait_for_timeout(500)
    mk(5, 'Spiegel rechts abgebrochen, Fahrzeug fahrbereit (Test)')
    ctx.clock.fast_forward('02:00'); w1.wait_for_timeout(500)
    check('VL-W 805' not in w1.inner_text('#cl'), 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w1.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w1.evaluate("() => { document.getElementById('casesreload').dataset.old = '1'; document.querySelector('h1').dataset.keep = '1'; }")
    ctx.clock.fast_forward('03:30'); w1.wait_for_timeout(1500)
    check('VL-W 805' in w1.inner_text('#cl'), 'nach 5 Min.: neue Meldung VL-W 805 erscheint ohne Neuladen')
    check(w1.evaluate("() => !document.getElementById('casesreload').dataset.old"), 'Standzeile neu geschrieben (Knopf „Neu laden“ neu gebunden)')
    check(w1.evaluate("() => document.querySelector('h1').dataset.keep === '1'"), 'nur die Liste neu, Seite nicht neu aufgebaut')
    check(w1.eval_on_selector('#csort', 'e => e.value') == sort0, f'Sortierung bleibt ({sort0})')
    lst = [h for u, h in reqs if '/api/cases' in u]
    check(lst and all(h == '1' for h in lst), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(lst)})')
    check(w1.url.endswith('#/cases'), 'Fenster bleibt auf der Vorgangsliste')
    # Suchfeld: Fokus bzw. getippte, noch nicht gesuchte Eingabe schützt
    mk(4, 'Kühlwasser verliert Flüssigkeit, bitte prüfen (Test)')
    w1.focus('#cq'); ctx.clock.fast_forward('06:00'); w1.wait_for_timeout(1000)
    check('VL-W 804' not in w1.inner_text('#cl'), 'Fokus im Suchfeld: keine stille Aktualisierung')
    w1.evaluate("() => { const i = document.getElementById('cq'); i.value = 'VL'; i.blur(); }")
    ctx.clock.fast_forward('06:00'); w1.wait_for_timeout(1000)
    check('VL-W 804' not in w1.inner_text('#cl'), 'getippte, noch nicht gesuchte Eingabe: keine stille Aktualisierung')
    w1.evaluate("() => { document.getElementById('cq').value = ''; }")
    # Knopf „Neu laden“
    w1.click('#casesreload'); w1.wait_for_timeout(1500)
    check('VL-W 804' in w1.inner_text('#cl'), '„Neu laden“ holt den aktuellen Stand sofort')
    check(w1.url.endswith('#/cases'), '„Neu laden“ bleibt auf der Vorgangsliste')
    # anderer Bildschirm (Vorgang offen): Liste wird nicht über den Vorgang geschrieben
    w2.click('#cl a[href^="#/cases/"]'); w2.wait_for_timeout(1200); u2 = w2.url
    ctx.clock.fast_forward('06:00'); w2.wait_for_timeout(1000)
    check(w2.url == u2 and w2.locator('#cl').count() == 0, 'Vorgang im Fenster 2 bleibt unverändert offen')
    if SHOTS: w1.screenshot(path=f'{SHOTS}/vorgangsliste-stand-960.png')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte
    for lang, (w, h), want in [('uk', (390, 844), 'Станом на'), ('en', (820, 1180), 'As of'), ('de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'vl.leitung', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/more'); q.wait_for_timeout(500); q.goto(B + '/#/cases'); q.reload(); q.wait_for_selector('#casesasof', timeout=15000)
        tx = q.inner_text('#casesasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {w} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {w} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgangsliste-stand-{w}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    # Fahrer: keine Standzeile
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B)
    q.evaluate(JS, ['POST', '/api/login', {'username': 'vl.fahrer', 'password': PW}]); q.goto(B + '/#/cases'); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(800)
    check(q.locator('#casesasof').count() == 0, 'Fahrer: keine Standzeile')
    c.close(); br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
