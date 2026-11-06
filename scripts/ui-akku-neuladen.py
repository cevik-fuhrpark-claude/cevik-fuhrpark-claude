# [CLAUDE] UI-Test (06.11.2026, Backlog 1066, Blickwinkel „Werkstatt-Tablet: Akku leer bzw. Seite lädt neu mitten in der Eingabe“):
#  A) „Arbeitszeit erfassen“ halb ausgefüllt, Seite wird verlassen (pagehide) und neu geladen → Formular mit Eingaben und Hinweis „wiederhergestellt“
#  B) Seite verlassen und ohne Neuladen zurück (visibilitychange) → kein Entwurf bleibt; anderer Vorgang und zurück → Formular zu (Backlog 88)
#  C) Kontrolle nach Reparatur halb ausgefüllt, Anmeldung am Server beendet, Neuladen → Anmeldeseite mit Hinweis „Eingaben gesichert“,
#     dieselbe Person meldet sich an → zurück auf der Kontrolle mit Eingaben
#  D) Aktionsformular, Anmeldung beendet, „Speichern“ → 401 → dieselbe Person → Eingaben wieder da; andere Person → nichts
# Je Breite 390/820/1366 px, Sprachen DE/UK/EN wechselnd. Voraussetzung: frischer Entwicklungsserver. Nur synthetische Testkonten.
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIS = "(v) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); adm = br.new_page(); adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ak.inhaber', 'display_name': 'AK Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': 'ak.inhaber', 'password': PW})
    envn = api('GET', '/api/me')['d']['user'].get('environment') or 'production'
    def mkuser(un, lang):
        u = api('POST', '/api/users', {'username': un, 'display_name': un.upper(), 'role': 'workshop', 'workshop_site': 'DORTMUND', 'environment': envn, 'language': lang})
        c = br.new_context(); q = c.new_page(); q.goto(B); q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    n = 0
    def cmd(cid, action, payload=None, note=None):
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        b = {'action': action, 'command_id': f'ak-{action}-{cid[-8:]}-{v}', 'expected_version': v, 'payload': payload or {}}
        if note: b['note'] = note
        return api('POST', f'/api/cases/{cid}/commands', b)['s']
    def newcase():
        global n
        n += 1; pl = f'AK-A {100 + n}'; vin = f'WAK{n:05d}0000000000'[:17]
        check(api('POST', '/api/vehicles', {'plate': pl, 'vin': vin, 'kind': 'lkw', 'site': 'Dortmund'})['s'] == 201, f'Lkw {pl}')
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Bremse hinten links (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'ak-{n}'})['d']['id']
        check(cmd(cid, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Bremse prüfen') == 200 and cmd(cid, 'start_repair') == 200, 'freigegeben + begonnen')
        return cid
    def login(pg, un):
        pg.wait_for_selector('#u'); pg.fill('#u', un); pg.fill('#p', PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    def open_work(pg, cid):
        pg.goto(B + f'/#/cases/{cid}'); pg.wait_for_selector('button[data-act=record_work]', timeout=15000)
        pg.click('button[data-act=record_work]'); pg.wait_for_selector('#af input[name=hours]')
        pg.fill('#af input[name=hours]', '1,5'); pg.fill('#af input[name=description]', 'Bremsscheibe gemessen')
    for (w, h), lang in zip([(390, 844), (820, 1180), (1366, 900)], ['de', 'uk', 'en']):
        print(f'— {w} px / {lang}')
        a, b = f'ak.a{w}', f'ak.b{w}'; mkuser(a, lang); mkuser(b, lang)
        cid = newcase(); cid2 = newcase()
        ctx = br.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(B)
        T = pg.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { kept: S.session_expired_kept, all: ['de', 'uk', 'en'].map((x) => m.STRINGS[x].session_expired_kept) }; }", lang)
        pg.evaluate(JS, ['POST', '/api/login', {'username': a, 'password': PW}])
        # A) Seite verlassen + Neuladen
        open_work(pg, cid)
        pg.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))")
        check(pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), 'A: Entwurf beim Verlassen gesichert')
        pg.reload(); pg.wait_for_selector('#adraft', timeout=15000)
        check(pg.input_value('#af input[name=hours]') == '1,5' and pg.input_value('#af input[name=description]') == 'Bremsscheibe gemessen', 'A: nach Neuladen Eingaben wieder da')
        check(pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'A: ohne Querscrollen')
        if SHOTS: pg.screenshot(path=f'{SHOTS}/akku-neuladen-{lang}-{w}.png')
        pg.click('#ac'); pg.wait_for_timeout(300)
        check(not pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), 'A: Abbrechen löscht den Entwurf')
        # B) verlassen und ohne Neuladen zurück
        open_work(pg, cid)
        pg.evaluate(VIS, 'hidden')
        check(pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), 'B: Entwurf bei hidden')
        pg.evaluate(VIS, 'visible')
        check(not pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), 'B: zurück ohne Neuladen → Entwurf entfernt')
        check(pg.input_value('#af input[name=hours]') == '1,5', 'B: Formular bleibt offen')
        pg.evaluate(f"location.hash='#/cases/{cid2}'"); pg.wait_for_selector('button[data-act=record_work]', timeout=15000)
        pg.evaluate(f"location.hash='#/cases/{cid}'"); pg.wait_for_selector('button[data-act=record_work]', timeout=15000); pg.wait_for_timeout(500)
        check(pg.locator('#af').count() == 0, 'B: nach Seitenwechsel Formular zu (Backlog 88)')
        # C) Kontrolle nach Reparatur, Anmeldung beendet, Neuladen
        pg.evaluate(f"location.hash='#/inspect/{cid}'"); pg.wait_for_selector('form input[type=radio]', timeout=15000)
        pg.locator('form input[type=radio][value=ok]').first.check(force=True); pg.wait_for_timeout(300)
        check(pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_insp_'))"), 'C: Entwurf der Kontrolle')
        pg.evaluate(JS, ['POST', '/api/logout', {}])
        pg.reload(); pg.wait_for_selector('#u', timeout=15000); pg.wait_for_timeout(600)
        check(any(x in pg.inner_text('body') for x in T['all']), 'C: Hinweis „Eingaben gesichert“ (Sprache der Anmeldeseite = Gerätesprache bei Werkstatt, Backlog 82)')
        if SHOTS: pg.screenshot(path=f'{SHOTS}/akku-abgelaufen-{lang}-{w}.png')
        login(pg, a); pg.wait_for_selector('form input[type=radio]', timeout=15000); pg.wait_for_timeout(500)
        check(pg.evaluate('location.hash') == f'#/inspect/{cid}', 'C: dieselbe Person zurück auf der Kontrolle')
        check(pg.locator('form input[type=radio][value=ok]').first.is_checked(), 'C: Eingabe der Kontrolle wiederhergestellt')
        # D) Aktionsformular, Anmeldung beendet, Speichern → 401 → andere Person
        open_work(pg, cid2)
        pg.evaluate(JS, ['POST', '/api/logout', {}])
        pg.click('#af button[type=submit], #af .btn:not(.secondary)'); pg.wait_for_selector('#u', timeout=15000); pg.wait_for_timeout(600)
        check(pg.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), 'D: Eingaben beim 401 gesichert')
        login(pg, b); pg.wait_for_timeout(800)
        check(pg.evaluate('location.hash') in ('#/', ''), 'D: andere Person → Startseite')
        check(pg.evaluate("Object.keys(sessionStorage).filter(k => k.startsWith('cfp_fd_') || k === 'cfp_idle_resume').length") == 0, 'D: Entwürfe der vorherigen Person gelöscht')
        check(not errs, f'keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
