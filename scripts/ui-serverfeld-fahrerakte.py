# [CLAUDE] UI-Test Backlog 1501 Stufe 12 (WCAG 3.3.1/1.3.1): Fahrerakte – Nachweis „Gültig bis“ vor „Ausgestellt am“ markiert „Gültig bis“,
# Führerscheinkontrolle „Mängel“ ohne Vermerk markiert „Bemerkung“ (aria-invalid, Hinweis am Feld, Fokus); Beschriftungen beider Formulare
# den Feldern zugeordnet. DE bei 390/820/1366 px, UK/EN bei 390 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    dv = api('POST', '/api/drivers', {'display_name': 'Akte Feldtest'}); did = dv['d'].get('id') or dv['d']['driver']['id']
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for lang, w, h in runs:
        print('—', lang, w)
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'fa.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/drivers/' + did); q.wait_for_selector('#ddf', state='attached')
        q.evaluate("() => { document.querySelector('#ddf').closest('details').open = true; document.querySelector('#lcf').closest('details').open = true; }")
        check(q.evaluate("() => [...document.querySelectorAll('#ddf input:not([type=hidden]), #ddf select, #lcf input, #lcf select')].every((e) => e.labels && e.labels.length === 1)"), 'Beschriftungen zugeordnet (Nachweis, Kontrolle)')
        q.select_option('#ddkind', 'fahrerkarte'); q.fill('#ddissued', '2025-01-01'); q.fill('#ddvalid', '2024-01-01'); q.fill('#ddev', 'Kopie Akte')
        q.click('#ddf button:not([type=button])')
        q.wait_for_selector('#ddvalid[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#ddvalid')
        check(bool(st['txt']) and st['focus'], f'Nachweis: Hinweis und Fokus am Feld „Gültig bis“: {st["txt"]}')
        check(st['val'] == '2024-01-01' and q.input_value('#ddev') == 'Kopie Akte', 'Nachweis: Eingaben bleiben stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-fahrerakte-nachweis-{lang}-{w}.png')
        q.select_option('#lcres', 'maengel'); q.fill('#lcnote', '')
        q.click('#lcf button:not([type=button])')
        q.wait_for_selector('#lcnote[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#lcnote')
        check(bool(st['txt']) and st['focus'], f'Kontrolle: Hinweis und Fokus am Feld „Bemerkung“: {st["txt"]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-fahrerakte-kontrolle-{lang}-{w}.png')
        q.fill('#lcnote', 'Führerschein beschädigt')
        check(q.eval_on_selector('#lcnote', 'e => !e.hasAttribute("aria-invalid")'), 'Kontrolle: Eingabe hebt die Markierung auf')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
