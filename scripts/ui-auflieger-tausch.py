# [CLAUDE] UI-Test (16.11.2026, Backlog 1525, Blickwinkel „Leitung sattelt in den Stammdaten einen anderen Auflieger an die Zugmaschine“):
# Fahrzeugakte der Zugmaschine → „Stammdaten bearbeiten“ → Anhänger-Kennzeichen eines Aufliegers eintragen, der schon bei einer anderen
# Zugmaschine steht → Hinweis nennt diese Zugmaschine und den bisherigen Auflieger, der ohne Zugmaschine bleibt. Nichts wird geändert.
# Inhaber, DE 390 / UK 820 / EN 1366 px; kein Querscrollen, keine Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vz.inhaber', 'display_name': 'VZ Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    UN = 'vz.inhaber'
    if api('POST', '/api/login', {'username': UN, 'password': PW})['s'] != 200:
        UN = next((un for un in ['vg.inhaber', 'gm.inhaber', 'fk.inhaber', 'tu.inhaber', 'pd.inhaber'] if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200), None)
        check(UN is not None, 'Anmeldung Inhaber')
    R = os.getpid() % 100000
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        V = lambda pre: f'{pre}{R:05d}{i:02d}0000000'[:17]
        a1 = f'SW-AN {R % 900}{i}'; a2 = f'SW-BN {R % 900}{i}'; t2 = f'SW-ZZ {R % 900}{i}'; VID = 'VIN:' + V('WSA')
        check(api('POST', '/api/vehicles', {'plate': a1, 'vin': V('WSB'), 'kind': 'anhaenger', 'site': 'Dortmund'})['s'] == 201, f'{lang}: Auflieger 1')
        check(api('POST', '/api/vehicles', {'plate': a2, 'vin': V('WSC'), 'kind': 'anhaenger', 'site': 'Dortmund'})['s'] == 201, f'{lang}: Auflieger 2')
        check(api('POST', '/api/vehicles', {'plate': t2, 'vin': V('WSD'), 'site': 'Dortmund', 'trailer_plate': a2})['s'] == 201, f'{lang}: andere Zugmaschine')
        check(api('POST', '/api/vehicles', {'plate': f'SW-SZ {R % 900}{i}', 'vin': V('WSA'), 'site': 'Dortmund', 'trailer_plate': a1})['s'] == 201, f'{lang}: Zugmaschine')
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); errs = []
        q = ctx.new_page(); q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': UN, 'password': PW}])
        T = q.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l]", lang)
        q.goto(B + '/#/vehicles/' + VID.replace(':', '%3A')); q.reload()
        q.wait_for_selector('#evf', state='attached', timeout=20000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#evf')) d.open = true; }")
        q.fill('#vf_trailer_plate', a2); q.click('#evf button.btn:not(.secondary)')
        q.wait_for_function("(p) => [...document.querySelectorAll('.toast')].some((x) => x.innerText.includes(p))", arg=t2, timeout=15000); q.wait_for_timeout(300)
        tx = [x for x in q.locator('.toast').all_inner_texts() if t2 in x][-1]
        check(T['trailer_swap_also'].split('{p}')[0].strip()[:12] in tx and a1 in tx and T['trailer_swap_old'].split('{list}')[0].strip()[:15] in tx, f'{lang}: Hinweis „{tx[:160]}…“')
        if SHOTS: q.screenshot(path=f'{SHOTS}/auflieger-tausch-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), f'{lang}: ohne Querscrollen')
        v2 = api('GET', '/api/vehicles/VIN:' + V('WSD'))['d']['vehicle']
        check(v2['trailer_plate'] == a2, f'{lang}: andere Zugmaschine unverändert')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
