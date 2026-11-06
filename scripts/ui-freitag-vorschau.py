# [CLAUDE] UI-Test (06.11.2026, Backlog 1069/1070, Blickwinkel „Fuhrparkleitung am Freitag: Wochenabschluss vor dem Wochenende“):
# „Heute zu tun“ zeigt die Wiedervorlage vom letzten Tag vor dem nächsten Werktag (freitags: Sonntag, mit Wochentag) und nur an Tagen vor
# freien Tagen den Hinweis darauf, nicht die vom nächsten Werktag; Gruppe „Fahrer: Nachweis gilt am nächsten Werktag nicht mehr“ nennt
# die Fahrerkarte mit Ablauf am Vortag des nächsten Werktags, nicht den Führerschein mit Ablauf am Werktag (Wochentage: Unit-Test 1069/1070).
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
# Die App gleicht die Geräteuhr mit der Serverzeit ab (Geräteuhr-Hinweis) – daher mit dem echten Tag rechnen: nächster Werktag (Mo–Fr;
# bundesweite Feiertage hier nicht berücksichtigt – an Tagen direkt vor einem Feiertag kann der Lauf abweichen), letzter Tag davor
today = datetime.date.today()
nwd = today + datetime.timedelta(days=1)
while nwd.weekday() >= 5: nwd += datetime.timedelta(days=1)
last = nwd - datetime.timedelta(days=1); free = last > today
iso = lambda d: d.isoformat()
U = 'fv.inhaber.' + uuid.uuid4().hex[:6]
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': U, 'display_name': 'FV Inhaber'})
    if s['s'] == 200:
        api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW}); user = U
    else:
        r = api('POST', '/api/users', {'username': U, 'display_name': 'FV Leitung', 'role': 'fleet', 'environment': 'production'})
        check(False, f'frischer Dev-Server nötig ({s["s"]}/{r["s"]})'); raise SystemExit(1)
    check(api('POST', '/api/login', {'username': user, 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    v1 = api('POST', '/api/vehicles', {'plate': 'FV-UI 81', 'vin': 'WDB96340310888881', 'site': 'Dortmund'})['d']['id']
    def case(desc, key, on, note):
        cs = api('POST', '/api/cases', {'vehicle_id': v1, 'description': desc, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': key})['d']
        cid = cs['case']['id'] if 'case' in cs else cs['id']
        ver = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        r = api('POST', f'/api/cases/{cid}/commands', {'action': 'set_followup', 'command_id': key + '-c', 'expected_version': ver, 'payload': {'followup_on': iso(on)}, 'note': note})
        check(r['s'] == 200, f'Wiedervorlage {iso(on)} gesetzt ({r["s"]})')
    case('Spiegel locker', 'fv-1', last, 'Werkstatt anrufen')
    case('Trittstufe lose', 'fv-2', nwd, 'Werktag nachfragen')
    d = api('POST', '/api/drivers', {'display_name': 'Freitag Fahrer'})['d']['id']
    check(api('POST', f'/api/drivers/{d}/documents', {'kind': 'fahrerkarte', 'valid_until': iso(last), 'evidence': 'Fahrerkarte Kopie'})['s'] == 201, 'Fahrerkarte bis zum Tag vor dem nächsten Werktag')
    check(api('POST', f'/api/drivers/{d}/documents', {'kind': 'fuehrerschein', 'license_classes': 'CE', 'valid_until': iso(nwd), 'evidence': 'Führerschein gesehen'})['s'] == 201, 'Führerschein bis zum nächsten Werktag')
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}])
        q.goto(B + '/#/'); q.reload()
        tag = f'{lang}/{w} {today.strftime("%a")}'
        q.wait_for_selector('#app details', timeout=15000); q.wait_for_timeout(1500)
        txt = q.evaluate("() => document.querySelector('#app').textContent")
        fu1 = 'Werkstatt anrufen' in txt; fu2 = 'Werktag nachfragen' in txt; hint = q.locator('[data-todofree]').count()
        check(fu1 and not fu2, f'{tag}: Wiedervorlage bis zum Vortag des nächsten Werktags, nicht die des Werktags ({fu1}/{fu2})')
        check(hint == (1 if free else 0), f'{tag}: Hinweis freie Tage {hint} (erwartet {1 if free else 0})')
        rows = q.evaluate("() => [...document.querySelectorAll('#app details .row')].map((r) => r.textContent).filter((x) => x.includes('Freitag Fahrer'))")
        lic = {'de': 'Führerschein', 'uk': 'Посвідчення водія', 'en': 'Driving licence'}[lang]
        check(len(rows) == 1 and ', ' not in rows[0] and lic not in rows[0], f'{tag}: Fahrergruppe nennt nur den Nachweis, der am nächsten Werktag nicht mehr gilt ({rows[:1]})')
        if SHOTS:
            q.evaluate("() => document.querySelectorAll('#app details').forEach((d) => { if (d.textContent.includes('Freitag Fahrer') || d.querySelector('[data-todofree]')) d.open = true; })")
            q.evaluate("() => { const x = [...document.querySelectorAll('#app details')].find((d) => d.textContent.includes('Freitag Fahrer')); if (x) x.scrollIntoView({ block: 'start' }); }")
            q.screenshot(path=f'{SHOTS}/freitag_vorschau_{lang}_{w}.png', full_page=False)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{tag}: kein Querscrollen')
        check(not errs, f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
