# [CLAUDE] UI-Test Backlog 1501 Stufe 13 (WCAG 3.3.1): persönliche Ruhezeit für Push (Hinweise → „Push für diese Hinweise“) – gleicher Beginn
# und gleiches Ende markiert „bis“ (aria-invalid, Hinweis am Feld, Fokus), Eingaben bleiben stehen, Eingabe hebt die Markierung auf; gültige
# Ruhezeit wird gespeichert. DE bei 390/820/1366 px, UK/EN bei 390 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# CFP_SHOTS=<ordner> speichert Bildschirmfotos.
import os
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
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'rz.inhaber', 'display_name': 'RZ Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for lang, w, h in runs:
        print('—', lang, w)
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'rz.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.evaluate(JS, ['PUT', '/api/me/notify-prefs', {'quiet': None}])
        q.goto(B + '/#/inbox'); q.wait_for_selector('#np', state='attached')
        q.evaluate("() => { document.querySelector('#np').open = true; }"); q.wait_for_selector('#qf', state='visible', timeout=8000)
        check(q.evaluate("() => [...document.querySelectorAll('#qf input')].every((e) => e.labels && e.labels.length === 1)"), 'Beschriftungen zugeordnet (von/bis)')
        q.fill('#qfrom', '22:00'); q.fill('#qto', '22:00')
        q.click('#qf button:not([type=button])')
        q.wait_for_selector('#qto[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#qto')
        check(bool(st['txt']) and st['focus'], f'Hinweis und Fokus am Feld „bis“: {st["txt"]}')
        check(st['val'] == '22:00' and q.input_value('#qfrom') == '22:00', 'Eingaben bleiben stehen')
        check(q.eval_on_selector('#qfrom', 'e => !e.hasAttribute("aria-invalid")'), '„von“ nicht markiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-ruhezeit-{lang}-{w}.png')
        q.fill('#qto', '06:00')
        check(q.eval_on_selector('#qto', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
        q.click('#qf button:not([type=button])')
        q.wait_for_function("() => document.querySelector('#qoff')", timeout=8000)
        r = q.evaluate(JS, ['GET', '/api/me/notify-prefs'])
        check(r['d']['quiet'] == {'from': '22:00', 'to': '06:00'}, 'gültige Ruhezeit gespeichert')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
