# [CLAUDE] UI-Ablauftest: Kernprozess komplett über die Oberfläche (Klicks, Handybreite 390 px)
# Fahrer meldet Schaden → Fuhrparkleitung gibt Reparatur frei → Werkstatt übernimmt, repariert, erfasst Arbeitszeit,
# macht die Pflicht-Kontrolle nach Reparatur (mit einem Mangel → Folgeauftrag) → Abschlusskontrolle → Fuhrparkleitung
# erteilt die technische Freigabe. Danach Abfahrtskontrolle über den Aufkleber-Link.
# Voraussetzung: frischer lokaler Entwicklungsserver (sh scripts/restart-dev.sh) und Python-Playwright.
# Aufruf: python3 scripts/ui-ablauf.py [Ordner für Screenshots]   – nur synthetische Testdaten (Kennzeichen UA-…)
import sys, os
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310654321'
VID = 'VIN:' + VIN
steps = []


def fail(msg):
    print('FEHLER: ' + msg)
    for s in steps:
        print('  ✔ ' + s)
    sys.exit(1)


def shot(pg, name):
    if OUT:
        os.makedirs(OUT, exist_ok=True)
        pg.screenshot(path=os.path.join(OUT, f'ablauf_{len(steps):02d}_{name}.png'), full_page=True)


def go(pg, h):
    url = f'{B}/#/{h}'
    if pg.url == url:
        pg.reload()  # gleicher Hash löst keinen Seitenwechsel aus
    else:
        pg.goto(url)
    pg.wait_for_timeout(500)
    if pg.locator('#rl').count():
        fail(f'Ansicht #/{h} abgebrochen: {pg.locator(".panel.alert").first.text_content()}')


def status(api, cid):
    return api('GET', f'/api/cases/{cid}')['d']['case']['status']


def act(pg, action, fill=None, check=None):
    """Aktion im Vorgang über den Button auslösen, Formular ausfüllen, speichern."""
    btn = pg.locator(f'[data-act="{action}"]')
    if not btn.count():
        fail(f'Button für {action} fehlt (vorhanden: {pg.eval_on_selector_all("[data-act]", "es => es.map(e => e.dataset.act)")})')
    btn.first.click()
    pg.wait_for_selector('#af')
    for name, val in (fill or {}).items():
        el = pg.locator(f'#af [name="{name}"]')
        if el.evaluate('e => e.tagName') == 'SELECT':
            el.select_option(val)
        else:
            el.fill(val)
    for name in (check or []):
        pg.locator(f'#af [name="{name}"]').check()
    pg.locator('#af button.btn').first.click()
    pg.wait_for_timeout(700)
    err = pg.locator('.toast.err')
    if err.count():
        fail(f'{action}: {err.first.text_content()}')


with sync_playwright() as p:
    br = p.chromium.launch()
    adm = br.new_page(viewport={'width': 390, 'height': 844})
    adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ua.inhaber', 'display_name': 'Ablauf Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    api('POST', '/api/vehicles', {'plate': 'UA-AB 1', 'vin': VIN, 'site': 'Dortmund'})
    ws_site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    pages = {}
    for role, extra in [('fleet', {}), ('workshop', {'workshop_site': ws_site}), ('driver', {})]:
        u = api('POST', '/api/users', {'username': f'ua.{role}', 'display_name': f'Ablauf {role}', 'role': role, 'environment': 'production', **extra})
        if u['s'] != 201:
            sys.exit(f'Benutzer {role}: {u}')
        if role == 'driver':
            api('POST', f'/api/vehicles/{VID}/drivers', {'user_id': u['d']['id']})
        pg = br.new_context(viewport={'width': 390, 'height': 844}).new_page()
        pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        js_errors = []
        pg.on('pageerror', lambda e, js_errors=js_errors: js_errors.append(str(e)))
        pages[role] = (pg, js_errors)
    drv, fl, wsp = pages['driver'][0], pages['fleet'][0], pages['workshop'][0]

    # 1. Fahrer meldet über das Formular
    go(drv, 'new')
    if not drv.locator(f'input[name=veh][value="{VID}"]').is_checked():
        fail('zugeordnetes Fahrzeug nicht vorausgewählt')
    drv.fill('#d', 'Ablauftest: Spiegel rechts locker, wackelt bei Fahrt')
    drv.locator('label.choice.c-mittel').click()
    drv.click('#sb')
    drv.wait_for_url('**/#/cases/*', timeout=5000)
    cid = drv.evaluate('location.hash').split('/')[-1]
    if status(api, cid) != 'gemeldet':
        fail('Meldung nicht angelegt')
    steps.append('Fahrer meldet Schaden (Formular, Fahrzeug vorausgewählt)')
    shot(drv, 'gemeldet')

    # 2. Fuhrparkleitung gibt Reparatur frei
    go(fl, f'cases/{cid}')
    act(fl, 'approve_repair', {'workshop_site': ws_site, 'note': 'Spiegelhalter prüfen und befestigen'})
    if status(api, cid) != 'werkstatt_freigegeben':
        fail(f'nach Freigabe Status {status(api, cid)}')
    steps.append('Fuhrparkleitung gibt Reparatur frei')

    # 3. Werkstatt: übernehmen, Reparatur beginnen, Arbeitszeit
    go(wsp, f'cases/{cid}')
    act(wsp, 'acknowledge')
    act(wsp, 'start_repair')
    act(wsp, 'record_work', {'hours': '0,5', 'description': 'Spiegelhalter nachgezogen'})
    if status(api, cid) != 'in_reparatur':
        fail(f'nach Reparaturbeginn Status {status(api, cid)}')
    steps.append('Werkstatt übernimmt, beginnt Reparatur, erfasst 0,5 h')

    # 4. Pflicht-Kontrolle nach Reparatur über das Formular – ein Punkt Mangel (nicht sicherheitsrelevant)
    wsp.locator('a[href^="#/inspect/"]').first.click()
    wsp.wait_for_selector('.checkitem, #rl')
    wsp.wait_for_timeout(300)
    if wsp.locator('#rl').count():
        fail('Kontrollformular abgebrochen: ' + wsp.locator('.panel.alert').first.text_content())
    # leeres Absenden → Hinweis in der App-Sprache, kein Versand
    wsp.locator('#f button.btn').click()
    wsp.wait_for_timeout(300)
    if not wsp.locator('.checkitem.missing').count():
        fail('fehlende Prüfpunkte nicht markiert')
    rows = wsp.locator('.checkitem')
    for i in range(rows.count()):
        rows.nth(i).locator('label').first.click()
    rows.nth(rows.count() - 1).locator('label.bad').click()
    rows.nth(rows.count() - 1).locator('.detail input[type=text], .detail input:not([type])').first.fill('Ablauftest: Kennzeichenleuchte flackert')
    wsp.fill('#km', '123456')
    wsp.locator('#f button.btn').click()
    wsp.wait_for_url(f'**/#/cases/{cid}', timeout=5000)
    wsp.wait_for_timeout(500)
    d = api('GET', f'/api/cases/{cid}')['d']
    if len(d['inspections']) != 1 or len(d['followups']) != 1:
        fail(f"Kontrolle/Folgeauftrag fehlt: {len(d['inspections'])} Kontrolle(n), {len(d['followups'])} Folgeauftrag/-aufträge")
    steps.append('Werkstatt macht Kontrolle nach Reparatur im Formular (Mangel → 1 Folgeauftrag)')
    shot(wsp, 'kontrolle')

    # 5. Abschlusskontrolle anfordern
    act(wsp, 'request_quality_check', {'note': 'Arbeiten erledigt, Kontrolle durchgeführt'})
    if status(api, cid) != 'abschlusskontrolle':
        fail(f'nach Anforderung Status {status(api, cid)}')
    steps.append('Werkstatt fordert Abschlusskontrolle an')

    # 6. Technische Freigabe durch Fuhrparkleitung
    go(fl, f'cases/{cid}')
    act(fl, 'technical_release', {'note': 'Kontrollnachweis geprüft'}, check=['confirm'])
    if status(api, cid) != 'fahrzeug_freigegeben':
        fail(f'nach Freigabe Status {status(api, cid)}')
    steps.append('Fuhrparkleitung erteilt technische Freigabe')
    shot(fl, 'freigegeben')

    # 7. Abfahrtskontrolle über den Aufkleber-Link (Fahrzeug vorausgewählt), alles OK
    go(drv, f'check/{VID}')
    if drv.eval_on_selector('#v', 'e => e.value') != VID:
        fail('Aufkleber-Link: Fahrzeug nicht vorausgewählt')
    rows = drv.locator('.checkitem')
    for i in range(rows.count()):
        rows.nth(i).locator('label').first.click()
    drv.locator('#sb').click()
    drv.wait_for_timeout(800)
    if drv.locator('.toast.err').count():
        fail('Abfahrtskontrolle: ' + drv.locator('.toast.err').first.text_content())
    steps.append('Fahrer: Abfahrtskontrolle über Aufkleber-Link ohne Mangel')

    for role, (pg, errs) in pages.items():
        if errs:
            fail(f'JavaScript-Fehler bei {role}: {errs[:2]}')
    br.close()

for s in steps:
    print('  ✔ ' + s)
print(f'Ablauf vollständig: {len(steps)} Schritte über die Oberfläche')
