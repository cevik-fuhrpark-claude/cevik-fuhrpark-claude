# [CLAUDE] UI-Test (05.11.2026, Backlog 1017) – Blickwinkel „Push-Benachrichtigung tippen, nachdem die Anmeldung am Server abgelaufen ist“:
# App läuft mit Konto (Vorgangsliste offen), Sitzung am Server beendet, Tippen auf die Benachrichtigung (Service-Worker-Nachricht „navigate“)
# → Anmeldung → danach der Vorgang aus der Benachrichtigung (vorher: Startseite). Gegenprobe: dieselbe Vorgangsseite ohne Benachrichtigung
# geöffnet → nach der Anmeldung Startseite (Backlog 492: keine Vorgänge der vorherigen Person auf geteilten Tablets).
# DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NAV = """(h) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'navigate', hash: h } }))"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pa.inhaber', 'display_name': 'PA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['pa.inhaber', 'le.inhaber', 'inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, f'Anmeldung Inhaber ({owner})')
    env = api('GET', '/api/me')['d']['active_environment']
    pid = os.getpid(); un = f'pa.fleet{pid}'
    u = api('POST', '/api/users', {'username': un, 'display_name': 'PA Leitung', 'role': 'fleet', 'environment': env})
    c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    vin = f'WDB9634032{pid % 1000000:06d}1'
    api('POST', '/api/vehicles', {'plate': f'PA-T {pid % 9000}', 'vin': vin, 'site': 'Dortmund'})
    wss = [w['code'] for w in api('GET', '/api/meta')['d']['workshops']]
    r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'PA Push-Ziel {pid}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'workshop_site': wss[0], 'request_key': f'pa-{pid}'})
    check(r['s'] == 201, f'Vorgang angelegt ({r["s"]})'); cid = r['d']['case']['id'] if r['d'] and 'case' in r['d'] else r['d'].get('id')
    for lang, w in [('de', 390), ('uk', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        # 1. mit Benachrichtigung
        q.goto(B + '/#/cases'); q.reload(); q.wait_for_timeout(1200)
        q.evaluate(JS, ['POST', '/api/logout', None])
        q.evaluate(NAV, f'#/cases/{cid}')
        q.wait_for_selector('#u', timeout=15000)
        if SHOTS: q.screenshot(path=f'{SHOTS}/push_ablauf_login_{lang}_{w}.png')
        q.fill('#u', un); q.fill('#p', PW); q.press('#p', 'Enter')
        try: q.wait_for_function(f"() => location.hash === '#/cases/{cid}'", timeout=15000)
        except Exception: pass
        check(q.evaluate('location.hash') == f'#/cases/{cid}', f'{lang} {w}px: nach Anmeldung Vorgang aus der Benachrichtigung ({q.evaluate("location.hash")})')
        q.wait_for_timeout(1000)
        check(f'PA Push-Ziel {pid}' in q.inner_text('#app'), f'{lang} {w}px: Vorgang wird angezeigt')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/push_ablauf_ziel_{lang}_{w}.png')
        # 2. Gegenprobe ohne Benachrichtigung (Seite der vorherigen Person bleibt außen vor)
        q.goto(B + '/#/cases'); q.wait_for_timeout(1000)
        q.evaluate(JS, ['POST', '/api/logout', None])
        q.evaluate(f"location.hash = '#/cases/{cid}'")
        q.wait_for_selector('#u', timeout=15000)
        q.fill('#u', un); q.fill('#p', PW); q.press('#p', 'Enter')
        q.wait_for_timeout(2500)
        check(q.evaluate('location.hash') in ('#/', '#', ''), f'{lang} {w}px: ohne Benachrichtigung Startseite ({q.evaluate("location.hash")})')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
