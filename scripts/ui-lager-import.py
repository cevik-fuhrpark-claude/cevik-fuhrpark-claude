# [CLAUDE] UI-Test (19.10.2026) – Lager „Artikel importieren (CSV)“: Vorschau (UK, 390 px), Übernehmen, Ergebnis; zweite Datei legt nichts doppelt an.
# Screenshots: CFP_SHOTS=<Ordner>.
import os, tempfile
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
pid = os.getpid()
csv = f'Teilenummer;Bezeichnung;Einheit;Bestand;Mindestbestand;Lagerort;Preis\nUI{pid}-1;Luftfilter {pid};Stk;3;1;R5;19,90\nUI{pid}-2;Keilriemen extra lang Ausführung für Zugmaschine Hinterachse {pid};Stk;2;;R6;\n;;Stk;1;;;\n'
fn = os.path.join(tempfile.mkdtemp(), 'lager.csv'); open(fn, 'w', encoding='utf-8').write(csv)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'li.inhaber', 'display_name': 'LI Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'li.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    u = api('POST', '/api/users', {'username': f'li.ws{pid}', 'display_name': 'LI WS', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B)
    q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    q.evaluate(JS, ['POST', '/api/login', {'username': f'li.ws{pid}', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': 'uk'}])
    errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
    q.goto(B + '/#/stock'); q.wait_for_selector('#simp', state='attached')
    q.locator('#simp > summary').click(); q.set_input_files('#simpf', fn); q.wait_for_selector('#simpsum')
    t = q.inner_text('#simpr')
    check('Перегляд' in t or 'перегляд' in t.lower(), 'Vorschau (UK) angezeigt')
    check('нове: 2' in t, 'zwei neue Artikel in der Vorschau: ' + t.splitlines()[0])
    check('Відсутня назва' in t, 'Grund „Bezeichnung fehlt“ übersetzt')
    check(not q.evaluate("() => document.documentElement.scrollWidth > innerWidth + 1"), 'kein waagerechtes Scrollen')
    if SHOTS: q.locator('#simp').screenshot(path=f'{SHOTS}/lager-import-uk-390.png')
    q.click('#simpapply'); q.wait_for_function("() => document.querySelector('#simpsum') && document.querySelector('#simpsum').textContent.startsWith('✓')", timeout=10000)
    items = q.evaluate(JS, ['GET', '/api/stock', None])['d']['items']
    lf = [i for i in items if i['name'] == f'Luftfilter {pid}']
    check(len(lf) == 1 and lf[0]['on_hand'] == 3 and lf[0]['unit_price_net'] == 19.9, 'Artikel mit Bestand und Preis angelegt')
    check(q.locator('#sl').inner_text().count(f'Luftfilter {pid}') == 1, 'Artikel in der Lagerliste')
    q.locator('#simp > summary').click() if not q.locator('#simp').get_attribute('open') is not None else None
    q.set_input_files('#simpf', fn); q.wait_for_function("() => document.querySelector('#simpsum') && !document.querySelector('#simpsum').textContent.startsWith('✓')", timeout=10000)
    check('нове: 0' in q.inner_text('#simpr') and q.locator('#simpapply').count() == 0, 'zweite Vorschau: nichts neu, kein Übernehmen-Knopf')
    check(not errs, f'keine Skriptfehler {errs}')
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
