# [CLAUDE] UI-Test (21.10.2026) – „Stammdaten bearbeiten“ auf gelesenem Stand: zweites offenes Formular speichert nicht still über eine
# zwischenzeitliche Änderung (Meldung „Inzwischen … geändert“ in der App-Sprache, Wert bleibt); Bußgeld zum Anhänger-Kennzeichen eines Lkw
# nennt die Zugmaschine; nach Bereinigung des Fahrzeugstamms Hinweis „jetzt eindeutig“, „Angaben ändern“ übernimmt das Fahrzeug.
# DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CONF = {'de': 'Inzwischen von jemand anderem geändert', 'uk': 'Тим часом змінено кимось іншим', 'en': 'Changed by someone else in the meantime'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sb.inhaber', 'display_name': 'SB Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'sb.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        api('PATCH', '/api/me', {'language': lang})
        vin = f'WDB96340313{pid:03d}{i:03d}'; vid = 'VIN:' + vin; plate = f'SB-Z {pid}{i}'; tplate = f'SB-A {pid}{i}'
        check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund', 'trailer_plate': tplate})['s'] == 201, f'{lang}: Lkw mit Anhänger-Kennzeichen')
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); q.goto(B)
        q.evaluate(JS, ['POST', '/api/login', {'username': 'sb.inhaber', 'password': PW}])
        q.goto(B + '/#/vehicles/' + vid); q.wait_for_selector('#evf', state='attached', timeout=10000)
        # andere Sitzung ändert den Standort, danach speichert dieses (alte) Formular
        check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Hamburg', 'trailer_plate': tplate, 'keep_active': True})['s'] == 201, f'{lang}: Änderung von anderer Stelle')
        q.locator('#evf').locator('xpath=ancestor::details[1]/summary').click()
        q.locator('#evf input[name=manufacturer]').fill('MAN TGX')
        q.locator('#evf button.btn:not(.secondary)').first.click()
        q.wait_for_selector('.toast.err', timeout=10000)
        check(CONF[lang] in q.locator('.toast.err').first.inner_text(), f'{lang}: Konfliktmeldung in der App-Sprache')
        v = api('GET', f'/api/vehicles/{vid}')['d']['vehicle']
        check(v['site'] == 'Hamburg' and v.get('manufacturer') != 'MAN TGX', f'{lang}: Änderung der anderen Stelle bleibt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/stand-{lang}-{w}.png')
        # Bußgeld zum Anhänger-Kennzeichen
        f = api('POST', '/api/fines', {'kind': 'anhoerung', 'offense_type': 'geschwindigkeit', 'offense_at': '2026-09-15T10:00', 'plate_in_letter': tplate, 'authority': 'Stadt X', 'reference': f'SB-{pid}-{i}'})
        check(f['s'] == 201, f'{lang}: Bußgeld angelegt')
        q.goto(B + '/#/fines/' + f['d']['id']); q.wait_for_selector('#fvu', timeout=10000)
        check(q.locator('[data-ftrailer]').count() == 1 and plate in q.locator('[data-ftrailer]').inner_text(), f'{lang}: Hinweis Anhänger von {plate}')
        sb = q.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
        check(not sb, f'{lang}: kein waagerechtes Scrollen')
        if SHOTS: q.locator('#fvu').screenshot(path=f'{SHOTS}/bussgeld-anh-{lang}-{w}.png')
        # Anhänger anlegen → „jetzt eindeutig“, Angaben ändern übernimmt das Fahrzeug
        check(api('POST', '/api/vehicles', {'plate': tplate, 'vin': f'WDB96340314{pid:03d}{i:03d}', 'kind': 'anhaenger'})['s'] == 201, f'{lang}: Anhänger angelegt')
        q.reload(); q.wait_for_selector('[data-fmatch]', timeout=10000)
        check(tplate in q.locator('[data-fmatch]').inner_text(), f'{lang}: Hinweis „jetzt eindeutig“')
        q.locator('#uf').locator('xpath=ancestor::details[1]/summary').click()
        q.locator('#uf button.btn').first.click()
        q.wait_for_function("() => !document.querySelector('#fvu')", timeout=10000)
        check(api('GET', f"/api/fines/{f['d']['id']}")['d']['fine']['vehicle_id'] is not None, f'{lang}: Fahrzeug übernommen')
        c.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
