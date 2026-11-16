# [CLAUDE] UI-Test (16.11.2026, Backlog 1523, Blickwinkel „Zugmaschine wird verkauft – der fest gekoppelte Auflieger bleibt in Betrieb“):
# Fahrzeugakte der Zugmaschine → „Außer Betrieb nehmen“ → Hinweis nennt den gekoppelten Anhänger (Kennzeichen), der in Betrieb bleibt.
# Inhaber, DE 390 / UK 820 / EN 1366 px; kein Querscrollen, keine Skriptfehler; Anhänger bleibt in Betrieb. Screenshots: CFP_SHOTS=<Ordner>.
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
        vin = f'WVZ{R:05d}{i:02d}0000000'[:17]; tvin = f'WVA{R:05d}{i:02d}0000000'[:17]; VID = 'VIN:' + vin; TID = 'VIN:' + tvin
        tp = f'VZ-AN {R % 900}{i}'
        check(api('POST', '/api/vehicles', {'plate': tp, 'vin': tvin, 'kind': 'anhaenger', 'site': 'Dortmund'})['s'] == 201, f'{lang}: Auflieger')
        check(api('POST', '/api/vehicles', {'plate': f'VZ-SZ {R % 900}{i}', 'vin': vin, 'site': 'Dortmund', 'trailer_plate': tp})['s'] == 201, f'{lang}: Zugmaschine')
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); errs = []
        q = ctx.new_page(); q.on('pageerror', lambda e: errs.append(str(e))); q.on('dialog', lambda d: d.accept('Verkauft'))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': UN, 'password': PW}])
        T = q.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].trailer_left_deact", lang)
        q.goto(B + '/#/vehicles/' + VID.replace(':', '%3A')); q.reload()
        q.wait_for_selector('#deact', state='attached', timeout=20000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#deact')) d.open = true; }")
        q.click('#deact'); q.wait_for_selector('.toast', timeout=15000); q.wait_for_timeout(300)
        tx = q.locator('.toast').last.inner_text()
        check(T.split('{list}')[0].strip()[:20] in tx and tp in tx, f'{lang}: Hinweis „{tx[:140]}…“')
        if SHOTS: q.screenshot(path=f'{SHOTS}/verkauf-zugmaschine-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), f'{lang}: ohne Querscrollen')
        vs = api('GET', '/api/vehicles')['d']; rows = vs.get('vehicles')
        check(any(x.get('id') == TID for x in (rows or [])), f'{lang}: Anhänger weiter in Betrieb')
        check(not any(x.get('id') == VID for x in (rows or [])), f'{lang}: Zugmaschine außer Betrieb')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
