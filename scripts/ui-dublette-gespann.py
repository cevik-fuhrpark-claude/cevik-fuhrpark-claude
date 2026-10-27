# [CLAUDE] UI-Test (27.10.2026, Backlog 437, Blickwinkel „Zwei Fahrer melden am selben Tag denselben Schaden am gekoppelten Auflieger“):
# Fahrer der Zugmaschine wählt im Meldeformular den fest gekoppelten Auflieger → bekannte Mängel des Aufliegers sichtbar; Leitung sieht im
# Ablehnen-Formular den Hinweis „gekoppeltes Fahrzeug – zuerst Fahrzeug korrigieren“ und im Original die Meldezeit der Dublette.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'dg.inhaber', 'display_name': 'DG Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['dg.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        T = f'VIN:WDB96340310{pid:03d}{i + 10:03d}'; H = f'VIN:WDB96340310{pid:03d}{i + 20:03d}'; tp = f'DG-Z {pid}{i}'; hp = f'DG-H {pid}{i}'
        check(api('POST', '/api/vehicles', {'plate': tp, 'vin': T[4:], 'site': 'Dortmund', 'trailer_plate': hp})['s'] == 201, f'{lang}: Zugmaschine')
        check(api('POST', '/api/vehicles', {'plate': hp, 'vin': H[4:], 'site': 'Dortmund', 'kind': 'anhaenger'})['s'] == 201, f'{lang}: Auflieger')
        A = api('POST', '/api/cases', {'vehicle_id': H, 'description': f'Plane links eingerissen UI-Gespann {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})['d']['id']
        u = f'dg.fahrer{pid}{i}'
        r = api('POST', '/api/users', {'username': u, 'display_name': u.upper(), 'role': 'driver', 'environment': envname})
        uid = r['d'].get('id') or r['d'].get('user', {}).get('id')
        c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
        api('POST', f'/api/vehicles/{T}/drivers', {'user_id': uid, 'end_previous': False})
        # Fahrer: Meldeformular, gekoppelten Auflieger wählen
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS, ['POST', '/api/login', {'username': u, 'password': PW}])['s'] == 200, f'{lang}: Fahrer angemeldet')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.goto(B + '/#/new'); q.reload(); q.wait_for_selector('input[name=veh]', state='attached', timeout=15000); q.wait_for_timeout(800)
        rb = q.locator(f'input[name=veh][value="{H}"]')
        check(rb.count() == 1, f'{lang}: Auflieger wählbar')
        if rb.count():
            det = rb.locator('xpath=ancestor::details[1]')
            if det.count() and not det.evaluate('d => d.open'): det.locator('summary').first.click()
            rb.locator('xpath=ancestor::label[1]').click(); q.wait_for_timeout(500)
            kn = q.inner_text('#known')
            check(f'UI-Gespann {i}' in kn, f'{lang} {w}px: bekannter Mangel des gekoppelten Aufliegers sichtbar')
            check(q.locator('#known [data-notmine]').count() == 0, f'{lang} {w}px: kein „nicht Ihr Fahrzeug“')
        check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Melden)')
        if SHOTS: q.locator('#known').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dublette_gespann_melden_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler (Fahrer) {errs[:1]}'); ctx.close()
        # zweite Meldung am Auflieger, Leitung lehnt als Dublette ab
        Bc = api('POST', '/api/cases', {'vehicle_id': H, 'description': f'Plane kaputt UI-Gespann B {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})['d']['id']
        ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
        m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); m.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        m.goto(B + f'/#/cases/{Bc}'); m.reload(); m.wait_for_selector('[data-act=reject]', timeout=15000); TT = m.evaluate(TR)
        m.click('[data-act=reject]'); m.wait_for_selector('[data-dupcoupled]', timeout=10000)
        check(m.inner_text('[data-dupcoupled]').strip() == TT['dup_coupled_hint'].replace('{a}', TT['act_correct_vehicle']), f'{lang} {w}px: Hinweis Gespannteil im Ablehnen-Formular')
        if SHOTS: m.locator('[data-dupcoupled]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/dublette_gespann_ablehnen_{lang}_{w}.png')
        ver = api('GET', f'/api/cases/{Bc}')['d']['case']['version']
        check(api('POST', f'/api/cases/{Bc}/commands', {'action': 'reject', 'command_id': str(uuid.uuid4()), 'expected_version': ver, 'payload': {'duplicate_of': A}, 'note': 'Dublette'})['s'] == 200, f'{lang}: als Dublette abgelehnt')
        m.goto(B + f'/#/cases/{A}'); m.reload(); m.wait_for_selector('[data-dupat]', timeout=15000)
        da = m.inner_text('[data-dupat]')
        check(TT['reported_at_short'] in da and ':' in da, f'{lang} {w}px: Meldezeit der Dublette im Original ({da})')
        check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Vorgang)')
        if SHOTS: m.locator('[data-dupat]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/dublette_gespann_original_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
