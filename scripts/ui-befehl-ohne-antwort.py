# [CLAUDE] UI-Test (31.10.2026, Backlog 799, Blickwinkel „Werkstatt-Tablet im Funkloch der Halle“): Befehl am Vorgang ohne Antwort.
# Die Anfrage erreicht den Server (Arbeitszeit wird gebucht), die Antwort bleibt im Funkloch aus – ohne Fehler, ohne Abbruch. Vorher blieb
# der Knopf ohne Ende gesperrt. Jetzt nach dem Zeitlimit (60 s, im Test 2 s über den setTimeout-Rückfall) „nicht gespeichert“, das Formular
# bleibt offen; erneutes Speichern mit derselben command_id → „duplicate“, genau EIN Eintrag. Tablet 820 px (DE), Handy 390 px (UK),
# PC 1366 px (EN). Gegen den alten Stand rot (Knopf hängt). Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OLD = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms === 60000 ? 2000 : ms, ...a); })();"""
KEPT = {'de': 'Nicht gespeichert', 'uk': 'Не збережено', 'en': 'Not saved'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'oa.inhaber', 'display_name': 'OA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'oa.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    vin = 'WDB96340310799001'; VID = 'VIN:' + vin; pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'OA-WS 1', 'vin': vin, 'site': 'Dortmund'})
    u = api('POST', '/api/users', {'username': 'oa.ws', 'display_name': 'OA Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Bremse quietscht {lang}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'oa-{pid}-{lang}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'oaa-{pid}-{lang}', 'expected_version': v, 'note': 'prüfen', 'payload': {'workshop_site': site}})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}, service_workers='block'); ctx.add_init_script(OLD)
        q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'oa.ws', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=record_work]', timeout=15000)
        q.click('[data-act=record_work]'); q.wait_for_selector('#af')
        q.fill('#af [name=hours]', '1,5'); q.fill('#af [name=description]', 'Bremsbeläge gewechselt')
        held = []
        def h(route):
            if not held: held.append((route, route.fetch())); return  # Server bucht, Antwort bleibt aus (Anfrage hängt)
            route.continue_()
        q.route('**/commands', h)
        q.click('#af button.btn:not([data-wdprevgo])')
        tt = ''
        for _ in range(24):
            q.wait_for_timeout(250)
            tt = q.evaluate("[...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | ')")
            if KEPT[lang] in tt: break
        check(KEPT[lang] in tt, f'{lang}/{w}: nach dem Zeitlimit „nicht gespeichert“ ({tt[:80]!r})')
        check(bool(held) and held[0][1].status == 200, f'{lang}/{w}: erste Anfrage kam am Server an')
        check(q.locator('#af').count() == 1 and q.input_value('#af [name=hours]') in ('1,5', '1.5'), f'{lang}/{w}: Formular mit Eingaben bleibt offen')
        btn_ok = q.evaluate("(() => { const b = document.querySelector('#af button.btn:not([data-wdprevgo])'); return !!b && !b.disabled; })()")
        check(btn_ok, f'{lang}/{w}: Knopf wieder bedienbar')
        if SHOTS: q.screenshot(path=f'{SHOTS}/befehl_ohne_antwort_{lang}_{w}.png')
        q.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")
        q.click('#af button.btn:not([data-wdprevgo])'); q.wait_for_timeout(1500)
        n = len(api('GET', f'/api/cases/{cid}')['d']['work'])
        check(n == 1, f'{lang}/{w}: erneutes Speichern bucht nicht doppelt ({n} Einträge)')
        check(q.locator('#af').count() == 0, f'{lang}/{w}: Formular nach Erfolg geschlossen')
        for r, resp in held:  # verspätete Antwort freigeben (die App hat die Anfrage längst abgebrochen)
            try: r.fulfill(response=resp)
            except Exception: pass
        q.unroute('**/commands')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang}/{w}: kein Querscrollen')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
