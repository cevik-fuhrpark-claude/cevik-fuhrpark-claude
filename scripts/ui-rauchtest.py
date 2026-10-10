# [CLAUDE] UI-Rauchtest: alle Ansichten je Rolle in Handy-, Tablet- und PC-Breite aufrufen
# Voraussetzung: lokaler Entwicklungsserver mit frischer In-Memory-DB (sh scripts/restart-dev.sh) und Python-Playwright.
# Aufruf: python3 scripts/ui-rauchtest.py [Ausgabeordner für Screenshots]
# Prüft je Ansicht: keine JavaScript-Fehler, keine Fehlermeldung (rote Meldung), keine waagrechte Scrollleiste der Seite,
# Überschrift vorhanden. Nur synthetische Testdaten (Kennzeichen RT-…), nichts verlässt den Rechner.
import sys, os
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ROUTES = {
    'owner': ['', 'cases', 'vehicles', 'master', 'more', 'maintenance', 'tires', 'kpi', 'costs', 'stock', 'fines', 'users', 'audit', 'usage', 'quality', 'wsload', 'telematics', 'settings', 'help', 'new', 'check'],
    'fleet': ['', 'cases', 'vehicles', 'master', 'more', 'maintenance', 'tires', 'kpi', 'costs', 'stock', 'fines', 'users', 'quality', 'wsload', 'telematics', 'help'],
    'workshop': ['', 'cases', 'inbox', 'vehicles', 'more', 'maintenance', 'tires', 'stock', 'wsload', 'help'],
    'driver': ['', 'cases', 'new', 'check', 'more', 'fines', 'help'],
    'dispatch': ['', 'cases', 'vehicles', 'more', 'maintenance', 'help'],
}
# Barrierefreiheit (vereinfacht): Felder ohne zugänglichen Namen, Bilder ohne Alternativtext, Schaltflächen/Links ohne Text
A11Y = """() => {
  const out = [];
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  for (const el of document.querySelectorAll('#app input:not([type=hidden]), #app select, #app textarea')) {
    if (!visible(el)) continue;
    const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.title;
    if (!named) out.push(`Feld ohne Beschriftung: ${el.outerHTML.slice(0, 80)}`);
  }
  for (const el of document.querySelectorAll('#app img')) if (!el.hasAttribute('alt')) out.push(`Bild ohne alt: ${el.outerHTML.slice(0, 80)}`);
  for (const el of document.querySelectorAll('#app button, #app a[href]')) {
    if (!visible(el)) continue;
    if (!(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.title && !el.querySelector('img[alt]:not([alt=\"\"])')) out.push(`Schaltfläche/Link ohne Text: ${el.outerHTML.slice(0, 80)}`);
  }
  return out;
}"""
SIZES = [('handy', 390, 844), ('tablet', 820, 1180), ('pc', 1440, 900)]

problems = []
with sync_playwright() as p:
    br = p.chromium.launch()
    adm = br.new_page()
    adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    st = api('GET', '/api/setup/status')['d']
    if not st.get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'rt.inhaber', 'display_name': 'Rauchtest Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    vin = 'WDB96340310123456'
    vid = 'VIN:' + vin
    api('POST', '/api/vehicles', {'plate': 'RT-AB 101', 'vin': vin, 'site': 'Dortmund'})
    api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'HU', 'last_done_date': '2026-01-10', 'interval_months': 12, 'evidence': 'Rauchtest'})
    ROUTES['owner'] += [f'vehicles/{vid}', f'vehicles/{vid}/timeline']
    ROUTES['fleet'] += [f'vehicles/{vid}', f'vehicles/{vid}/timeline']
    pages = {'owner': adm}
    for role, extra in [('fleet', {}), ('workshop', {'workshop_site': 'DORTMUND'}), ('driver', {}), ('dispatch', {})]:
        u = api('POST', '/api/users', {'username': f'rt.{role}', 'display_name': f'Rauchtest {role}', 'role': role, 'environment': 'production', **extra})
        if u['s'] != 201:
            sys.exit(f'Benutzer {role}: {u}')
        if role == 'driver':
            api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id']})
        pg = br.new_context().new_page()
        pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        pages[role] = pg
    # Eine Meldung, damit Listen nicht leer sind
    pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Spiegel locker', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': 'rt-1'}])

    for role, pg in pages.items():
        errors = []
        pg.on('pageerror', lambda e, errors=errors: errors.append(str(e)))
        for name, w, h in SIZES:
            pg.set_viewport_size({'width': w, 'height': h})
            for r in ROUTES[role]:
                errors.clear()
                pg.goto(f'{B}/#/{r}')
                pg.wait_for_timeout(500)
                where = f'{role} {name} #/{r}'
                if errors:
                    problems.append(f'{where}: JS-Fehler {errors[:2]}')
                err = pg.locator('.toast.err')
                if err.count():
                    problems.append(f'{where}: Fehlermeldung „{err.first.text_content()}“')
                if not pg.locator('h1').count():
                    problems.append(f'{where}: keine Überschrift')
                if name == 'handy':
                    a11y = pg.evaluate(A11Y)
                    if a11y:
                        problems.append(f'{where}: Barrierefreiheit {a11y[:3]}')
                over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                if over > 2:
                    problems.append(f'{where}: Seite {over}px breiter als der Bildschirm')
                if OUT and name == 'handy':
                    os.makedirs(OUT, exist_ok=True)
                    pg.screenshot(path=os.path.join(OUT, f"{role}_{r.replace('/', '_').replace(':', '') or 'start'}.png"), full_page=True)
    br.close()

n = sum(len(v) for v in ROUTES.values()) * len(SIZES)
print(f'{n} Ansichten geprüft, {len(problems)} Auffälligkeiten')
for x in problems:
    print('  - ' + x)
sys.exit(1 if problems else 0)
