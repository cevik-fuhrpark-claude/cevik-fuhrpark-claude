# [CLAUDE] UI-Test Backlog 1047 (Blickwinkel „Lkw wechselt dauerhaft den Standort“): Freigabe-Formular „Reparatur freigeben“
# - Meldung ohne Werkstattvorschlag: Werkstatt zum Fahrzeugstandort ist vorgewählt (nicht still die erste der Liste)
# - Fahrzeug an einem Standort ohne passende Werkstatt: „–“ vorgewählt, Pflichtauswahl (Speichern ohne Wahl nicht möglich)
# - Vorschlag weicht von der Werkstatt am Fahrzeugstandort ab: Hinweis (DE/UK/EN), kein waagrechtes Scrollen (390/820/1280 px)
# Voraussetzung: frischer lokaler Entwicklungsserver (sh scripts/restart-dev.sh). Aufruf: python3 scripts/ui-freigabe-standort.py [Screenshot-Ordner]
import sys, os
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT = {'de': 'laut Stammdaten', 'uk': 'За основними даними', 'en': 'According to the master data'}


def fail(msg):
    print('FEHLER: ' + msg)
    sys.exit(1)


with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 390, 'height': 844})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B)
    api = lambda m, path, body=None: pg.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fs.inhaber', 'display_name': 'Standort Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    wss = api('GET', '/api/meta')['d']['workshops']
    codes = [w['code'] for w in wss if w['code'] != 'EXTERN']
    if len(codes) < 2:
        fail(f'mindestens zwei Werkstätten erwartet: {codes}')
    first, second = codes[0], codes[1]
    site2 = [w['name'] for w in wss if w['code'] == second][0]
    # Fahrzeug A am Standort der zweiten Werkstatt, Fahrzeug B an einem Standort ohne Werkstatt
    for plate, vin, site in [('FS-A 1', 'WDB96340310650001', second), ('FS-B 2', 'WDB96340310650002', 'Irgendwo')]:
        r = api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': site})
        if r['s'] not in (200, 201):
            fail(f'Fahrzeug {plate}: {r}')
    mk = lambda vin, extra: api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Standorttest Spiegel locker', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': os.urandom(8).hex(), **extra})['d']['id']
    c_none = mk('WDB96340310650001', {})                          # ohne Vorschlag → Werkstatt am Standort
    c_other = mk('WDB96340310650001', {'workshop_site': first})   # Vorschlag ≠ Standort → Hinweis
    c_nosite = mk('WDB96340310650002', {})                        # keine Werkstatt am Standort → „–“

    def open_form(cid):
        pg.goto(f'{B}/#/cases/{cid}')
        pg.wait_for_selector('[data-act="approve_repair"]', timeout=8000)
        pg.locator('[data-act="approve_repair"]').first.click()
        pg.wait_for_selector('#af select[name="workshop_site"]')
        return pg.locator('#af select[name="workshop_site"]')

    sel = open_form(c_none)
    if sel.input_value() != second:
        fail(f'ohne Vorschlag: {second} erwartet, vorgewählt {sel.input_value()}')
    if pg.locator('[data-apwshint]').count():
        fail('ohne Abweichung kein Hinweis erwartet')
    sel = open_form(c_nosite)
    if sel.input_value() != '':
        fail(f'Standort ohne Werkstatt: „–“ erwartet, vorgewählt {sel.input_value()}')
    if not pg.evaluate("() => document.querySelector('#af select[name=\"workshop_site\"]').required"):
        fail('Werkstatt ist keine Pflichtauswahl')
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        pg.reload()
        sel = open_form(c_other)
        if sel.input_value() != first:
            fail(f'{lang}: Vorschlag {first} soll erhalten bleiben, vorgewählt {sel.input_value()}')
        h = pg.locator('[data-apwshint]')
        if not h.count() or HINT[lang] not in h.text_content() or site2 not in h.text_content():
            fail(f'{lang}: Hinweis zum Fahrzeugstandort fehlt: {h.text_content() if h.count() else "–"}')
        for w, hh in [(390, 844), (820, 1180), (1280, 900)]:
            pg.set_viewport_size({'width': w, 'height': hh})
            pg.wait_for_timeout(200)
            over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            if over > 2:
                fail(f'{lang} {w}px: {over}px waagrecht zu breit')
            if OUT:
                os.makedirs(OUT, exist_ok=True)
                h.scroll_into_view_if_needed()
                pg.screenshot(path=os.path.join(OUT, f'freigabe_standort_{lang}_{w}.png'))
        pg.set_viewport_size({'width': 390, 'height': 844})
    if errs:
        fail('JS-Fehler: ' + '; '.join(errs[:3]))
    print('OK: Freigabe-Formular – Werkstatt am Fahrzeugstandort vorgewählt, „–“ ohne passende Werkstatt (Pflicht), Hinweis bei abweichendem Vorschlag (DE/UK/EN, 390/820/1280 px)')
    br.close()
