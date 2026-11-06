# [CLAUDE] UI-Test Backlog 1049 (Blickwinkel „Lkw wechselt dauerhaft den Standort“): Kostenbericht zeigt beim versetzten Lkw den Chip
# „Standort gewechselt“ und im aufgeklappten Fahrzeug Datum und alt → neu; Fahrzeug ohne Wechsel ohne Vermerk. DE/UK/EN, 390/820/1280 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Aufruf: python3 scripts/ui-kosten-standortwechsel.py [Screenshot-Ordner]
import os, sys, uuid, datetime
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
OUT = sys.argv[1] if len(sys.argv) > 1 else None
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CHIP = {'de': 'Standort gewechselt', 'uk': 'Локацію змінено', 'en': 'Site changed'}


def fail(m):
    print('FEHLER: ' + m); sys.exit(1)


with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B); api = lambda m, pa, b=None: pg.evaluate(JS, [m, pa, b])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ks.inhaber', 'display_name': 'KS Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    ws = [w['code'] for w in api('GET', '/api/meta')['d']['workshops'] if w['code'] != 'EXTERN'][0]
    for plate, vin in [('KS-AB 1', 'WDB96340310660001'), ('KS-AB 2', 'WDB96340310660002')]:
        if api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})['s'] != 201:
            fail('Fahrzeug ' + plate)
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Kostentest Standort', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})['d']['id']
        for act, pl in [('approve_repair', {'workshop_site': ws}), ('add_external_cost', {'supplier': 'Testfirma', 'amount_net': 100})]:
            v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
            r = api('POST', f'/api/cases/{cid}/commands', {'action': act, 'command_id': str(uuid.uuid4()), 'expected_version': v, 'payload': pl, 'note': 'UI-Test'})
            if r['s'] != 200:
                fail(f'{act}: {r}')
    if api('POST', '/api/vehicles', {'plate': 'KS-AB 1', 'vin': 'WDB96340310660001', 'site': 'Bayern', 'keep_active': True})['s'] != 201:
        fail('Standortwechsel')
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        for w, h in [(390, 844), (820, 1180), (1280, 900)]:
            pg.set_viewport_size({'width': w, 'height': h})
            pg.goto(B + '/#/costs'); pg.reload()
            pg.wait_for_selector('[data-csitechip]', timeout=15000)
            chips = pg.locator('[data-csitechip]')
            if chips.count() != 1 or CHIP[lang] not in chips.first.text_content():
                fail(f'{lang} {w}px: genau ein Chip „{CHIP[lang]}“ erwartet ({chips.count()})')
            row = chips.first.locator('xpath=ancestor::details[1]')
            if 'KS-AB 1' not in row.text_content():
                fail(f'{lang}: Chip am falschen Fahrzeug')
            row.locator('summary').click()
            hint = row.locator('[data-csite]')
            if not hint.is_visible() or 'Dortmund → Bayern' not in hint.text_content():
                fail(f'{lang} {w}px: Hinweis fehlt: {hint.text_content() if hint.count() else "–"}')
            over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            if over > 2:
                fail(f'{lang} {w}px: {over}px zu breit')
            if OUT:
                os.makedirs(OUT, exist_ok=True); hint.scroll_into_view_if_needed()
                pg.screenshot(path=os.path.join(OUT, f'kosten_standort_{lang}_{w}.png'))
    if errs:
        fail('JS-Fehler: ' + '; '.join(errs[:3]))
    print('OK: Kostenbericht – Chip „Standort gewechselt“ und Hinweis mit Datum/alt → neu am versetzten Lkw (DE/UK/EN, 390/820/1280 px)')
    br.close()
