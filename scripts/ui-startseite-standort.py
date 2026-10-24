# [CLAUDE] UI-Test (19.10.2026) – Startseiten-Zähler:
# 1. Werkstatt: Kacheln „In Reparatur“ und „Wartet auf Teile“ getrennt (vorher zählte „In Reparatur“ beide).
# 2. Disposition mit Standard-Standort: Standortzeile über den Zählern, Zähler/Fahrzeugleiste nur dieses Standorts; „alle Standorte“ zeigt die Flotte.
# DE 390 px, UK 820 px, EN 1440 px. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT = {'de': ('In Reparatur', 'Wartet auf Teile'), 'uk': ('У ремонті', 'Очікує запчастини'), 'en': ('In repair', 'Waiting for parts')}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def stat(q, label):
    for el in q.locator('.stats > *').all():
        t = el.inner_text()
        if label.lower() in t.lower(): return el.locator('b').inner_text().strip()
    return None
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ss.inhaber', 'display_name': 'SS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'ss.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'SS-DO 1', 'vin': 'WDB96340310776001', 'site': 'Dortmund'})
    api('POST', '/api/vehicles', {'plate': 'SS-HH 1', 'vin': 'WDB96340310776002', 'site': 'Hamburg-SS'})
    users = {}
    for un, role, extra in [('ss.ws', 'workshop', {'workshop_site': site}), ('ss.dispo', 'dispatch', {})]:
        u = api('POST', '/api/users', {'username': un, 'display_name': un, 'role': role, 'environment': env, **extra})
        c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        users[un] = lambda m, pa, b=None, pg=pg: pg.evaluate(JS, [m, pa, b])
    ws = users['ss.ws']
    def mk(vin, n, prio='niedrig'):
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'SS Test {n}', 'priority': prio, 'driveability': 'fahrbereit', 'workshop_site': site, 'request_key': f'ss-{pid}-{n}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'ssa-{pid}-{n}', 'expected_version': v, 'payload': {'workshop_site': site}, 'note': 'frei'})
        v = ws('GET', f'/api/cases/{cid}')['d']['case']['version']
        ws('POST', f'/api/cases/{cid}/commands', {'action': 'start_repair', 'command_id': f'sss-{pid}-{n}', 'expected_version': v})
        return cid
    mk('WDB96340310776001', 1); c2 = mk('WDB96340310776001', 2); mk('WDB96340310776002', 3, 'kritisch')
    v = ws('GET', f'/api/cases/{c2}')['d']['case']['version']
    check(ws('POST', f'/api/cases/{c2}/commands', {'action': 'wait_parts', 'command_id': f'ssw-{pid}', 'expected_version': v, 'note': 'Teile bestellt'})['s'] == 200, 'Wartet auf Teile gesetzt')
    users['ss.dispo']('PATCH', '/api/me', {'home_site': 'Hamburg-SS'})
    for lang, w in [('de', 390), ('uk', 820), ('en', 1440)]:
        print('—', lang, w)
        for un in ['ss.ws', 'ss.dispo']:
            ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            q.goto(B + '/#/'); q.reload(); q.wait_for_selector('.stats', timeout=15000); q.wait_for_timeout(800)
            if un == 'ss.ws':
                r, wp = stat(q, TXT[lang][0]), stat(q, TXT[lang][1])
                check(r is not None and wp is not None and int(r) >= 1 and int(wp) >= 1, f'{lang} Werkstatt: In Reparatur {r}, Wartet auf Teile {wp} getrennt')
            else:
                bar = q.locator('#dsitebar'); stats = q.locator('.stats')
                check(bar.count() == 1 and bar.bounding_box()['y'] < stats.bounding_box()['y'], f'{lang} Dispo: Standortzeile über den Zählern')
                own = q.locator('.stats > *').first.locator('b').inner_text().strip()
                check(own.startswith('1'), f'{lang} Dispo Hamburg: Offen = {own}')
                h2 = q.locator('h2', has_text=':').first.inner_text()
                check(h2.strip().endswith(': 1'), f'{lang} Dispo Hamburg: Fahrzeuge „{h2}“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/start-dispo-{lang}-{w}.png', full_page=True)
                # Backlog 238: Zähler „kritisch“ führt zur gefilterten Liste mit gleicher Anzahl (Standort Hamburg bleibt)
                crit = q.locator('#stcrit b').inner_text().strip(); q.click('#stcrit'); q.wait_for_selector('#cl', timeout=15000); q.wait_for_timeout(800)
                rows = q.locator('#cl .list a.row').count(); tab = q.locator('.seg-tabs a[aria-current]').inner_text().strip()
                check(crit == '1' and rows == 1 and tab != '', f'{lang} Dispo: kritisch {crit} → Liste {rows} Zeile(n), Reiter „{tab}“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/start-krit-{lang}-{w}.png', full_page=True)
                q.go_back(); q.wait_for_selector('.stats', timeout=15000); q.wait_for_timeout(800)
                q.click('#dsitetoggle'); q.wait_for_timeout(1500)
                allo = q.locator('.stats > *').first.locator('b').inner_text().strip()
                check(int(allo.rstrip('+')) >= 3, f'{lang} Dispo alle Standorte: Offen = {allo}')
                q.evaluate("() => { try { sessionStorage.clear(); } catch {} }")
            sw = q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            check(sw <= 0, f'{lang} {w} px ohne Querscrollen ({un})')
            check(not errs, f'{lang} keine Skriptfehler {errs}')
            if SHOTS and un == 'ss.ws': q.screenshot(path=f'{SHOTS}/start-ws-{lang}-{w}.png', full_page=True)
            ctx.close()
    br.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'ok: alle Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
