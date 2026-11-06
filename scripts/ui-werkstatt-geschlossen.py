# [CLAUDE] UI-Test Backlog 1051 (Blickwinkel „Werkstatt Bayern schließt, Aufträge gehen nach Dortmund“): Freigabe-Formular „Reparatur freigeben“
# - Meldung mit Vorschlag einer inzwischen geschlossenen Werkstatt: nicht still die erste aktive Werkstatt, sondern die Werkstatt am Fahrzeugstandort
#   (bzw. „–“ mit Pflichtauswahl, wenn es dort keine gibt) und Hinweis „vorgeschlagene Werkstatt geschlossen“ (DE/UK/EN, 390/820/1280 px)
# - Backlog 1052: Werkstatt-Auslastung zeigt die geschlossene Werkstatt mit Restauftrag mit Namen und „(geschlossen)“, nicht nur den Code
# Voraussetzung: frischer lokaler Entwicklungsserver (sh scripts/restart-dev.sh). Aufruf: python3 scripts/ui-werkstatt-geschlossen.py [Screenshot-Ordner]
import sys, os
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT = {'de': 'ist geschlossen', 'uk': 'закрита', 'en': 'is closed'}


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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wg.inhaber', 'display_name': 'Geschlossen Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    wss = api('GET', '/api/meta')['d']['workshops']
    codes = [w['code'] for w in wss if w['code'] != 'EXTERN']
    if len(codes) < 2:
        fail(f'mindestens zwei Werkstätten erwartet: {codes}')
    keep, close = codes[0], codes[1]
    close_name = [w['name'] for w in wss if w['code'] == close][0]
    for plate, vin, site in [('WG-A 1', 'WDB96340310651001', keep), ('WG-B 2', 'WDB96340310651002', 'Irgendwo')]:
        r = api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': site})
        if r['s'] not in (200, 201):
            fail(f'Fahrzeug {plate}: {r}')
    mk = lambda vin: api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Werkstatt schließt Spiegel locker', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': os.urandom(8).hex(), 'workshop_site': close})['d']['id']
    c_site = mk('WDB96340310651001')    # Vorschlag geschlossene Werkstatt, Fahrzeugstandort hat Werkstatt → diese vorwählen
    c_nosite = mk('WDB96340310651002')  # Vorschlag geschlossene Werkstatt, Standort ohne Werkstatt → „–“
    # Backlog 1052: freigegebener Auftrag bei der später geschlossenen Werkstatt → Werkstatt-Auslastung zeigt Namen mit „(geschlossen)“
    c_rest = mk('WDB96340310651001')
    v = api('GET', f'/api/cases/{c_rest}')['d']['case']['version']
    r = api('POST', f'/api/cases/{c_rest}/commands', {'action': 'approve_repair', 'command_id': os.urandom(8).hex(), 'expected_version': v, 'payload': {'workshop_site': close}, 'note': 'UI-Test Restauftrag'})
    if r['s'] != 200:
        fail(f'Freigabe Restauftrag: {r}')
    r = pg.evaluate("async (u) => (await fetch(u, { method: 'POST' })).json()", f'/__dev/workshop-active?code={close}&active=0')
    if r.get('changed') != 1:
        fail(f'Werkstatt {close} nicht geschlossen: {r}')

    def open_form(cid):
        pg.goto(f'{B}/#/cases/{cid}')
        pg.wait_for_selector('[data-act="approve_repair"]', timeout=8000)
        pg.locator('[data-act="approve_repair"]').first.click()
        pg.wait_for_selector('#af select[name="workshop_site"]')
        return pg.locator('#af select[name="workshop_site"]')

    pg.reload()
    sel = open_form(c_nosite)
    if sel.input_value() != '':
        fail(f'Standort ohne Werkstatt: „–“ erwartet, vorgewählt {sel.input_value()}')
    if not pg.locator('#af [data-apwsclosed]').count():
        fail('Hinweis „geschlossen“ fehlt (Standort ohne Werkstatt)')
    if pg.locator(f'#af select[name="workshop_site"] option[value="{close}"]').count():
        fail('geschlossene Werkstatt darf nicht wählbar sein')
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        pg.reload()
        sel = open_form(c_site)
        if sel.input_value() != keep:
            fail(f'{lang}: Werkstatt am Fahrzeugstandort {keep} erwartet, vorgewählt {sel.input_value()}')
        h = pg.locator('#af [data-apwsclosed]')
        if not h.count() or HINT[lang] not in h.text_content() or close_name not in h.text_content():
            fail(f'{lang}: Hinweis „geschlossen“ fehlt: {h.text_content() if h.count() else "–"}')
        if pg.locator('#af [data-apwshint]').count():
            fail(f'{lang}: kein Standort-Hinweis erwartet (Vorwahl = Standort-Werkstatt)')
        for w, hh in [(390, 844), (820, 1180), (1280, 900)]:
            pg.set_viewport_size({'width': w, 'height': hh})
            pg.wait_for_timeout(200)
            over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            if over > 2:
                fail(f'{lang} {w}px: {over}px waagrecht zu breit')
            if OUT:
                os.makedirs(OUT, exist_ok=True)
                h.scroll_into_view_if_needed()
                pg.screenshot(path=os.path.join(OUT, f'werkstatt_geschlossen_{lang}_{w}.png'))
        pg.set_viewport_size({'width': 390, 'height': 844})
    # Freigabe an die vorgewählte Werkstatt gelingt
    api('PATCH', '/api/me', {'language': 'de'})
    pg.reload()
    open_form(c_site)
    pg.fill('#af textarea[name="note"]', 'UI-Test: Werkstatt geschlossen')
    pg.locator('#af button.btn:not(.secondary)').first.click()
    pg.wait_for_timeout(1200)
    c = api('GET', f'/api/cases/{c_site}')['d']['case']
    if c['status'] != 'werkstatt_freigegeben' or c['workshop_site'] != keep:
        fail(f'Freigabe nicht an {keep}: {c["status"]} / {c.get("workshop_site")}')
    CL = {'de': 'geschlossen', 'uk': 'закрито', 'en': 'closed'}
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        pg.goto(f'{B}/#/wsload'); pg.reload()
        pg.wait_for_selector('section.panel h2', timeout=8000)
        hs = [x.text_content() for x in pg.locator('section.panel h2').all()]
        if f'{close_name} ({CL[lang]})' not in hs:
            fail(f'{lang}: Werkstatt-Auslastung ohne „{close_name} ({CL[lang]})“: {hs}')
        if close in hs:
            fail(f'{lang}: Werkstatt-Auslastung zeigt nur den Code')
        over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        if over > 2:
            fail(f'{lang}: Auslastung {over}px zu breit')
        if OUT:
            pg.screenshot(path=os.path.join(OUT, f'auslastung_geschlossen_{lang}_390.png'), full_page=True)
    # Backlog 1052: Lagerjournal und Bestand zum Stichtag bieten die geschlossene Werkstatt als Filter an
    for route, sid in [('stock/journal', 'jsite'), ('stock/asof', 'sasite')]:
        pg.goto(f'{B}/#/{route}'); pg.reload()
        pg.wait_for_selector(f'#{sid}', timeout=8000)
        o = pg.locator(f'#{sid} option[value="{close}"]')
        if not o.count() or CL['en'] not in o.text_content():
            fail(f'{route}: Filter ohne geschlossene Werkstatt')
    pg.evaluate("async (u) => (await fetch(u, { method: 'POST' })).json()", f'/__dev/workshop-active?code={close}&active=1')
    if errs:
        fail('JS-Fehler: ' + '; '.join(errs[:3]))
    print('OK: Freigabe bei geschlossener Vorschlags-Werkstatt – Werkstatt am Fahrzeugstandort bzw. „–“, Hinweis „geschlossen“ (DE/UK/EN, 390/820/1280 px)')
    br.close()
