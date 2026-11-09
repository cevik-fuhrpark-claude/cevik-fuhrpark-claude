# [CLAUDE] UI-Test (09.11.2026, Backlog 1234, Blickwinkel „Werkstatt bucht Zugang/Entnahme per Barcode-Scanner“): Steht der Cursor noch in
# einem Mengen-/Preis-/Zählfeld und wird das nächste Teil gescannt, bucht die App nicht. Wareneingang: Enter in Menge → Preis → nächste
# Position, Scan in der Menge → nächste freie Position (Feld bleibt leer), gebucht nur mit dem Knopf. Inventur: Scan im Zählfeld → Zählfeld des
# gescannten Artikels. Artikelakte: unbekannter 6-stelliger Code (unter der Höchstmenge) im Mengenfeld + Enter bucht nicht, Hinweis am Feld;
# eine getippte Menge bucht weiter. Teil am Vorgang: Scan in der Menge (vorbelegt 1) → anderer Artikel gewählt, Menge 1, nichts entnommen.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SELALL = "(s) => { const e = document.querySelector(s); return !!e && document.activeElement === e && e.selectionStart === 0 && e.selectionEnd === e.value.length && e.value.length > 0; }"
ACT = "() => { const a = document.activeElement; return a ? (a.dataset.inv || a.className || a.id || a.name || a.tagName) : ''; }"
noscroll = 'document.documentElement.scrollWidth<=innerWidth+1'
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
    for un in ['bs.inhaber', 'is.inhaber', 'wn.inhaber', 'tl.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]; pid = int(uuid.uuid4().int % 10**7)
    site = 'DORTMUND'
    vin = f'WDB9634032{pid:07d}'[:17]; api('POST', '/api/vehicles', {'plate': f'SM-SC {pid % 9000 + 1}', 'vin': vin, 'site': 'Dortmund'}); vid = 'VIN:' + vin
    wsu = f'sm.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'SM Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': site})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    for k in range(9): wsapi('POST', '/api/stock', {'site': site, 'name': f'Füllartikel {tag} {k}', 'part_number': f'F{tag}-{k}', 'initial_qty': '3', 'location': f'Regal A{tag}'})
    cid = api('POST', '/api/cases', {'vehicle_id': vid, 'description': 'SM Scanner', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'workshop_site': site, 'request_key': f'sm-{pid}'})['d']['id']
    v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
    api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'sma-{pid}', 'expected_version': v, 'payload': {'workshop_site': site}, 'note': 'frei'})
    v = wsapi('GET', f'/api/cases/{cid}')['d']['case']['version']
    check(wsapi('POST', f'/api/cases/{cid}/commands', {'action': 'start_repair', 'command_id': f'sms-{pid}', 'expected_version': v})['s'] == 200, 'Reparatur begonnen')
    oh = lambda i: wsapi('GET', f'/api/stock/{i}')['d']['item']['on_hand']
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        # 6-stellige Zahlen-Teilenummern (unter der Höchstmenge 1 000 000 – würden als Menge angenommen)
        base = 100000 + (pid * 7 + i * 31) % 800000
        pa, pb, pc = str(base), str(base + 1), str(base + 2)
        ia, ib, ic = [wsapi('POST', '/api/stock', {'site': site, 'name': f'{nm} {tag}{i}', 'part_number': pn, 'initial_qty': '6', 'location': f'Regal B{tag}'})['d']['id'] for nm, pn in [('Ölfilter', pa), ('Luftfilter', pb), ('Kraftstofffilter', pc)]]
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        # 1) Wareneingang
        q.goto(B + '/#/stock/receipt'); q.reload(); q.wait_for_selector('#rcf', timeout=15000)
        L = lambda k, sel: f'#rclines .rcl:nth-child({k}) {sel}'
        q.fill('#rcsup', f'Lieferant {tag}')
        q.click(L(1, '.stockq')); q.keyboard.type(pa, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.input_value(L(1, 'select')) == ia and 'rcq' in q.evaluate(ACT), f'{lang}: Scan → Artikel, Cursor in der Menge')
        q.keyboard.type('3'); q.keyboard.press('Enter'); q.wait_for_timeout(150)
        check('rcp' in q.evaluate(ACT), f'{lang}: Enter in der Menge → Preis (nicht gebucht)')
        q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.locator('#rclines .rcl').count() == 2 and 'stockq' in q.evaluate(ACT) and q.locator('#rcdone').count() == 0, f'{lang}: Enter im Preis → nächste Position (Suchfeld), nicht gebucht')
        q.keyboard.type(pb, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.input_value(L(2, 'select')) == ib and 'rcq' in q.evaluate(ACT), f'{lang}: zweiter Scan → Position 2, Cursor in der Menge')
        q.keyboard.type(pc, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(400)
        check(q.locator('#rcdone').count() == 0 and q.input_value(L(2, '.rcq')) == '', f'{lang}: Scan in der Menge bucht nicht, Menge bleibt leer')
        check(q.locator('#rclines .rcl').count() == 3 and q.input_value(L(3, 'select')) == ic and 'rcq' in q.evaluate(ACT), f'{lang}: Code als nächste Position übernommen, Cursor in deren Menge')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-scan-menge-wareneingang-{lang}-{w}.png', full_page=True)
        check(q.evaluate(noscroll), f'{lang}: Wareneingang ohne Querscrollen')
        q.keyboard.type('1'); q.click('#rcbook'); q.wait_for_timeout(400)
        check(q.locator('#rcdone').count() == 0 and oh(ib) == 6, f'{lang}: Position 2 ohne Menge → nicht gebucht')
        q.fill(L(2, '.rcq'), '2'); q.click('#rcbook'); q.wait_for_selector('#rcdone', timeout=10000)
        check((oh(ia), oh(ib), oh(ic)) == (9, 8, 7), f'{lang}: mit Knopf gebucht +3/+2/+1')
        # 2) Inventur: Scan im Zählfeld → Zählfeld des gescannten Artikels
        q.goto(B + '/#/stock'); q.wait_for_selector('#inv', timeout=15000); q.click('#inv > summary'); q.wait_for_selector('#invq', timeout=10000)
        q.click('#invq'); q.keyboard.type(pa, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.evaluate(ACT) == ia, f'{lang}: Inventur – Scan → Zählfeld A')
        q.keyboard.type(pb, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(300)
        check(q.evaluate(ACT) == ib and q.input_value(f'[data-inv="{ia}"]') == '', f'{lang}: Inventur – Scan im Zählfeld → Zählfeld B, A bleibt leer')
        q.keyboard.type('5'); q.keyboard.press('Enter'); q.wait_for_timeout(100)
        check(q.evaluate(SELALL, '#invq') and q.input_value(f'[data-inv="{ib}"]') == '5', f'{lang}: Inventur – Zählung B, zurück ins Suchfeld')
        if SHOTS: q.locator('#inv').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lager-scan-menge-inventur-{lang}-{w}.png')
        q.evaluate("() => { try { Object.keys(localStorage).filter((k) => k.startsWith('cfp_inv_')).forEach((k) => localStorage.removeItem(k)); } catch {} }")
        # 3) Artikelakte: unbekannter Code im Mengenfeld
        q.goto(B + f'/#/stock/{ia}'); q.wait_for_selector('#mf [name=qty]', timeout=15000)
        q.click('#mf [name=qty]'); q.keyboard.type(f'{(base + 500) % 900000 + 100000}', delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(500)
        check(oh(ia) == 9 and q.input_value('#mf [name=qty]') == '', f'{lang}: Artikelakte – Scan im Mengenfeld bucht nicht, Feld leer')
        check(q.locator('#mf .fielderr').is_visible(), f'{lang}: Artikelakte – Hinweis am Mengenfeld')
        if SHOTS: q.locator('#mf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lager-scan-menge-artikel-{lang}-{w}.png')
        check(q.evaluate(noscroll), f'{lang}: Artikelakte ohne Querscrollen')
        q.keyboard.type('2'); q.keyboard.press('Enter'); ok = False
        for _ in range(40):
            ok = oh(ia) == 11
            if ok: break
            q.wait_for_timeout(200)
        check(ok, f'{lang}: Artikelakte – getippte Menge bucht weiter (+2)')
        # 4) Teil am Vorgang: Scan in der Menge (vorbelegt 1)
        q.wait_for_timeout(1000)  # Artikelakte nach dem Buchen neu aufgebaut, bevor die Seite wechselt
        q.goto(B + f'/#/cases/{cid}'); q.wait_for_selector('[data-act=add_part]', timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel [data-stockq]', timeout=15000)
        nparts = len(wsapi('GET', f'/api/cases/{cid}')['d'].get('parts') or [])
        q.click('#stocksel [data-stockq]'); q.keyboard.type(pa, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(300)
        check(q.evaluate(SELALL, '#pqty'), f'{lang}: Vorgang – Cursor in der Menge (markiert)')
        q.keyboard.type(pb, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(600)
        check(q.input_value('#stocksel select') == ib and q.input_value('#pqty') == '1' and q.evaluate(SELALL, '#pqty'), f'{lang}: Vorgang – Scan in der Menge wählt den gescannten Artikel, Menge 1')
        check(len(wsapi('GET', f'/api/cases/{cid}')['d'].get('parts') or []) == nparts and oh(ib) == 8, f'{lang}: Vorgang – nichts entnommen')
        check(q.evaluate(noscroll), f'{lang}: Vorgang ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
