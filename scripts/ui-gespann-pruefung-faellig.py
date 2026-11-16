# [CLAUDE] UI-Test (16.11.2026, Backlog 1520, Blickwinkel „Zugmaschine steht in der Werkstatt – UVV/SP des fest gekoppelten Aufliegers ist
# ebenfalls fällig“): Vorgang an der Zugmaschine → „Zum Fahrzeug“ nennt beim Auflieger „Prüfungen fällig/überfällig“ mit UVV (überfällig, Chip)
# und Feuerlöscher (Tag 20), nicht die Bremsen (Tag 200). Werkstattkonto, DE 390 / UK 820 / EN 1366 px; kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def iso(d): return (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=d)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'gp.inhaber', 'display_name': 'GP Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['gp.inhaber', 'vg.inhaber', 'gm.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber', 'hm.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'gp.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'GP Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:6]; tp = f'GP-AN {n[:3]}'
        vin = 'WDB9634031D' + n; tvin = 'WDB9634031E' + n; VID = 'VIN:' + vin; TID = 'VIN:' + tvin
        check(api('POST', '/api/vehicles', {'vin': tvin, 'plate': tp, 'kind': 'anhaenger', 'site': 'Dortmund'})['s'] == 201, f'{lang}: Auflieger')
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'GP-SZ {n[:3]}', 'site': 'Dortmund', 'trailer_plate': tp})['s'] == 201, f'{lang}: Zugmaschine')
        mk = lambda kind, due: api('POST', f'/api/vehicles/{TID}/maintenance', {'kind': kind, 'next_due_date': due, 'evidence': 'Test 1520'})['s']
        check(mk('UVV', iso(-3)) == 201 and mk('Feuerlöscher', iso(20)) == 201 and mk('Bremsen', iso(200)) == 201, f'{lang}: Prüftermine Auflieger')
        r = api('POST', '/api/cases', {'vehicle_id': VID, 'description': 'Spiegel rechts abgebrochen', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': str(uuid.uuid4()), 'expected_version': ver, 'payload': {'workshop_site': 'DORTMUND'}, 'note': 'Spiegel tauschen'})['s'] == 200, f'{lang}: freigegeben')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-vicoupleddue]', state='attached', timeout=15000)
        T = q.evaluate(TR)
        el = q.locator('[data-vicoupleddue]').first
        if not el.is_visible():
            sm = el.locator('xpath=ancestor::details[1]/summary')
            if sm.count(): sm.first.click()
        tx = el.inner_text()
        check(T['vi_coupled_due'] in tx and 'UVV' in tx and T['ms_ueberfaellig'] in tx, f'{lang}: Auflieger-UVV überfällig „{tx[:120]}“')
        check(iso(20)[8:10] in tx and T['mk_brakes'] not in tx, f'{lang}: Feuerlöscher genannt, Bremsen nicht')
        el.scroll_into_view_if_needed()
        if SHOTS: q.screenshot(path=f'{SHOTS}/gespann-pruefung-faellig-{lang}-{w}.png')
        check(q.evaluate(noscroll), f'{lang}: ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
