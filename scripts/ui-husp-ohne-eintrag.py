# [CLAUDE] UI-Test (19.10.2026) – HU/SP ohne eigenen Eintrag in der Fahrzeugakte:
# SP-Frist nur aus der HU berechnet → Karte zeigt Hinweis „Noch kein eigener Eintrag …“ und die Formulare „Durchführung erfassen“/„Termin planen“;
# Speichern legt den Eintrag an, danach verschwindet der Hinweis, Durchführung steht in der Karte.
# DE 390 px, UK 820 px, EN 1440 px. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT = {'de': 'Noch kein eigener Eintrag', 'uk': 'Окремого запису ще немає', 'en': 'No separate entry yet'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hs.inhaber', 'display_name': 'HS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'hs.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    today = datetime.date.today(); t = today.year * 12 + today.month - 1 - 8
    hu = f'{t // 12}-{t % 12 + 1:02d}-10'
    pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1440, 900)]):
        vin = f'WDB96340310{pid:03d}{i:03d}'; vid = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'HS-T {pid}{i}', 'vin': vin, 'site': 'Dortmund'})
        api('POST', f'/api/vehicles/{vid}/spec', {'zgm_class': 'ueber_12', 'spec_source': 'UI-Test F.2'})
        r = api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'HU', 'last_done_date': hu, 'evidence': 'Prüfbericht UI-Test'})
        check(r['s'] == 201, f'{lang}: HU angelegt')
        api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); q.goto(B)
        q.evaluate(JS, ['POST', '/api/login', {'username': 'hs.inhaber', 'password': PW}])
        q.goto(B + '/#/vehicles/' + vid); q.wait_for_selector('[data-hsvirt="SP"]', timeout=10000)
        hint = q.locator('[data-hsvirt="SP"]')
        check(HINT[lang] in hint.inner_text(), f'{lang}: Hinweis „kein eigener Eintrag“ an der SP-Karte')
        check(q.locator('[data-hsvirt="HU"]').count() == 0, f'{lang}: HU-Karte (mit Eintrag) ohne Hinweis')
        sec = hint.locator('xpath=ancestor::section[1]')
        check(sec.locator('form[data-hsdone="husp:SP"]').count() == 1 and sec.locator('form[data-hsplan="husp:SP"]').count() == 1, f'{lang}: Formulare Durchführung/Termin vorhanden')
        sb = q.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
        check(not sb, f'{lang}: kein waagerechtes Scrollen')
        sec.locator('form[data-hsdone="husp:SP"]').locator('xpath=ancestor::details[1]/summary').click()
        if SHOTS: sec.screenshot(path=f'{SHOTS}/husp-{lang}-{w}.png')
        f = sec.locator('form[data-hsdone="husp:SP"]')
        f.locator('input[name=done_date]').fill(today.isoformat()); f.locator('input[name=evidence]').fill('SP-Protokoll UI-Test')
        f.locator('button').click()
        q.wait_for_function("() => !document.querySelector('[data-hsvirt=\"SP\"]') && document.querySelector('form[data-hsdone]:not([data-hsdone^=\"husp\"])')", timeout=10000)
        n = api('GET', '/api/maintenance')['d']['rows']
        sp = [x for x in n if x['vehicle_id'] == vid and x['kind'] == 'SP']
        check(len(sp) == 1 and not sp[0].get('virtual') and sp[0].get('last_done_date') == today.isoformat(), f'{lang}: SP-Eintrag mit Durchführung angelegt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/husp-{lang}-{w}-nach.png', full_page=False)
        c.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
