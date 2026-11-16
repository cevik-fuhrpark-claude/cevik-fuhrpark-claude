# [CLAUDE] UI-Test (16.11.2026, Backlog 1515, Blickwinkel „Leitung ordnet einen Fahrer zu, dessen Fahrerkarte laut Fahrerakte abgelaufen ist“):
# Fahrzeugakte → „Fahrer zuordnen“: Fahrerkarte laut Fahrerakte gültig bis 31.03.2020 → Hinweis nach dem Zuordnen, Zuordnung gespeichert,
# Hinweiskasten bei der Zuordnung in der Akte ([data-docexp]).
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, urllib.parse
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WARN = {'de': 'Fahrerkarte (gültig bis 31.03.2020)', 'uk': 'Картка водія (тахограф) (дійсний до 31.03.2020)', 'en': 'Driver card (tachograph) (valid until 31/03/2020)'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fk.inhaber', 'display_name': 'FK Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'fk.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid()
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB963403151500{i}0'; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'FK-NA 151{i}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Lkw')
        name = f'Fahrer Karte {lang}{pid}'
        u = api('POST', '/api/users', {'username': f'na.{lang}{pid}', 'display_name': name, 'role': 'driver', 'environment': env}); uid = u['d']['id']
        rec = api('POST', '/api/drivers', {'display_name': name, 'user_id': uid}); check(rec['s'] == 201, f'{lang}: Fahrerakte')
        check(api('POST', f"/api/drivers/{rec['d']['id']}/documents", {'kind': 'fahrerkarte', 'valid_until': '2020-03-31', 'evidence': 'Kopie'})['s'] == 201, f'{lang}: abgelaufene Fahrerkarte')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'fk.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/vehicles/' + urllib.parse.quote(VID)); q.wait_for_selector(f'#drvsel option[value="{uid}"]', state='attached')
        q.select_option('#drvsel', uid); q.click('#df button')
        q.wait_for_selector('.toast'); q.wait_for_timeout(300)
        txt = ' '.join(q.locator('.toast').all_inner_texts())
        check(WARN[lang] in txt, f'{lang}: Hinweis nach dem Zuordnen: {txt[:160]}')
        q.wait_for_selector('[data-docexp]', timeout=10000)
        chip = q.locator('[data-docexp]').first
        check(WARN[lang] in chip.inner_text() and chip.is_visible(), f'{lang}: Chip in der Akte')
        chip.scroll_into_view_if_needed()
        if SHOTS: q.screenshot(path=f'{SHOTS}/nachweis-abgelaufen-{lang}-{w}.png', full_page=False)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        dl = api('GET', f'/api/vehicles/{VID}')['d'].get('drivers') or []
        check(any(d.get('user_id') == uid and not d.get('valid_to') for d in dl), f'{lang}: zugeordnet (nur Hinweis, keine Sperre)')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
