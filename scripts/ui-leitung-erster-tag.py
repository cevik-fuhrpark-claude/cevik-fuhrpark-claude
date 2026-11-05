# [CLAUDE] UI-Test (05.11.2026, Backlog 1016) – Blickwinkel „Neue Fuhrparkleitung übernimmt am ersten Tag“:
# 1. Ohne Fahrzeuge: Startseite und Fahrzeugliste nennen für die Fuhrparkleitung den Inhaber als Weg zum Stammdatenimport.
# 2. „Heute zu tun“: Überschrift der Behördenfristen nennt die Vorwarnung aus den Einstellungen (14 statt fest 7).
# 3. Zähler „Kritisch“ der Startseite → Vorgangsliste zeigt alle Werkstätten, auch wenn vorher eine Werkstatt gewählt war.
# DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OWNER = {'de': 'Inhaber', 'uk': 'власник', 'en': 'owner'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'le.inhaber', 'display_name': 'LE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'le.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    pid = os.getpid(); un = f'le.fleet{pid}'
    u = api('POST', '/api/users', {'username': un, 'display_name': 'LE Leitung', 'role': 'fleet', 'environment': env})
    c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    nveh = len(api('GET', '/api/vehicles')['d'].get('vehicles', []))
    def login(lang, w):
        ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        return ctx, q, errs
    # 1. ohne Fahrzeuge (nur prüfbar auf frischem Server)
    if nveh == 0:
        for lang, w in [('de', 390), ('uk', 820), ('en', 1366)]:
            ctx, q, errs = login(lang, w)
            q.goto(B + '/#/'); q.reload(); q.wait_for_selector('[data-novehicles]', timeout=15000)
            check(OWNER[lang] in q.locator('[data-novehicles]').first.inner_text(), f'{lang} Startseite ohne Fahrzeuge nennt den Inhaber')
            q.goto(B + '/#/vehicles'); q.wait_for_selector('[data-novehicles], [data-vlempty]', timeout=15000)
            check(OWNER[lang] in q.locator('[data-novehicles], [data-vlempty]').first.inner_text(), f'{lang} Fahrzeugliste ohne Fahrzeuge nennt den Inhaber')
            check(not errs, f'{lang} keine Skriptfehler {errs[:1]}'); ctx.close()
    else:
        print('  (Server hat schon Fahrzeuge – Teil 1 übersprungen)')
    # Daten: zwei Fahrzeuge, kritische Vorgänge in zwei Werkstätten, Bußgeld mit Frist in 12 Tagen, Vorwarnung 14
    wss = [w['code'] for w in api('GET', '/api/meta')['d']['workshops']]
    check(len(wss) >= 2, f'mindestens zwei Werkstätten ({wss})')
    vins = [f'WDB9634031{pid % 1000000:06d}{i}' for i in range(2)]
    for i, vin in enumerate(vins): api('POST', '/api/vehicles', {'plate': f'LE-T {pid % 9000 + i}', 'vin': vin, 'site': 'Dortmund'})
    for i, vin in enumerate(vins):
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'LE kritisch {i}', 'priority': 'kritisch', 'driveability': 'fahrbereit', 'workshop_site': wss[i % 2], 'request_key': f'le-{pid}-{i}'})
        check(r['s'] == 201, f'Vorgang {i} angelegt ({r["s"]})')
    check(api('PUT', '/api/settings', {'fine_warn_days': '14'})['s'] == 200, 'Bußgeld-Vorwarnung 14 Tage')
    due = (datetime.date.today() + datetime.timedelta(days=12)).isoformat()
    r = api('POST', '/api/fines', {'kind': 'anhoerung', 'authority': 'Stadt Dortmund', 'reference': f'LE-{pid}', 'offense_type': 'geschwindigkeit', 'offense_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'location': 'B1', 'plate_in_letter': f'LE-T {pid % 9000}', 'response_due': due})
    check(r['s'] == 201, f'Bußgeld angelegt ({r["s"]})')
    for lang, w in [('de', 390), ('uk', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx, q, errs = login(lang, w)
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector('.stats', timeout=15000); q.wait_for_timeout(800)
        sums = [x.inner_text() for x in q.locator('details.panel summary').all()]
        fin = [x for x in sums if '14' in x and ('Behörden' in x or 'органів' in x or 'Authority' in x)]
        check(len(fin) == 1 and ' 7 ' not in fin[0], f'{lang} Überschrift Behördenfristen mit 14: {fin}')
        crit = int(q.locator('#stcrit b').inner_text().strip())
        # Werkstatt in der Liste wählen, dann über den Zähler springen
        q.goto(B + '/#/cases'); q.wait_for_selector('#cws', timeout=15000); q.select_option('#cws', wss[0]); q.wait_for_timeout(800)
        q.goto(B + '/#/'); q.wait_for_selector('#stcrit', timeout=15000); q.click('#stcrit'); q.wait_for_timeout(1200)
        rows = q.locator('#cl a.row, .list a.row').count() if q.locator('#cl').count() else q.locator('.list a.row').count()
        check(q.locator('#cws').input_value() == '', f'{lang} Werkstatt-Auswahl nach dem Sprung „alle“')
        check(rows == crit and crit >= 2, f'{lang} Liste {rows} = Zähler Kritisch {crit}')
        if SHOTS: os.makedirs(SHOTS, exist_ok=True); q.screenshot(path=f'{SHOTS}/leitung-{lang}-{w}.png', full_page=False)
        check(not errs, f'{lang} keine Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
