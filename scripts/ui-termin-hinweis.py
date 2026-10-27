# [CLAUDE] UI-Test (27.10.2026, Backlog 438, Blickwinkel „Lkw für einen halben Tag zur Achsvermessung/zum Bremsprüfstand bei einer
# Fremdfirma“): Leitung setzt im Vorgang „Termin“ mit „Hinweis zum Termin“ (Formular in der Oberfläche); Vorgang zeigt den Hinweis
# beim Werkstatttermin, Verlauf „Hinweis zum Termin: – → …“; Werkstattplan zeigt ihn in der Zeile; Disposition sieht ihn unter
# „Geplante Termine (7 Tage)“ und unter „Nicht einplanen“; Fahrer des Lkw sieht ihn in „Mein Fahrzeug“. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
NOTE = {'de': 'nur vormittags, Abholung 13 Uhr – Achsvermessung Fa. Prüfstand', 'uk': 'лише до обіду, забрати о 13:00 – розвал-сходження', 'en': 'mornings only, pick-up 1 pm – wheel alignment'}
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'th.inhaber', 'display_name': 'TH Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber', 'hm.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    def mk_user(role, extra={}):
        un = f'th.{role}.{tag}'
        u = api('POST', '/api/users', {'username': un, 'display_name': 'TH ' + role, 'role': role, 'environment': envname, **extra})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        return un
    dispo = mk_user('dispatch'); wsu = mk_user('workshop', {'workshop_site': 'DORTMUND'})
    wc = br.new_context(); wp = wc.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}])
    day = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=2)).isoformat()
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = 'WDB9634031B' + str(uuid.uuid4().int)[:6]; plate = f'TH-A {str(uuid.uuid4().int)[:3]}'
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] in (200, 201), f'{lang}: Fahrzeug')
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Reifen vorne innen einseitig abgefahren, Lkw zieht leicht nach rechts', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': {'workshop_site': 'DORTMUND'}, 'note': 'Achsvermessung bei Fremdfirma'})['s'] == 200, f'{lang}: freigegeben')
        check(wp.evaluate(JS, ['POST', f'/api/cases/{cid}/commands', {'action': 'acknowledge', 'command_id': str(uuid.uuid4()), 'expected_version': ver()}])['s'] == 200, f'{lang}: Werkstatt übernimmt')
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('button[data-act="set_planned_date"]', timeout=15000)
        T = q.evaluate(TR)
        q.locator('button[data-act="set_planned_date"]').click(); q.wait_for_selector('#af input[name=planned_note]', timeout=5000)
        check(T['plan_note_hint'] in q.inner_text('#af'), f'{lang}: Hinweistext im Formular')
        q.fill('#af input[name=planned_date]', day); q.fill('#af input[name=planned_note]', NOTE[lang])
        check(q.evaluate(noscroll), f'{lang}: Formular ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-hinweis-form-{lang}-{w}.png')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('dd [data-plannote]', timeout=10000)
        check(NOTE[lang] in q.inner_text('dd [data-plannote]'), f'{lang}: Vorgang zeigt den Hinweis')
        q.wait_for_selector('[data-ev-plannote]', timeout=5000)
        check(NOTE[lang] in q.inner_text('[data-ev-plannote]') and T['ev_plan_note'] in q.inner_text('[data-ev-plannote]'), f'{lang}: Verlauf nennt den Hinweis')
        check(api('GET', f'/api/cases/{cid}')['d']['case']['planned_note'] == NOTE[lang], f'{lang}: gespeichert')
        check(q.evaluate(noscroll), f'{lang}: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('dd [data-plannote]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-hinweis-vorgang-{lang}-{w}.png')
        q.goto(B + '/#/plan'); q.wait_for_selector(f'a.row[href="#/cases/{cid}"]', timeout=15000)
        rt = q.locator(f'a.row[href="#/cases/{cid}"]').first.inner_text()
        check(NOTE[lang][:40] in rt, f'{lang}: Werkstattplan zeigt den Hinweis ({rt[-90:]!r})')
        check(q.evaluate(noscroll), f'{lang}: Plan ohne Querscrollen')
        if SHOTS: q.locator(f'a.row[href="#/cases/{cid}"]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-hinweis-plan-{lang}-{w}.png')
        check(not errs, f'{lang}: keine Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
        # Disposition: Startseite „Geplante Termine (7 Tage)“ und „Nicht einplanen“
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': dispo, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector('[data-plannote]', timeout=15000); q.wait_for_timeout(300)
        rows = [x for x in q.locator(f'a.row[href="#/cases/{cid}"]').all_inner_texts()]
        check(len(rows) >= 2 and all(NOTE[lang][:30] in x for x in rows[:2]), f'{lang}: Disposition sieht den Hinweis in beiden Listen ({len(rows)})')
        check(q.evaluate(noscroll), f'{lang}: Dispo ohne Querscrollen')
        if SHOTS: q.locator(f'a.row[href="#/cases/{cid}"]').last.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-hinweis-dispo-{lang}-{w}.png')
        check(not errs, f'{lang}: keine Skriptfehler (Disposition) {errs[:1]}'); ctx.close()
        # Fahrer des Lkw: „Mein Fahrzeug“ nennt den Hinweis beim Werkstatttermin (er bringt den Lkw oft selbst hin)
        du = f'th.fahrer.{tag}{i}'
        r = api('POST', '/api/users', {'username': du, 'display_name': 'TH Fahrer', 'role': 'driver', 'environment': envname})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
        check(api('POST', f'/api/vehicles/VIN:{vin}/drivers', {'user_id': r['d'].get('id') or r['d'].get('user', {}).get('id'), 'end_previous': False})['s'] == 201, f'{lang}: Fahrer zugeordnet')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': du, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector('dd [data-plannote]', timeout=15000)
        check(NOTE[lang] in q.inner_text('dd [data-plannote]'), f'{lang}: Fahrer sieht den Hinweis in „Mein Fahrzeug“')
        check(q.evaluate(noscroll), f'{lang}: Fahrer ohne Querscrollen')
        if SHOTS: q.locator('dd [data-plannote]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/termin-hinweis-fahrer-{lang}-{w}.png')
        check(not errs, f'{lang}: keine Skriptfehler (Fahrer) {errs[:1]}'); ctx.close()
        # aufräumen: Termin entfernen (Hinweis geht mit), damit andere Skripte unverändert bleiben
        api('POST', f'/api/cases/{cid}/commands', {'action': 'set_planned_date', 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': {'planned_date': None}})
        check(api('GET', f'/api/cases/{cid}')['d']['case']['planned_note'] is None, f'{lang}: Hinweis mit dem Termin entfernt')
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
