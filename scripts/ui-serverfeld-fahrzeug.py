# [CLAUDE] UI-Test Backlog 1501 Stufe 15 (WCAG 3.3.1): Fahrzeuge – „Fahrzeug anlegen“ mit kyrillischem Kennzeichen markiert „Kennzeichen“,
# Fahrzeugakte → „Prüftermin hinzufügen“ mit nächstem Termin vor der letzten Durchführung markiert „Nächster Termin“ (aria-invalid, Hinweis am
# Feld, Fokus, Eingaben bleiben); Beschriftungen zugeordnet (for/id). DE bei 390/820/1366 px, UK/EN bei 390 px.
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
STATE = """(sel) => { const el = document.querySelector(sel); const d = (el.getAttribute('aria-describedby') || '').split(' ')[0]; const p = d && document.getElementById(d);
  return { inv: el.getAttribute('aria-invalid'), val: el.value, txt: p ? p.textContent : '', focus: document.activeElement === el }; }"""
LABELS = "(sel) => [...document.querySelectorAll(sel)].filter((e) => e.type !== 'hidden' && !e.closest('[hidden]')).every((e) => e.labels && e.labels.length >= 1)"
OPEN = "(sel) => { const d = document.querySelector(sel).closest('details'); if (d) d.open = true; }"
VID = 'VIN:WDB96340310815315'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ff.inhaber', 'display_name': 'FF Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    a.evaluate(JS, ['POST', '/api/login', {'username': 'ff.inhaber', 'password': PW}])
    check(api('POST', '/api/vehicles', {'plate': 'AB-FF 1515', 'vin': 'WDB96340310815315', 'site': 'Dortmund'})['s'] == 201, 'Fahrzeug angelegt')
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for n, (lang, w, h) in enumerate(runs):
        print('—', lang, w)
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'ff.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        # Fahrzeug anlegen: kyrillisches „А“/„С“ im Kennzeichen → Server lehnt ab, Feld „Kennzeichen“ markiert
        q.goto(B + '/#/vehicles'); q.reload(); q.wait_for_selector('#nvf', state='attached', timeout=15000); q.evaluate(OPEN, '#nvf')
        check(q.evaluate(LABELS, '#nvf input, #nvf select'), 'Fahrzeugformular: Beschriftungen zugeordnet')
        q.fill('#nvf [name=vin]', f'WDB9634031081540{n}'); q.fill('#nvf [name=plate]', 'АВ-С 15')
        q.click('#nvf button:not([type=button])')
        q.wait_for_selector('#vf_plate[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#vf_plate')
        check(bool(st['txt']) and st['focus'], f'Kennzeichen: Hinweis und Fokus am Feld: {st["txt"]}')
        check(st['val'] == 'АВ-С 15', 'Eingabe bleibt stehen')
        check(q.eval_on_selector('#vf_vin', 'e => e.getAttribute("aria-invalid") !== "true"'), 'FIN nicht markiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-fahrzeug-nvf-{lang}-{w}.png')
        # Prüftermin: nächster Termin vor der letzten Durchführung → „Nächster Termin“ markiert
        q.goto(B + f'/#/vehicles/{VID}'); q.wait_for_selector('#mf', state='attached', timeout=15000); q.evaluate(OPEN, '#mf')
        check(q.evaluate(LABELS, '#mf input, #mf select'), 'Prüftermin-Formular: Beschriftungen zugeordnet')
        q.select_option('#mfkind', 'UVV'); q.fill('#mflast', '2026-05-01'); q.fill('#mfnext', '2026-04-01'); q.fill('#mfev', 'Prüfbericht 1515')
        q.click('#mf button:not([type=button])')
        q.wait_for_selector('#mfnext[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#mfnext')
        check(bool(st['txt']) and st['focus'], f'Nächster Termin: Hinweis und Fokus am Feld: {st["txt"]}')
        check(st['val'] == '2026-04-01' and q.input_value('#mflast') == '2026-05-01', 'Eingaben bleiben stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-fahrzeug-mf-{lang}-{w}.png')
        q.fill('#mfnext', '2027-05-01')
        check(q.eval_on_selector('#mfnext', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
        check(q.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"), 'kein seitliches Scrollen')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
