# [CLAUDE] UI-Test (07.11.2026, Backlog 1112, Blickwinkel „Disposition mit zwei Browserfenstern nebeneinander (je 960 px) am 1920-px-Monitor“):
#  Die Startseite der Disposition blieb in einem dauerhaft sichtbaren Fenster auf dem Stand des Öffnens (neue Sperre fehlte stundenlang).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (nur Startseite, ohne „Lädt…“, Scrollposition bleibt),
#  Abfragen als Hintergrund (x-cfp-bg, verlängern die Sitzung nicht), andere Seiten unverändert, Fahrer ohne Standzeile.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sa.inhaber', 'display_name': 'SA Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'sa.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    for role, un in [('dispatch', 'sa.dispo'), ('driver', 'sa.fahrer')]:
        u = api('POST', '/api/users', {'username': un, 'display_name': 'SA ' + role, 'role': role, 'environment': 'production'})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    vins = []
    for i in range(6):
        vin = f'WSA{i:05d}000000000'[:17]; vins.append(vin)
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'SA-W {900 + i}', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, f'Lkw SA-W {900 + i}')
    for i in (0, 2):
        api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': 'Bremse hinten links quietscht stark beim Anfahren auf dem Betriebshof (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})

    # --- zwei Fenster nebeneinander (je 960 px), gleiche Anmeldung
    ctx = br.new_context(viewport={'width': 960, 'height': 640}); ctx.clock.install()
    w1 = ctx.new_page(); errs = []; w1.on('pageerror', lambda e: errs.append(str(e)))
    w1.goto(B); check(w1.evaluate(JS, ['POST', '/api/login', {'username': 'sa.dispo', 'password': PW}])['s'] == 200, 'Anmeldung Disposition')
    w1.goto(B + '/#/'); w1.wait_for_selector('#homeasof', timeout=15000)
    w2 = ctx.new_page(); w2.on('pageerror', lambda e: errs.append(str(e))); w2.goto(B + '/#/cases'); w2.wait_for_selector('main h1', timeout=15000); w2.wait_for_timeout(800)
    t0 = w1.inner_text('#homeasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Startseite nennt den Stand: „{t0}“')
    check('SA-W 905' not in w1.inner_text('main'), 'vorher: SA-W 905 nicht auf der Startseite')
    m = w1.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
    check(m['sw'] <= m['cw'], f'960 px: kein Überstand ({m["sw"]}/{m["cw"]})')
    n2 = w2.inner_text('main')
    # neue Meldung „nicht fahrbereit“ (Sperre) durch die Leitung, während beide Fenster offen sind
    r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[5], 'description': 'Lenkung schlägt stark, Fahrzeug nicht fahrbereit (Test)', 'priority': 'kritisch', 'driveability': 'nicht_fahrbereit', 'request_key': str(uuid.uuid4())})
    check(r['s'] in (200, 201), 'neue Sperre SA-W 905 gemeldet')
    w1.evaluate("() => window.scrollTo(0, 200)"); y0 = w1.evaluate("() => window.scrollY")
    ctx.clock.fast_forward('02:00'); w1.wait_for_timeout(500)
    check('SA-W 905' not in w1.inner_text('main'), 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []; loading = []
    w1.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w1.evaluate("() => { const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); }")
    w1.evaluate("() => { document.getElementById('homeasof').dataset.old = '1'; }")
    ctx.clock.fast_forward('03:30'); w1.wait_for_timeout(1500)
    txt = w1.inner_text('main')
    check('SA-W 905' in txt, 'nach 5 Min.: neue Sperre SA-W 905 erscheint ohne Neuladen')
    check(w1.evaluate("() => !document.getElementById('homeasof').dataset.old"), 'Standzeile neu geschrieben (Uhrzeit nach Server-Uhr, Geräteuhr hier künstlich vorgestellt)')
    check(not w1.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild bei der stillen Aktualisierung')
    dash = [h for u, h in reqs if '/api/dashboard' in u]
    check(dash and all(h == '1' for h in dash), f'Abfragen der Aktualisierung als Hintergrund (x-cfp-bg) – verlängern die Sitzung nicht ({len(dash)})')
    y1 = w1.evaluate("() => window.scrollY")
    check(y0 > 100 and y1 >= y0 - 5, f'Scrollposition bleibt, kein Sprung nach oben ({y0} → {y1}; neue Karte oben darf verschieben)')
    check(w1.url.endswith('#/'), 'Fenster 1 bleibt auf der Startseite')
    check(w2.inner_text('main') == n2, 'Fenster 2 (Vorgangsliste) wird nicht still umgebaut')
    # Eingabe/Fokus im Formular: keine Aktualisierung
    api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[4], 'description': 'Spiegel rechts abgebrochen, nicht fahrbereit (Test)', 'priority': 'kritisch', 'driveability': 'nicht_fahrbereit', 'request_key': str(uuid.uuid4())})
    w1.evaluate("() => { const i = document.createElement('input'); i.id = 'tmpin'; document.querySelector('main').appendChild(i); i.focus(); }")
    ctx.clock.fast_forward('06:00'); w1.wait_for_timeout(1000)
    check('SA-W 904' not in w1.inner_text('main'), 'Fokus in einem Eingabefeld: keine stille Aktualisierung')
    w1.evaluate("() => document.getElementById('tmpin').remove()")
    # Knopf „Neu laden“
    w1.click('#homereload'); w1.wait_for_timeout(1500)
    check('SA-W 904' in w1.inner_text('main'), '„Neu laden“ holt den aktuellen Stand sofort')
    check(w1.url.endswith('#/'), '„Neu laden“ bleibt auf der Startseite')
    if SHOTS: w1.screenshot(path=f'{SHOTS}/startseite-stand-960.png')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte
    for lang, (w, h), want in [('uk', (390, 844), 'Станом на'), ('en', (820, 1180), 'As of'), ('de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'sa.dispo', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/more'); q.wait_for_timeout(500); q.goto(B + '/#/'); q.reload(); q.wait_for_selector('#homeasof', timeout=15000)
        tx = q.inner_text('#homeasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {w} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {w} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/startseite-stand-{w}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    # Fahrer: keine Standzeile (eigene Startseite mit Offline-Logik)
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B)
    q.evaluate(JS, ['POST', '/api/login', {'username': 'sa.fahrer', 'password': PW}]); q.goto(B + '/#/'); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(800)
    check(q.locator('#homeasof').count() == 0, 'Fahrer: keine Standzeile')
    c.close(); br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
