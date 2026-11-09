# [CLAUDE] UI-Test (09.11.2026, Backlog 1231, Blickwinkel „Werkstatt scannt Teilenummern mit einem Barcode-Scanner“): Scanner tippen
# die Nummer und senden Enter. Lagerliste: genau ein Treffer (Schreibweise egal) → Artikelakte; mehrere → Liste bleibt, Suchtext markiert,
# der nächste Scan ersetzt ihn. Wareneingang: Scan + Enter bei schon eingetragener Menge bucht NICHT (vorher wurde gebucht), Artikel gewählt,
# Cursor in der Menge. Teil am Vorgang: Scan + Enter entnimmt nicht sofort (Menge vorbelegt 1), Cursor in der Menge (markiert).
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SELALL = "(s) => { const e = document.querySelector(s); return document.activeElement === e && e.selectionStart === 0 && e.selectionEnd === e.value.length && e.value.length > 0; }"
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'bs.inhaber', 'display_name': 'BS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['bs.inhaber', 'wn.inhaber', 'tl.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]; pid = int(uuid.uuid4().int % 10**7)
    site = 'DORTMUND'
    vin = f'WDB9634031{pid:07d}'[:17]; api('POST', '/api/vehicles', {'plate': f'BS-SC {pid % 9000 + 1}', 'vin': vin, 'site': 'Dortmund'}); vid = 'VIN:' + vin
    wsu = f'bs.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'BS Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': site})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    for k in range(9): wsapi('POST', '/api/stock', {'site': site, 'name': f'Füllartikel {tag} {k}', 'part_number': f'F{tag}-{k}', 'initial_qty': '3'})
    cid = api('POST', '/api/cases', {'vehicle_id': vid, 'description': 'BS Scanner', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'workshop_site': site, 'request_key': f'bs-{pid}'})['d']['id']
    v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
    api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'bsa-{pid}', 'expected_version': v, 'payload': {'workshop_site': site}, 'note': 'frei'})
    v = wsapi('GET', f'/api/cases/{cid}')['d']['case']['version']
    check(wsapi('POST', f'/api/cases/{cid}/commands', {'action': 'start_repair', 'command_id': f'bss-{pid}', 'expected_version': v})['s'] == 200, 'Reparatur begonnen')
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = f'{pid % 100:02d}{i}'
        pn = f'A 000 180 {n[:2]} {n[2:]}9'; scan = pn.replace(' ', '')
        ia = wsapi('POST', '/api/stock', {'site': site, 'name': f'Ölfilter {tag}{i}', 'part_number': pn, 'initial_qty': '6'})['d']['id']
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        # 1) Lagerliste
        q.goto(B + '/#/stock'); q.reload(); q.wait_for_selector('#q', timeout=15000)
        q.click('#q'); q.keyboard.type(f'F{tag}', delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.url.endswith('#/stock') and q.evaluate(SELALL, '#q'), f'{lang}: mehrere Treffer → Liste bleibt, Suchtext markiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-scanner-liste-{lang}-{w}.png')
        q.keyboard.type(scan, delay=3)
        check(q.input_value('#q') == scan, f'{lang}: nächster Scan ersetzt den Suchtext (kein Anhängen)')
        q.keyboard.press('Enter'); okh = False
        for _ in range(50):  # kein wait_for_function (eval – CSP der App)
            okh = q.evaluate('() => location.hash') == f'#/stock/{ia}'
            if okh: break
            q.wait_for_timeout(200)
        check(okh, f'{lang}: Scan ohne Leerzeichen + Enter öffnet den Artikel „{pn}“')
        # 2) Wareneingang: Menge zuerst, dann Scan + Enter
        q.goto(B + '/#/stock/receipt'); q.wait_for_selector('#rcf', timeout=15000)
        q.fill('#rcsup', f'Lieferant {tag}'); q.fill('#rclines .rcl:nth-child(1) .rcq', '2')
        q.click('#rclines .rcl:nth-child(1) .stockq'); q.keyboard.type(scan, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(800)
        check(q.locator('#rcdone').count() == 0, f'{lang}: Enter im Suchfeld bucht den Wareneingang nicht')
        check(q.input_value('#rclines .rcl:nth-child(1) select') == ia and q.evaluate(SELALL, '#rclines .rcl:nth-child(1) .rcq'), f'{lang}: Artikel gewählt, Cursor in der Menge (markiert)')
        check(wsapi('GET', f'/api/stock/{ia}')['d']['item']['on_hand'] == 6, f'{lang}: Bestand unverändert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-scanner-wareneingang-{lang}-{w}.png', full_page=True)
        check(q.evaluate(noscroll), f'{lang}: Wareneingang ohne Querscrollen')
        # 3) Teil am Vorgang
        q.goto(B + f'/#/cases/{cid}'); q.wait_for_selector('[data-act=add_part]', timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel [data-stockq]', timeout=15000)
        nparts = len(wsapi('GET', f'/api/cases/{cid}')['d'].get('parts') or [])
        q.click('#stocksel [data-stockq]'); q.keyboard.type(scan, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(800)
        check(q.input_value('#stocksel select') == ia and q.evaluate(SELALL, '#pqty'), f'{lang}: Vorgang – Artikel gewählt, Cursor in der Menge (markiert)')
        check(len(wsapi('GET', f'/api/cases/{cid}')['d'].get('parts') or []) == nparts and wsapi('GET', f'/api/stock/{ia}')['d']['item']['on_hand'] == 6, f'{lang}: Vorgang – nichts entnommen')
        q.click('#stocksel [data-stockq]'); q.fill('#stocksel [data-stockq]', ''); q.keyboard.type('ZZ-nicht-da', delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.evaluate(SELALL, '#stocksel [data-stockq]'), f'{lang}: Vorgang – ohne Treffer bleibt der Suchtext markiert')
        check(q.evaluate(noscroll), f'{lang}: Vorgang ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
