# [CLAUDE] UI-Test (20.10.2026) – Werkstatt-Befehl nach verlorener Antwort (Funkloch) erneut gespeichert: dieselbe command_id,
# der Server meldet „duplicate“ statt doppelt zu buchen (vorher 2 × 1,5 h Arbeitszeit). Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN).
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'bf.inhaber', 'display_name': 'BF Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'bf.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    vin = 'WDB96340310654399'; VID = 'VIN:' + vin; pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'BF-WS 1', 'vin': vin, 'site': 'Dortmund'})
    u = api('POST', '/api/users', {'username': 'bf.ws', 'display_name': 'BF Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Bremse quietscht {lang}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'bf-{pid}-{lang}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'bfa-{pid}-{lang}', 'expected_version': v, 'note': 'prüfen', 'payload': {'workshop_site': site}})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'bf.ws', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=record_work]', timeout=15000)
        q.click('[data-act=record_work]'); q.wait_for_selector('#af')
        q.fill('#af [name=hours]', '1,5'); q.fill('#af [name=description]', 'Bremsbeläge gewechselt')
        st = {'n': 0}
        def h(route):
            st['n'] += 1
            if st['n'] == 1: route.fetch(); route.abort('failed')  # Server bucht, Antwort geht verloren
            else: route.continue_()
        q.route('**/commands', h)
        q.click('#af button.btn'); q.wait_for_timeout(1200)
        check(q.locator('#af').count() == 1, f'{lang}/{w}: nach Funkloch bleibt das Formular offen')
        q.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        n = len(api('GET', f'/api/cases/{cid}')['d']['work'])
        check(n == 1, f'{lang}/{w}: erneutes Speichern bucht nicht doppelt ({n} Einträge)')
        check(q.locator('#af').count() == 0, f'{lang}/{w}: Formular nach Erfolg geschlossen')
        # danach ein zweiter, bewusst gleicher Eintrag wird neu gebucht (Kennung nach Erfolg verworfen)
        q.unroute('**/commands')
        q.click('[data-act=record_work]'); q.wait_for_selector('#af'); q.fill('#af [name=hours]', '1,5'); q.fill('#af [name=description]', 'Bremsbeläge gewechselt')
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 2, f'{lang}/{w}: neuer gleicher Eintrag nach Erfolg wird gebucht')
        if SHOTS: q.screenshot(path=f'{SHOTS}/befehl_funkloch_{lang}_{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang}/{w}: kein Querscrollen')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
