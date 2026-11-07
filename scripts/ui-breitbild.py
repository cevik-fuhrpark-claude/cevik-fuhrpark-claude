# [CLAUDE] UI-Test (07.11.2026, Backlog 1111, Blickwinkel „Inhaber am Breitbildmonitor 2560 px“):
#  Bis 1799 px bleibt der Inhalt 1100 px breit, ab 1800 px 1400 px (nur Bildschirm, Druck unverändert ohne Grenze).
#  Management-Panel: Spaltenköpfe der Vorgangstabelle einzeilig bei 2560 px; kein waagrechter Überstand auf typischen Leitungsseiten.
# Breiten 1366/1799/1800/2560 px, Sprachen DE/UK/EN. Voraussetzung: frischer Entwicklungsserver. Nur synthetische Testdaten.
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); adm = br.new_page(); adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'bb.inhaber', 'display_name': 'BB Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': 'bb.inhaber', 'password': PW})
    vid = None
    for i in range(5):
        vin = f'WBB{i:05d}0000000000'[:17]
        check(api('POST', '/api/vehicles', {'plate': f'BB-W {700 + i}', 'vin': vin, 'kind': 'lkw', 'site': 'Dortmund'})['s'] == 201, f'Lkw BB-W {700 + i}')
        vid = vid or 'VIN:' + vin
        api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Bremse hinten links quietscht beim Anfahren am Hof (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'bb{i}'})
    pages = ['master', 'cases', 'vehicles', 'kpi', 'costs', 'defects', 'users', 'audit', 'new', 'v/' + vid]
    for w, lang in [(1366, 'de'), (1799, 'uk'), (1800, 'en'), (2560, 'de')]:
        print(f'— {w} px / {lang}')
        ctx = br.new_context(viewport={'width': w, 'height': 1200}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/login', {'username': 'bb.inhaber', 'password': PW}])
        check(pg.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])['s'] == 200, f'Sprache {lang}')
        expect = 1400 if w >= 1800 else 1100
        pg.goto(B + '/#/master'); pg.wait_for_timeout(800); pg.reload(); pg.wait_for_timeout(1200)
        check(pg.evaluate("() => document.documentElement.lang") == lang, f'Oberfläche in {lang}')
        for h in pages:
            pg.goto(B + '/#/' + h); pg.wait_for_timeout(1200)
            m = pg.evaluate("() => ({ mw: document.querySelector('main').getBoundingClientRect().width, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
            check(abs(m['mw'] - expect) < 1 and m['sw'] <= m['cw'], f'#/{h}: Inhalt {m["mw"]:.0f} px (erwartet {expect}), kein Überstand ({m["sw"]}/{m["cw"]})')
            if SHOTS and h == 'master': pg.screenshot(path=f'{SHOTS}/breitbild-{w}-{lang}.png')
        if w == 2560:
            pg.goto(B + '/#/master'); pg.wait_for_timeout(1500)
            hs = pg.evaluate("() => [...document.querySelectorAll('main table thead th')].map((th) => { const r = th.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(th).lineHeight) || 20; return th.textContent.trim() ? r.height < lh * 1.6 + 16 : true; })")
            check(hs and all(hs), f'Management-Panel: Spaltenköpfe der Vorgangstabelle einzeilig ({len(hs)} Spalten)')
            pg.emulate_media(media='print')
            check(pg.evaluate("() => getComputedStyle(document.querySelector('main')).maxWidth") == 'none', 'Druck: Inhalt ohne Breitengrenze (wie bisher)')
            pg.emulate_media(media='screen')
        check(not errs, f'keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
