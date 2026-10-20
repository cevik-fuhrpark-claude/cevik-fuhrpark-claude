# [CLAUDE] UI-Test (20.10.2026, Backlog 102) – Sprünge von der Startseite setzen den Standortfilter der Zielliste passend zum Zähler:
# Inhaber mit Standard-Standort: Zähler flottenweit → „Alle“ (#/cases) zeigt alle Standorte (vorher auf den Standard-Standort vorgefiltert).
# Disposition mit Standard-Standort: Zähler des Standorts → Zielliste dieses Standorts; nach „alle Standorte“ → Zielliste alle.
# Link ohne `vs` in der Adresszeile (Neuladen behält die Auswahl), keine Skriptfehler. DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sj.inhaber', 'display_name': 'SJ Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'sj.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'SJ-DO 1', 'vin': 'WDB96340310777001', 'site': 'Dortmund-SJ'})
    api('POST', '/api/vehicles', {'plate': 'SJ-HH 1', 'vin': 'WDB96340310777002', 'site': 'Hamburg-SJ'})
    for n, vin in [(1, 'WDB96340310777001'), (2, 'WDB96340310777002')]:
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'SJ Test {n}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'sj-{pid}-{n}'})
        check(r['s'] in (200, 201), f'Vorgang {n} angelegt ({r["s"]})')
    api('PATCH', '/api/me', {'home_site': 'Hamburg-SJ'})
    u = api('POST', '/api/users', {'username': 'sj.dispo', 'display_name': 'SJ Dispo', 'role': 'dispatch', 'environment': env})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    p0.evaluate(JS, ['PATCH', '/api/me', {'home_site': 'Hamburg-SJ'}]); c0.close()
    def open_list(q):
        q.click('a[href^="#/cases?vs="]'); q.wait_for_selector('#cvsite', timeout=15000); q.wait_for_timeout(500)
        return q.eval_on_selector('#cvsite', 'e => e.value'), q.evaluate('location.hash')
    for lang, w in [('de', 390), ('uk', 820), ('en', 1366)]:
        print('—', lang, w)
        for un in ['sj.inhaber', 'sj.dispo']:
            ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            q.goto(B + '/#/cases'); q.wait_for_selector('#cvsite', timeout=15000)
            check(q.eval_on_selector('#cvsite', 'e => e.value') != '', f'{lang} {un}: Vorgangsliste direkt geöffnet = Standard-Standort (unverändert)')
            q.goto(B + '/#/'); q.reload(); q.wait_for_selector('a[href^="#/cases?vs="]', timeout=15000)
            if SHOTS: q.screenshot(path=f'{SHOTS}/sprung_{un}_{lang}_{w}.png', full_page=True)
            v, h = open_list(q)
            if un == 'sj.inhaber':
                check(v == '', f'{lang} Inhaber: Sprung „Alle“ → alle Standorte (flottenweiter Zähler), Filter „{v}“')
            else:
                check(v != '', f'{lang} Dispo: Sprung → Standard-Standort wie die Zähler, Filter „{v}“')
                q.goto(B + '/#/'); q.wait_for_selector('#dsitetoggle', timeout=15000); q.click('#dsitetoggle'); q.wait_for_timeout(800)
                q.wait_for_selector('a[href^="#/cases?vs="]', timeout=15000)
                v2, h = open_list(q)
                check(v2 == '', f'{lang} Dispo: nach „alle Standorte“ → Zielliste alle, Filter „{v2}“')
            check('vs=' not in h, f'{lang} {un}: Adresse ohne vs ({h})')
            q.reload(); q.wait_for_selector('#cvsite', timeout=15000); q.wait_for_timeout(300)
            check(q.locator('.row').count() >= 1, f'{lang} {un}: Neuladen zeigt die Liste')
            check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang} {un}: kein Querscrollen')
            check(not errs, f'{lang} {un}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
