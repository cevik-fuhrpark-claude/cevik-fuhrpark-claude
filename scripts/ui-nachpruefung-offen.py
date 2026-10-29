# [CLAUDE] UI-Test (29.10.2026, Backlog 617–619, Blickwinkel „HU-Prüfer auf dem Hof“): Lkw mit HU+SP am selben Tag (SP erhebliche Mängel) und
# gekoppelter Anhänger mit HU „erhebliche Mängel“ → Fahrzeugliste zeigt „Nachprüfung offen“ an beiden Zeilen (Lkw: SP, Anhänger: HU; Lkw-Zeile
# zusätzlich am Gespann), keine Fälligkeit aus der nicht bestandenen Prüfung; Durchführung vor 1950 abgewiesen.
# Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'np.inhaber', 'display_name': 'NP Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'np.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    pid = os.getpid() % 1000
    tplate = f'NP-A {pid}'; lplate = f'NP-L {pid}'
    tvin = f'WSMNP{pid:03d}000000000'[:17]; lvin = f'WMANP{pid:03d}000000000'[:17]
    check(api('POST', '/api/vehicles', {'plate': tplate, 'vin': tvin, 'site': 'Dortmund', 'kind': 'anhaenger'})['s'] == 201, 'Anhänger')
    check(api('POST', '/api/vehicles', {'plate': lplate, 'vin': lvin, 'site': 'Dortmund', 'trailer_plate': tplate})['s'] == 201, 'Lkw mit Anhänger')
    check(api('POST', f'/api/vehicles/VIN:{tvin}/spec', {'zgm_class': 'ueber_10', 'spec_source': 'Test'})['s'] == 200, 'zGM Anhänger')
    check(api('POST', f'/api/vehicles/VIN:{lvin}/spec', {'zgm_class': 'ueber_12', 'spec_source': 'Test'})['s'] == 200, 'zGM Lkw')
    day = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    check(api('POST', f'/api/vehicles/VIN:{lvin}/husp/HU/complete', {'done_date': '1900-01-05', 'evidence': 'Tippfehler'})['s'] == 400, 'vor 1950 abgewiesen')
    check(api('POST', f'/api/vehicles/VIN:{lvin}/husp/HU/complete', {'done_date': day, 'evidence': 'TÜV 1003', 'result': 'ohne_maengel'})['s'] == 200, 'HU Lkw')
    check(api('POST', f'/api/vehicles/VIN:{lvin}/husp/SP/complete', {'done_date': day, 'evidence': 'TÜV 1003', 'result': 'erhebliche_maengel'})['s'] == 200, 'SP Lkw erhebliche Mängel')
    check(api('POST', f'/api/vehicles/VIN:{tvin}/husp/HU/complete', {'done_date': day, 'evidence': 'TÜV 1004', 'result': 'erhebliche_maengel'})['s'] == 200, 'HU Anhänger erhebliche Mängel')
    for lang, w in [('uk', 390), ('de', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'np.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/vehicles'); q.wait_for_selector('#vl')
        rows = {r.get_attribute('href'): r for r in q.locator('#vl a.row').all()}
        tr = rows.get(f'#/vehicles/VIN:{tvin}'); lk = rows.get(f'#/vehicles/VIN:{lvin}')
        check(tr is not None and lk is not None, f'{lang}: beide Zeilen')
        if tr and lk:
            check(tr.locator('[data-reinsp]').count() == 1 and 'HU' in tr.locator('[data-reinsp]').inner_text(), f'{lang}: Anhänger „Nachprüfung offen“ HU: {tr.inner_text()[:160]!r}')
            check(lk.locator('[data-reinsp]').count() == 1 and 'SP' in lk.locator('[data-reinsp]').inner_text(), f'{lang}: Lkw „Nachprüfung offen“ SP')
            check(lk.locator('[data-creinsp]').count() == 1 and tplate in lk.locator('[data-creinsp]').inner_text(), f'{lang}: Gespann-Hinweis am Lkw')
            check(str(datetime.date.today().year + 1) not in tr.inner_text(), f'{lang}: Anhänger ohne Frist aus nicht bestandener HU')
            check(lk.locator('[data-reinsp]').get_attribute('title'), f'{lang}: Erklärung als title')
        if SHOTS: q.screenshot(path=f'{SHOTS}/nachpruefung-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('UI Nachprüfung offen: ' + ('grün' if not fails else f'{len(fails)} Fehler'))
raise SystemExit(1 if fails else 0)
