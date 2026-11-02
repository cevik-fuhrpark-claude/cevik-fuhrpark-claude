# [CLAUDE] UI-Test (02.11.2026, Backlog 868, Blickwinkel „Werkstatt-Tablet: Mechaniker wird mitten in der Reparatur zu einem Notfall gerufen“):
# Leerlauf-Abmeldung (Werkstatt 5 Min., simulierte Uhr) mit halb ausgefülltem Formular „Arbeitszeit erfassen“ bzw. Kontrolle nach Reparatur:
#  - Abmeldehinweis nennt die gesicherten Eingaben; dieselbe Person meldet sich an → zurück im Vorgang, Eingaben wieder im Formular
#  - eine andere Person meldet sich im selben Tab an → Startseite, Entwürfe der vorherigen Person gelöscht
# Je Breite 390/820/1366 px, Sprachen DE/UK/EN wechselnd. Voraussetzung: frischer Entwicklungsserver. Nur synthetische Testkonten.
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); adm = br.new_page(); adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'le.inhaber', 'display_name': 'LE Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': 'le.inhaber', 'password': PW})
    envn = api('GET', '/api/me')['d']['user'].get('environment') or 'production'
    check(api('PUT', '/api/settings', {'idle_logout_workshop_min': 5})['s'] == 200, 'Einstellung 5 Min. (Werkstatt)')
    def mkuser(un, lang):
        u = api('POST', '/api/users', {'username': un, 'display_name': un.upper(), 'role': 'workshop', 'workshop_site': 'DORTMUND', 'environment': envn, 'language': lang})
        c = br.new_context(); q = c.new_page(); q.goto(B); q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    n = 0
    def cmd(cid, action, payload=None, note=None):
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        b = {'action': action, 'command_id': f'le-{action}-{cid[-8:]}-{v}', 'expected_version': v, 'payload': payload or {}}
        if note: b['note'] = note
        return api('POST', f'/api/cases/{cid}/commands', b)['s']
    def newcase():
        global n
        n += 1; pl = f'LE-A {100 + n}'; vin = f'WLE{n:05d}0000000000'[:17]
        check(api('POST', '/api/vehicles', {'plate': pl, 'vin': vin, 'kind': 'lkw', 'site': 'Dortmund'})['s'] == 201, f'Lkw {pl}')
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Bremse hinten links (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'le-{n}'})['d']['id']
        check(cmd(cid, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Bremse prüfen') == 200 and cmd(cid, 'start_repair') == 200, 'freigegeben + begonnen')
        return cid
    def login(pg, un):
        pg.wait_for_selector('#u'); pg.fill('#u', un); pg.fill('#p', PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    for (w, h), lang in zip([(390, 844), (820, 1180), (1366, 900)], ['de', 'uk', 'en']):
        print(f'— {w} px / {lang}')
        a, b = f'le.a{w}', f'le.b{w}'; mkuser(a, lang); mkuser(b, lang)
        cid = newcase()
        ctx = br.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e) + ((' @ ' + (e.stack or '').split(chr(10))[1].strip()) if os.environ.get('CFP_STACK') and e.stack else ''))); pg.clock.install(); pg.goto(B)
        T = pg.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { kept: S.idle_signed_out_kept, resumed: S.idle_resumed }; }", lang)
        pg.evaluate(JS, ['POST', '/api/login', {'username': a, 'password': PW}])
        pg.goto(B + f'/#/cases/{cid}'); pg.wait_for_selector('button[data-act=record_work]', timeout=15000)
        pg.click('button[data-act=record_work]'); pg.wait_for_selector('#af input[name=hours]')
        pg.fill('#af input[name=hours]', '2,5'); pg.fill('#af input[name=description]', 'Bremssattel zerlegt')
        pg.clock.run_for(6 * 60000); pg.wait_for_timeout(1000)
        check(pg.evaluate('location.hash') == '#/login', 'Leerlauf → Anmeldeseite')
        check(T['kept'] in pg.inner_text('body'), 'Hinweis „Eingaben gesichert“')
        check(pg.evaluate(JS, ['GET', '/api/me'])['s'] == 401, 'Server-Sitzung beendet')
        if SHOTS: pg.screenshot(path=f'{SHOTS}/leerlauf-abgemeldet-{lang}-{w}.png')
        login(pg, a)
        pg.wait_for_selector('#af input[name=hours]', timeout=15000); pg.wait_for_timeout(500)
        check(pg.evaluate('location.hash') == f'#/cases/{cid}', 'dieselbe Person: zurück im Vorgang')
        check(pg.input_value('#af input[name=hours]') == '2,5' and pg.input_value('#af input[name=description]') == 'Bremssattel zerlegt', 'Eingaben wiederhergestellt')
        check(T['resumed'] in pg.inner_text('body'), 'Hinweis „wiederhergestellt“')
        check(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'ohne Querscrollen')
        if SHOTS: pg.screenshot(path=f'{SHOTS}/leerlauf-zurueck-{lang}-{w}.png')
        # Kontrolle nach Reparatur halb ausgefüllt, dann meldet sich eine andere Person an
        pg.evaluate(f"location.hash='#/inspect/{cid}'"); pg.wait_for_selector('form input[type=radio]', timeout=15000)
        pg.locator('form input[type=radio][value=ok]').first.check(force=True); pg.wait_for_timeout(300)
        check(pg.evaluate(f"Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_insp_'))"), 'Entwurf der Kontrolle angelegt')
        pg.clock.run_for(6 * 60000); pg.wait_for_timeout(1000)
        check(pg.evaluate('location.hash') == '#/login', 'Leerlauf → Anmeldeseite (Kontrolle)')
        login(pg, b); pg.wait_for_timeout(800)
        check(pg.evaluate('location.hash') in ('#/', ''), 'andere Person: Startseite, nicht der Vorgang der vorherigen')
        check(pg.evaluate("Object.keys(sessionStorage).filter(k => k.startsWith('cfp_fd_') || k === 'cfp_idle_resume').length") == 0, 'Entwürfe der vorherigen Person gelöscht')
        check(not errs, f'keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
