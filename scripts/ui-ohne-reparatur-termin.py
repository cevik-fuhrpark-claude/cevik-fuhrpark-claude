# [CLAUDE] UI-Test (19.11.2026, Backlog 1598–1600, Blickwinkel „Leitung beendet einen Auftrag ohne Reparatur, nachdem die Werkstatt schon
# einen Termin gesetzt und Teile aus dem Lager entnommen hat“): Dialog „Ohne Reparatur beenden“ nennt den entfallenden Termin und die
# weiter gebuchten Lagerteile; danach zeigt der Verlauf beides. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
today = datetime.date.today(); D = lambda k: (today + datetime.timedelta(days=k)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ot.inhaber', 'display_name': 'OT Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    un = 'ot.inhaber'
    if api('POST', '/api/login', {'username': un, 'password': PW})['s'] != 200:
        un = None
        for x in ['or.inhaber', 'tf.inhaber', 'pf.inhaber', 'vf.inhaber', 'dw.inhaber', 'ub.inhaber', 'as.inhaber', 'ma.inhaber', 'vt.inhaber', 'ka.inhaber', 'ab.inhaber', 'ws.inhaber', 'ft.inhaber', 'fa.inhaber', 'az.inhaber']:
            if api('POST', '/api/login', {'username': x, 'password': PW})['s'] == 200: un = x; break
    check(un is not None, 'Anmeldung Inhaber')
    me = api('GET', '/api/me')['d']; envn = (me.get('user') or me).get('environment') or 'production'
    R = os.getpid() % 100000; n = 0
    for lang in ['de', 'uk', 'en']:
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            n += 1
            uw = api('POST', '/api/users', {'username': f'ot.w{R}.{n}', 'display_name': f'OT Mechaniker {n}', 'role': 'workshop', 'workshop_site': 'DORTMUND', 'environment': envn, 'language': lang})
            wctx = br.new_context(); qw = wctx.new_page(); qw.goto(B)
            qw.evaluate(JS, ['POST', '/api/invite/accept', {'token': uw['d']['invite_token'], 'password': PW}]); qw.evaluate(JS, ['POST', '/api/login', {'username': f'ot.w{R}.{n}', 'password': PW}])
            wapi = lambda m, pa, b=None: qw.evaluate(JS, [m, pa, b])
            st = wapi('POST', '/api/stock', {'name': f'Rückleuchte OT {R}-{n}', 'part_number': f'OT-{R}-{n}', 'unit_price_net': '40', 'initial_qty': 3})
            check(st['s'] == 201, f'{lang}/{w}: Lagerartikel')
            vin = f'WTE{R:05d}{n:04d}0000000'[:17]; VID = 'VIN:' + vin
            check(api('POST', '/api/vehicles', {'plate': f'OT-A {R % 900}{n}', 'vin': vin, 'kind': 'lkw', 'site': 'Dortmund'})['s'] == 201, f'{lang}/{w}: Lkw')
            cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Rückleuchte defekt {n} (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'ot-{R}-{n}'})['d']['id']
            def cmd(f, action, payload={}, note=None):
                v = f('GET', f'/api/cases/{cid}', None)['d']['case']['version']
                return f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'ot-{R}-{n}-{action}', 'expected_version': v, 'note': note, 'payload': payload})['s']
            check(cmd(api, 'approve_repair', {'workshop_site': 'DORTMUND', 'planned_date': D(2)}, 'Leuchte') == 200 and cmd(wapi, 'start_repair') == 200
                  and cmd(wapi, 'add_part', {'stock_item_id': st['d']['id'], 'quantity': 1}) == 200, f'{lang}/{w}: Termin + Lagerteil')
            wctx.close()
            api('PATCH', '/api/me', {'language': lang})
            ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}])
            T = q.evaluate("async (l) => { const m = await import('/i18n.js'); const s = m.STRINGS[l]; return { p: s.withdraw_plan.split('{d}')[0].trim(), s: s.withdraw_stock.split('{n}')[0].trim(), e: s.ev_wd_plan.split('{d}')[0].trim() }; }", lang)
            q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=withdraw_order]', timeout=20000)
            q.click('[data-act=withdraw_order]'); q.wait_for_selector('#wdhint')
            check(q.locator('#wdplan').is_visible() and T['p'] in q.inner_text('#wdplan'), f'{lang}/{w}: Dialog nennt entfallenden Termin')
            check(q.locator('#wdstock').is_visible() and q.inner_text('#wdstock').strip().endswith('1'), f'{lang}/{w}: Dialog nennt Lagerteile (1)')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: ohne Querscrollen')
            if SHOTS: q.locator('#actform').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ohne-rep-termin-{lang}-{w}.png')
            q.fill('#af [name=note]', 'Fahrzeug wird verkauft'); q.click('#af button.btn')
            q.wait_for_function(f"async () => (await (await fetch('/api/cases/{cid}')).json()).case.status === 'abgelehnt'", timeout=15000)
            q.wait_for_selector('[data-ev-wd]', timeout=15000)
            tl = q.locator('[data-ev-wd]')
            check(tl.count() == 2 and T['e'] in tl.nth(0).inner_text() and T['s'] in tl.nth(1).inner_text(), f'{lang}/{w}: Verlauf nennt Termin und Lagerteile')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: Verlauf ohne Querscrollen')
            if SHOTS: tl.nth(0).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ohne-rep-termin-verlauf-{lang}-{w}.png')
            check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
            ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
