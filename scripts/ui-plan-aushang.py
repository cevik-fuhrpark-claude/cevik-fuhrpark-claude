# [CLAUDE] UI-Test (06.11.2026, Backlog 1093/1094, Blickwinkel „Werkstatt druckt den Wochenplan fürs Schwarze Brett“): Auftragszeilen im
# Werkstattplan nennen Dringlichkeit, „Gesperrt“ und die Fahrbereitschaft laut Meldung (nicht/eingeschränkt fahrbereit, abgeschleppt) als Text –
# auf dem Bildschirm und in der Druckansicht (Schwarz-Weiß ohne Farben). Handy 390, Tablet 820, PC 1366 je DE/UK/EN; kein Querscrollen, keine Skriptfehler.
import os, datetime, uuid, re
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pa.inhaber', 'display_name': 'PA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'pa.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    me = api('GET', '/api/me')['d']; env = me['active_environment']; pid = os.getpid()
    WS = f'pa.ws{pid}'
    wu = api('POST', '/api/users', {'username': WS, 'display_name': 'PA Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    wctx = br.new_context(); wp = wctx.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/invite/accept', {'token': wu['d']['invite_token'], 'password': PW}])
    today = datetime.date.today()
    STR = a.evaluate("async () => { const m = await import('/i18n.js'); const o = {}; for (const l of ['de','uk','en']) o[l] = Object.fromEntries(['prio_kritisch','prio_mittel','prio_niedrig','locked','cl_not_drivable','dispo_upcoming_limited','vl_towed_chip'].map((k) => [k, m.STRINGS[l][k]])); return o; }")
    spec = [('kritisch', 'fahrbereit', None), ('mittel', 'nicht_fahrbereit', None), ('niedrig', 'eingeschraenkt', None), ('mittel', 'nicht_fahrbereit', 'tow')]
    ids = []
    for k, (prio, drv, tow) in enumerate(spec):
        vin = f'WDB9634031A{pid % 10000:04d}{k:02d}'[:17].ljust(17, '0'); VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'PA-WP {pid % 1000}{k}', 'site': 'Dortmund'})['s'] == 201, f'Fahrzeug {k}')
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Aushang-Test {k}', 'priority': prio, 'driveability': drv, 'workshop_site': 'DORTMUND', 'request_key': str(uuid.uuid4())})['d']['id']
        def cmd(cl, action, payload=None, note=None):
            v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
            r = cl(JS, ['POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': v, 'payload': payload or {}, **({'note': note} if note else {})}])
            check(r['s'] == 200, f'{k}: {action} {r["s"]}')
        cmd(a.evaluate, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'frei'); cmd(wp.evaluate, 'acknowledge')
        cmd(wp.evaluate, 'set_planned_date', {'planned_date': (today + datetime.timedelta(days=k + 1)).isoformat()})
        if tow: cmd(a.evaluate, 'set_vehicle_location', {'vehicle_location': 'Hof Abschlepp Test', 'tow_service': 'Abschlepp Test GmbH', 'towed_on': today.isoformat()})
        ids.append(cid)
    locked = api('GET', f'/api/cases/{ids[0]}')['d']['case']['safety_lock']
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900), ('de', 1366, 900), ('uk', 390, 844), ('en', 820, 1180)]:
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': WS, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/plan'); q.reload(); q.wait_for_selector(f'a.row[href="#/cases/{ids[3]}"]', timeout=15000)
        T = STR[lang]; txt = lambda i: q.locator(f'a.row[href="#/cases/{ids[i]}"]').first.inner_text()
        check(T['prio_kritisch'] in txt(0) and (not locked or T['locked'] in txt(0)), f'{lang} {w}: kritisch{" + Gesperrt" if locked else ""} als Text')
        check(T['prio_mittel'] in txt(1) and T['cl_not_drivable'] in txt(1), f'{lang} {w}: nicht fahrbereit')
        check(T['prio_niedrig'] in txt(2) and T['dispo_upcoming_limited'] in txt(2), f'{lang} {w}: eingeschränkt fahrbereit')
        check(T['vl_towed_chip'] in txt(3) and T['cl_not_drivable'] not in txt(3), f'{lang} {w}: abgeschleppt')
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang} {w}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/plan-aushang-{lang}-{w}.png', full_page=False)
        q.emulate_media(media='print')
        check(q.locator(f'a.row[href="#/cases/{ids[1]}"] [data-pdrv]').first.is_visible(), f'{lang} {w}: Fahrbereitschaft im Druck sichtbar')
        check(q.locator(f'a.row[href="#/cases/{ids[0]}"] [data-pprio]').first.is_visible(), f'{lang} {w}: Dringlichkeit im Druck sichtbar')
        if SHOTS and w == 1366: q.screenshot(path=f'{SHOTS}/plan-aushang-druck-{lang}.png', full_page=True)
        check(not errs, f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
