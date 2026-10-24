# [CLAUDE] UI-Test (24.10.2026, Backlog 250): Fahrzeugakte → „Fahrer zuordnen“ nennt in der Auswahl ein Konto, dessen Fahrerakte
# ausgeschieden ist („Akte ausgeschieden“), und zeigt nach dem Zuordnen einen Warnhinweis statt „✓“.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, urllib.parse
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OPT = {'de': 'Akte ausgeschieden', 'uk': 'картка: звільнений', 'en': 'record: left'}
WARN = {'de': 'als „ausgeschieden“ markiert', 'uk': 'позначено як «звільнений»', 'en': 'marked as “left”'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'za.inhaber', 'display_name': 'ZA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'za.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid()
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB9634031026{pid % 1000:03d}{i}'[:17].ljust(17, '0'); VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'ZA-AU 25{i}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        name = f'Ausgeschieden {lang}{pid}'
        u = api('POST', '/api/users', {'username': f'za.{lang}{pid}', 'display_name': name, 'role': 'driver', 'environment': env}); uid = u['d']['id']
        rec = api('POST', '/api/drivers', {'display_name': name, 'user_id': uid})
        check(rec['s'] == 201, f'{lang}: Fahrerakte mit Konto')
        check(api('PATCH', f"/api/drivers/{rec['d']['id']}", {'active': False})['s'] == 200, f'{lang}: Akte ausgeschieden')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'za.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/vehicles/' + urllib.parse.quote(VID)); q.wait_for_selector(f'#drvsel option[value="{uid}"]', state='attached')
        opt = q.locator(f'#drvsel option[value="{uid}"]').inner_text()
        check(OPT[lang] in opt, f'{lang}: Auswahl nennt Aktenstatus: {opt}')
        q.select_option('#drvsel', uid); q.click('#df button')
        q.wait_for_selector('.toast'); q.wait_for_timeout(300)
        txt = ' '.join(q.locator('.toast').all_inner_texts())
        check(WARN[lang] in txt, f'{lang}: Warnhinweis: {txt[:140]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zuordnung-akte-{lang}-{w}.png', full_page=False)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        dl = api('GET', f'/api/vehicles/{VID}')['d'].get('drivers') or []
        check(any(d.get('user_id') == uid and not d.get('valid_to') for d in dl), f'{lang}: zugeordnet')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
