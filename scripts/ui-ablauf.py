# [CLAUDE] UI-Ablauftest: Kernprozess komplett über die Oberfläche (Klicks, Handybreite 390 px)
# Fahrer meldet Schaden → Fuhrparkleitung gibt Reparatur frei → Werkstatt übernimmt, repariert, erfasst Arbeitszeit,
# legt einen Lagerartikel an und entnimmt ihn im Vorgang (unter Mindestbestand → Bestellvorschlag),
# macht die Pflicht-Kontrolle nach Reparatur (mit einem Mangel → Folgeauftrag) → Abschlusskontrolle → Fuhrparkleitung
# erteilt die technische Freigabe. Danach Abfahrtskontrolle über den Aufkleber-Link.
# Voraussetzung: frischer lokaler Entwicklungsserver (sh scripts/restart-dev.sh) und Python-Playwright.
# Fahrer arbeitet auf Ukrainisch (CFP_DRV_LANG=uk|en|de, Standard uk) im Handy (390 px), Werkstatt auf dem Tablet (820 px),
# Fuhrparkleitung im Handy. Geprüft wird zusätzlich: keine deutschen Reste in der Fahreroberfläche, kein waagrechtes Scrollen.
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
DRV_LANG = os.environ.get('CFP_DRV_LANG', 'uk')
VIEWPORTS = {'fleet': (390, 844), 'workshop': (820, 1180), 'driver': (390, 844)}
# deutsche Reste: sichtbare Texte mit Umlaut; ausgenommen Testdaten (Ablauftest …), Werkstattnamen, Gesetzeszitate
DE_REST = r"""() => { const out = []; const w = document.createTreeWalker(document.querySelector('#app') || document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const x = w.currentNode.textContent.trim(); const el = w.currentNode.parentElement;
    if (x && /[äöüßÄÖÜ]/.test(x) && !/Ablauftest|Spiegelhalter|Bußgeldstelle|StVZO|^Werkstatt [A-ZÄÖÜ]/.test(x) && el && el.offsetParent !== null) out.push(x.slice(0, 60)); }
  const t = document.querySelector('.toast'); if (t && /[äöüßÄÖÜ]/.test(t.textContent)) out.push('Meldung: ' + t.textContent.slice(0, 60));
  return out; }"""


def check_view(pg, role, where):
    """Fahrer in Fremdsprache: keine deutschen Reste; alle Rollen: kein waagrechtes Scrollen in ihrer Breite."""
    if role == 'driver' and DRV_LANG != 'de':
        de = pg.evaluate(DE_REST)
        if de:
            fail(f'{where}: deutscher Text in der Fahreroberfläche ({DRV_LANG}): {de[:4]}')
    over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
    if over > 2:
        fail(f'{where}: Seite {over}px breiter als der Bildschirm ({role}, {VIEWPORTS[role][0]} px)')


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
        w, h = VIEWPORTS[role]
        pg = br.new_context(viewport={'width': w, 'height': h}).new_page()
        pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        if role == 'driver':
            pg.evaluate(JS, ['PATCH', '/api/me', {'language': DRV_LANG}])
        js_errors = []
        pg.on('pageerror', lambda e, js_errors=js_errors: js_errors.append(str(e)))
        pages[role] = (pg, js_errors)
    drv, fl, wsp = pages['driver'][0], pages['fleet'][0], pages['workshop'][0]

    # 1. Fahrer meldet über das Formular (Startseite und leeres Absenden in der Fahrersprache)
    go(drv, '')
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Fahrer-Startseite')
    go(drv, 'new')
    check_view(drv, 'driver', 'Meldeformular')
    drv.click('#sb')
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Meldeformular leer abgeschickt')
    drv.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")
    if not drv.locator(f'input[name=veh][value="{VID}"]').is_checked():
        fail('zugeordnetes Fahrzeug nicht vorausgewählt')
    drv.fill('#d', 'Ablauftest: Spiegel rechts locker, wackelt bei Fahrt')
    drv.locator('label.choice.c-mittel').click()
    drv.click('#sb')
    drv.wait_for_url('**/#/cases/*', timeout=5000)
    cid = drv.evaluate('location.hash').split('/')[-1]
    if status(api, cid) != 'gemeldet':
        fail('Meldung nicht angelegt')
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Vorgang aus Fahrersicht')
    steps.append(f'Fahrer meldet Schaden (Formular, Fahrzeug vorausgewählt, Sprache {DRV_LANG})')
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
    check_view(wsp, 'workshop', 'Vorgang Werkstatt (Tablet)')
    if status(api, cid) != 'in_reparatur':
        fail(f'nach Reparaturbeginn Status {status(api, cid)}')
    steps.append('Werkstatt (Tablet 820 px) übernimmt, beginnt Reparatur, erfasst 0,5 h')

    # 3b. Lager: Werkstatt legt Artikel an (Bestand 3, Mindestbestand 2), entnimmt 2 im Vorgang → Bestellvorschlag
    go(wsp, 'stock')
    wsp.locator('details.panel summary').first.click()
    wsp.fill('#nf [name=name]', 'Ablauftest Spiegelhalter-Schraube')
    wsp.fill('#nf [name=part_number]', 'AT-4711')
    wsp.fill('#nf [name=initial_qty]', '3')
    wsp.fill('#nf [name=min_qty]', '2')
    wsp.fill('#nf [name=unit_price_net]', '1,50')
    wsp.locator('#nf button.btn').click()
    wsp.wait_for_timeout(600)
    if wsp.locator('.toast.err').count():
        fail('Lagerartikel: ' + wsp.locator('.toast.err').first.text_content())
    items = api('GET', '/api/stock')['d']['items']
    item = next((i for i in items if i['part_number'] == 'AT-4711'), None)
    if not item or item['on_hand'] != 3:
        fail(f'Lagerartikel nicht angelegt: {items}')
    check_view(wsp, 'workshop', 'Lager (Tablet)')
    go(wsp, f'cases/{cid}')
    wsp.locator('[data-act="add_part"]').first.click()
    wsp.wait_for_selector('#af [name="stock_item_id"]', timeout=5000)
    wsp.locator('#af [name="stock_item_id"]').select_option(item['id'])
    wsp.fill('#af [name="quantity"]', '2')
    wsp.locator('#af button.btn').first.click()
    wsp.wait_for_timeout(700)
    if wsp.locator('.toast.err').count():
        fail('Teil aus Lager: ' + wsp.locator('.toast.err').first.text_content())
    parts = api('GET', f'/api/cases/{cid}')['d'].get('parts') or []
    if not any(p.get('stock_item_id') == item['id'] and float(p.get('quantity')) == 2 for p in parts):
        fail(f'Teil aus Lager nicht im Vorgang: {parts}')
    go(wsp, 'stock')
    link = wsp.locator('a[href="#/stock/reorder"]')
    if '1' not in (link.locator('.chip').text_content() if link.locator('.chip').count() else ''):
        fail('Lager: Zähler unter Mindestbestand fehlt')
    link.click()
    wsp.wait_for_timeout(600)
    rows = wsp.locator('table.stack tbody tr')
    if rows.count() != 1 or 'Spiegelhalter-Schraube' not in rows.first.text_content():
        fail(f'Bestellvorschlag: {rows.count()} Zeile(n)')
    if '1,50' not in rows.first.text_content():
        fail('Bestellvorschlag: Wert der Fehlmenge (1 × 1,50 €) fehlt: ' + rows.first.text_content())
    check_view(wsp, 'workshop', 'Bestellvorschlag (Tablet)')
    steps.append('Werkstatt legt Lagerartikel an, entnimmt 2 Stk im Vorgang → Bestellvorschlag zeigt 1 Stk Fehlmenge')
    shot(wsp, 'bestellvorschlag')
    go(wsp, f'cases/{cid}')

    # 4. Pflicht-Kontrolle nach Reparatur über das Formular – ein Punkt Mangel (nicht sicherheitsrelevant)
    wsp.locator('a[href^="#/inspect/"]').first.click()
    wsp.wait_for_selector('.checkitem, #rl')
    wsp.wait_for_timeout(300)
    if wsp.locator('#rl').count():
        fail('Kontrollformular abgebrochen: ' + wsp.locator('.panel.alert').first.text_content())
    check_view(wsp, 'workshop', 'Kontrollformular Werkstatt (Tablet)')
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
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Abfahrtskontrolle')
    drv.locator('#sb').click()  # leer absenden → Hinweis in der Fahrersprache
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Abfahrtskontrolle leer abgeschickt')
    drv.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")
    go(drv, f'v/{VID}')
    check_view(drv, 'driver', 'Aufkleber-Auswahlseite')
    go(drv, f'check/{VID}')
    rows = drv.locator('.checkitem')
    for i in range(rows.count()):
        rows.nth(i).locator('label').first.click()
    drv.locator('#sb').click()
    drv.wait_for_timeout(800)
    if drv.locator('.toast.err').count():
        fail('Abfahrtskontrolle: ' + drv.locator('.toast.err').first.text_content())
    go(drv, '')
    drv.wait_for_timeout(300)
    check_view(drv, 'driver', 'Fahrer-Startseite nach Kontrolle')
    steps.append('Fahrer: Abfahrtskontrolle über Aufkleber-Link ohne Mangel')

    for role, (pg, errs) in pages.items():
        if errs:
            fail(f'JavaScript-Fehler bei {role}: {errs[:2]}')
    br.close()

for s in steps:
    print('  ✔ ' + s)
print(f'Ablauf vollständig: {len(steps)} Schritte über die Oberfläche')
