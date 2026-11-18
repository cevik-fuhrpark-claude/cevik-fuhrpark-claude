# [CLAUDE] UI-Test Backlog 1576 (Backlog 1501 Stufe 18, WCAG 3.3.1): Vertrag beenden mit „Beendet am“ vor dem Vertragsbeginn markiert
# „Beendet am“ (aria-invalid, Hinweis am Feld, Fokus), Grund bleibt stehen. DE bei 390/820/1366 px, UK/EN bei 390 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). CFP_SHOTS=<ordner> speichert Bildschirmfotos.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
STATE = """(sel) => { const el = document.querySelector(sel); const d = (el.getAttribute('aria-describedby') || '').split(' ')[0]; const p = d && document.getElementById(d);
  return { inv: el.getAttribute('aria-invalid'), val: el.value, txt: p ? p.textContent : '', focus: document.activeElement === el }; }"""
today = datetime.date.today()
d = lambda n: (today + datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vf.inhaber', 'display_name': 'VF Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'vf.inhaber', 'password': PW})['s'] == 200, 'Inhaber angemeldet')
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for i, (lang, w, h) in enumerate(runs):
        print('—', lang, w)
        vin = f'WDB96340310576F0{i}'; vid = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'VF-FE 57{i}', 'vin': vin, 'site': 'Dortmund'})
        ct = api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'versicherung', 'partner': f'Feld {lang}', 'evidence': 'Police (Test)', 'start_date': d(-30)})
        check(ct['s'] == 201, f'Vertrag angelegt {ct["s"]}'); cid = ct['d']['id']
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'vf.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/vehicles/' + vid); q.reload(); F = f'form[data-ctend="{cid}"]'
        q.wait_for_selector(F, state='attached', timeout=20000)
        q.evaluate("(f) => { let e = document.querySelector(f); while (e) { if (e.tagName === 'DETAILS') e.open = true; e = e.parentElement; } }", F)
        q.locator(F).scroll_into_view_if_needed()
        q.fill(f'{F} [name=ended_on]', d(-40)); q.fill(f'{F} [name=end_note]', 'Versichererwechsel (Test)')
        q.click(f'{F} button:not([type=button])')
        q.wait_for_selector(f'{F} [name=ended_on][aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, f'{F} [name=ended_on]')
        check(bool(st['txt']) and st['focus'], f'Hinweis und Fokus am Feld „Beendet am“: {st["txt"]}')
        check(st['val'] == d(-40) and q.input_value(f'{F} [name=end_note]') == 'Versichererwechsel (Test)', 'Eingaben bleiben stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-vertrag-{lang}-{w}.png')
        sw = q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(sw <= 0, f'ohne Querscrollen ({sw})')
        q.fill(f'{F} [name=ended_on]', d(-1))
        check(q.eval_on_selector(f'{F} [name=ended_on]', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
