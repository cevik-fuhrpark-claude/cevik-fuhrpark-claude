# [CLAUDE] UI-Test Backlog 1501 Stufe 9 (WCAG 3.3.1): Auswertungen per GET – „Von“ nach „Bis“ markiert das Feld „Bis“ (aria-invalid,
# Hinweis am Feld, Fokus), die abgelehnte Eingabe bleibt im Feld stehen: Auslesungen-Verlauf, Nachweise der Fahrer, Teile-Verwendung, Lagerjournal,
# Nachweisliste „Durchgeführte Prüfungen“ (Beschriftungen zugeordnet), Versicherungsfälle (Stufe 10). DE bei 390/820/1366 px, UK/EN bei 390 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). CFP_SHOTS=<ordner> speichert Bildschirmfotos.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
MSG = {'de': 'liegt nach', 'uk': None, 'en': None}
STATE = """(sel) => { const el = document.querySelector(sel); const d = (el.getAttribute('aria-describedby') || '').split(' ')[0]; const p = d && document.getElementById(d);
  return { inv: el.getAttribute('aria-invalid'), val: el.value, txt: p ? p.textContent : '', focus: document.activeElement === el }; }"""
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sz.inhaber', 'display_name': 'SZ Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for lang, w, h in runs:
        print('—', lang, w)
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'sz.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        for name, hsh, form, fr, to, pre in [('Auslesungen-Verlauf', '#/tacho/history', '#thf', '#thfrom', '#thto', None),
                                              ('Nachweise der Fahrer', '#/drivers/records', '#drf', '#drfrom', '#drto', None),
                                              ('Teile-Verwendung', '#/stock/usage', '#puf', '#pufrom', '#puto', '#puq'),
                                              ('Lagerjournal', '#/stock/journal', '#jf', '#jfrom', '#jto', None)]:
            q.goto(B + '/' + hsh); q.wait_for_selector(form)
            if pre: q.fill(pre, 'Filter')
            q.fill(fr, '2026-05-01'); q.fill(to, '2026-04-01')
            q.click(form + ' button:not([type=button])')
            q.wait_for_selector(to + '[aria-invalid=true]', timeout=8000)
            st = q.evaluate(STATE, to)
            check(st['val'] == '2026-04-01' and q.eval_on_selector(fr, 'e => e.value') == '2026-05-01', f'{name}: Eingaben bleiben stehen ({st["val"]})')
            check(bool(st['txt']) and (MSG[lang] is None or MSG[lang] in st['txt']), f'{name}: Hinweis am Feld „Bis“: {st["txt"]}')
            check(st['focus'], f'{name}: Fokus im Feld „Bis“')
            if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-zeitraum-{hsh.strip("#/").replace("/", "-")}-{lang}-{w}.png')
            q.fill(to, '2026-06-01')
            check(q.eval_on_selector(to, 'e => !e.hasAttribute("aria-invalid")'), f'{name}: Eingabe hebt die Markierung auf')
        # Nachweisliste der Prüftermine: Beschriftungen zugeordnet, Feld „Bis“ markiert (Formular bleibt bestehen)
        q.goto(B + '/#/maintenance'); q.wait_for_selector('#mhf', state='attached')
        q.evaluate("() => { document.querySelector('#mhist').open = true; }")
        check(q.evaluate("() => ['mhfrom', 'mhto', 'mhkind'].every((id) => document.querySelector(`label[for=${id}]`) && document.getElementById(id).labels.length === 1)"), 'Nachweisliste: Beschriftungen zugeordnet')
        q.fill('#mhfrom', '2026-05-01'); q.fill('#mhto', '2026-04-01')
        q.click('#mhf button:not([type=button])')
        q.wait_for_selector('#mhto[aria-invalid=true]', timeout=8000)
        check(q.evaluate(STATE, '#mhto')['focus'], 'Nachweisliste: Fokus im Feld „Bis“')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-zeitraum-nachweisliste-{lang}-{w}.png')
        # Stufe 10: Versicherungsfälle – Zeitraum wirkt per onchange, Filterleiste ohne <form>; „Bis“ vor „Von“ → nur „Bis“ verworfen
        reqs = []; q.on('request', lambda r: reqs.append(r.url) if '/api/claims' in r.url else None)
        q.goto(B + '/#/claims'); q.wait_for_selector('#clfrom')
        q.fill('#clfrom', '2026-05-01'); q.wait_for_timeout(700); q.wait_for_selector('#clfrom')
        check(q.input_value('#clfrom') == '2026-05-01', 'Versicherungsfälle: Von gesetzt')
        q.fill('#clto', '2026-04-01')
        q.wait_for_selector('#clto[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#clto')
        check(st['val'] == '2026-04-01' and q.input_value('#clfrom') == '2026-05-01', f'Versicherungsfälle: Von bleibt gesetzt, abgelehntes Bis steht im Feld ({st["val"]})')
        check(bool(st['txt']) and (MSG[lang] is None or MSG[lang] in st['txt']), f'Versicherungsfälle: Hinweis am Feld „Bis“: {st["txt"]}')
        check(st['focus'], 'Versicherungsfälle: Fokus im Feld „Bis“')
        n0 = len(reqs); q.wait_for_timeout(1500)
        check(len(reqs) == n0, f'Versicherungsfälle: keine weiteren Anfragen nach der Markierung ({len(reqs) - n0})')
        check(q.eval_on_selector('#clto', 'e => e.getAttribute("aria-invalid")') == 'true', 'Versicherungsfälle: Markierung bleibt bestehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-zeitraum-claims-{lang}-{w}.png')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
