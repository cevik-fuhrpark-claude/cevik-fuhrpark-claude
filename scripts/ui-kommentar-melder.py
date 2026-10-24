# [CLAUDE] UI-Test (24.10.2026, Backlog 249): Melder eines Vorgangs deaktiviert → im Kommentarformular ist „Gemeldet von“ ausgegraut
# mit Vermerk „Konto deaktiviert“; ein Kommentar, der niemanden erreicht, zeigt den Hinweis „… niemand benachrichtigt“ statt „✓“.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OFF = {'de': 'Konto deaktiviert', 'uk': 'обліковий запис деактивовано', 'en': 'account deactivated'}
NOONE = {'de': 'niemand benachrichtigt', 'uk': 'нікого не сповіщено', 'en': 'nobody was notified'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'km.inhaber', 'display_name': 'KM Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'km.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid()
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB9634031025{pid % 1000:03d}{i}'[:17].ljust(17, '0'); VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'KM-ML 24{i}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        u = api('POST', '/api/users', {'username': f'km.{lang}{pid}', 'display_name': f'Melder {lang}', 'role': 'driver', 'environment': env})
        uid = u['d']['id']; api('POST', f'/api/vehicles/{VID}/drivers', {'user_id': uid})
        dctx = br.new_context(); dp = dctx.new_page(); dp.goto(B)
        dp.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        cr = dp.evaluate(JS, ['POST', '/api/cases', {'vehicle_id': VID, 'description': 'Spiegel rechts lose', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': f'km-{pid}-{i}'}])
        dctx.close(); check(cr['s'] == 201, f'{lang}: Meldung des Fahrers'); cid = cr['d']['id']
        check(api('PATCH', f'/api/users/{uid}', {'active': False})['s'] == 200, f'{lang}: Melder deaktiviert')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'km.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + f'/#/cases/{cid}'); q.wait_for_selector('#cf [data-nt="reporter"]')
        box = q.locator('#cf [data-nt="reporter"]')
        check(box.is_disabled(), f'{lang}: „Gemeldet von“ nicht wählbar')
        lab = q.locator('#cf label:has([data-nt="reporter"])').inner_text()
        check(OFF[lang] in lab, f'{lang}: Vermerk am Kästchen: {lab.strip()[:80]}')
        q.fill('#ct', 'Rückfrage nach Austritt des Melders'); q.click('#cf button')
        q.wait_for_selector('.toast'); q.wait_for_timeout(300)
        txt = ' '.join(q.locator('.toast').all_inner_texts())
        check(NOONE[lang] in txt, f'{lang}: Hinweis „niemand benachrichtigt“: {txt[:140]}')
        if SHOTS: q.locator('#cf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kommentar-melder-{lang}-{w}.png', full_page=False)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        d = api('GET', f'/api/cases/{cid}')['d']
        check(any(e['action'] == 'comment' for e in d['events']), f'{lang}: Kommentar gespeichert')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
