# [CLAUDE] UI-Test geteiltes Tablet: Leerlauf-Abmeldung in der App (simulierte Uhr) und Verwerfen des Ansichtszustands.
# Ablauf je Breite (390/820/1366 px): Werkstatt-Konto mit Einstellung „Abmelden nach Leerlauf – Werkstatt“ = 5 Min.
#  - Bedienung nach 3 Min. → App hält die Sitzung per GET /api/me wach
#  - 60 s vor Ablauf Vorwarnleiste, „Angemeldet bleiben“ verlängert
#  - ohne Bedienung → Anmeldeseite, Server-Sitzung beendet, Leiste weg
#  - Suche/Sortierung der vorherigen Person sind nach Abmelden + Anmelden einer anderen Person im selben Tab leer
# Voraussetzung: frischer lokaler Entwicklungsserver (sh scripts/restart-dev.sh). Nur synthetische Testkonten.
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []


def check(cond, msg):
    print(('  ✔ ' if cond else '  ✘ ') + msg)
    if not cond:
        fails.append(msg)


with sync_playwright() as p:
    br = p.chromium.launch()
    adm = br.new_page()
    adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'll.inhaber', 'display_name': 'Leerlauf Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    ws = api('GET', '/api/meta')['d']['workshops'][0]['code']
    check(api('PUT', '/api/settings', {'idle_logout_workshop_min': 5})['s'] == 200, 'Einstellung 5 Min. (Werkstatt)')
    for role, extra in [('workshop', {'workshop_site': ws}), ('fleet', {})]:
        u = api('POST', '/api/users', {'username': f'll.{role}', 'display_name': f'Leerlauf {role}', 'role': role, 'environment': 'production', **extra})
        c = br.new_context(); q = c.new_page(); q.goto(B)
        q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()

    for w, h in [(390, 844), (820, 1180), (1366, 900)]:
        print(f'— {w} px')
        ctx = br.new_context(viewport={'width': w, 'height': h})
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.install()
        pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/login', {'username': 'll.workshop', 'password': PW}])
        pg.goto(B + '/#/cases')
        pg.wait_for_selector('#cq')
        pings = []
        pg.on('request', lambda r: pings.append(r.url) if r.url.endswith('/api/me') else None)
        pg.clock.run_for(3 * 60000)
        pg.keyboard.press('Shift')
        pg.wait_for_timeout(300)
        check(len(pings) == 1, 'Bedienung ohne Serveraufruf hält die Sitzung wach (1× GET /api/me)')
        pg.clock.run_for(int(4.5 * 60000))
        pg.wait_for_timeout(300)
        bar = pg.query_selector('#idlebar')
        check(bar is not None and 'Abmeldung in' in bar.inner_text(), 'Vorwarnleiste 60 s vor Ablauf')
        check(pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 2, 'kein waagrechtes Scrollen mit Leiste')
        pg.click('#idlebar button')
        pg.wait_for_timeout(200)
        check(pg.query_selector('#idlebar') is None, '„Angemeldet bleiben“ schließt die Leiste')
        pg.clock.run_for(int(4.5 * 60000))
        pg.wait_for_timeout(300)
        check(pg.evaluate('location.hash') == '#/cases', 'nach Verlängern weiter angemeldet')
        pg.clock.run_for(int(1.5 * 60000))
        pg.wait_for_timeout(800)
        check(pg.evaluate('location.hash') == '#/login', 'ohne Bedienung → Anmeldeseite')
        check(pg.query_selector('#idlebar') is None, 'Leiste nach Abmeldung weg')
        check(pg.evaluate(JS, ['GET', '/api/me'])['s'] == 401, 'Server-Sitzung beendet')
        # Ansichtszustand: Fuhrparkleitung sucht/sortiert, meldet ab; Werkstatt meldet sich im selben Tab an
        pg.fill('#u', 'll.fleet'); pg.fill('#p', PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        pg.evaluate("location.hash='#/cases'"); pg.wait_for_selector('#cq')
        pg.fill('#cq', 'Geheimsuche'); pg.wait_for_timeout(500)
        pg.select_option('#csort', 'oldest'); pg.wait_for_timeout(300)
        pg.evaluate("location.hash='#/more'"); pg.wait_for_selector('#lo'); pg.click('#lo'); pg.wait_for_timeout(800)
        check(pg.evaluate("Object.keys(sessionStorage).filter(k => k.startsWith('cfp_')).length") == 0, 'Abmelden löscht Filter/Sortierung im Tab')
        pg.fill('#u', 'll.workshop'); pg.fill('#p', PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(900)
        pg.evaluate("location.hash='#/cases'"); pg.wait_for_selector('#cq')
        check(pg.eval_on_selector('#cq', 'e => e.value') == '' and pg.eval_on_selector('#csort', 'e => e.value') == 'priority', 'nächste Person sieht keine Suche/Sortierung der vorherigen')
        check(not errs, f'keine JS-Fehler {errs[:2]}')
        ctx.close()
    br.close()

if fails:
    print(f'{len(fails)} Fehler'); sys.exit(1)
print('Leerlauf/geteiltes Tablet: alle Prüfungen grün')
