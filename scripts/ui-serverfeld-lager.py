# [CLAUDE] UI-Test Backlog 1501 Stufe 17 (WCAG 3.3.1): Wareneingang – Server-Prüffehler einer Position (Menge 0 in der dritten Zeile, die
# zweite Zeile bleibt leer und wird nicht gesendet) markiert genau das Mengenfeld dieser Zeile (aria-invalid, Hinweis, Fokus), nicht das der
# ersten; Lagerbestand zum Stichtag mit Datum in der Zukunft → Stichtag markiert, Eingabe bleibt; Benutzer anlegen mit ungültigem
# Benutzernamen → „Benutzername“ markiert, Beschriftungen zugeordnet. DE bei 390/820/1366 px, UK/EN bei 390 px.
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
PICK = """([i, id]) => { const s = document.querySelectorAll('#rclines .rcl select')[i]; s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); }"""
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lg.inhaber', 'display_name': 'LG Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    a.evaluate(JS, ['POST', '/api/login', {'username': 'lg.inhaber', 'password': PW}])
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for lang, w, h in runs:
        print('—', lang, w)
        ia = api('POST', '/api/stock', {'name': f'Filter {lang} {w} A', 'site': 'DORTMUND'})['d']['id']
        ib = api('POST', '/api/stock', {'name': f'Filter {lang} {w} B', 'site': 'DORTMUND'})['d']['id']
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'lg.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.evaluate("() => { try { sessionStorage.removeItem('cfp_sa_date'); } catch {} }")
        # Wareneingang: Zeile 1 gültig, Zeile 2 leer (nicht gesendet), Zeile 3 Menge 0 → Server nennt Position 2 (field_line 1) = dritte Zeile
        q.goto(B + '/#/stock/receipt'); q.wait_for_selector('#rcf', state='visible', timeout=10000)
        if q.query_selector('#rcsite'): q.select_option('#rcsite', 'DORTMUND')
        q.click('#rcadd'); q.click('#rcadd'); q.wait_for_function("() => document.querySelectorAll('#rclines .rcl').length >= 3")
        q.evaluate(PICK, [0, ia]); q.fill('#rclines .rcl:nth-child(1) .rcq', '1')
        q.evaluate(PICK, [2, ib]); q.fill('#rclines .rcl:nth-child(3) .rcq', '0')
        q.click('#rcbook')
        q.wait_for_selector('#rclines .rcl:nth-child(3) .rcq[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#rclines .rcl:nth-child(3) .rcq')
        check(bool(st['txt']) and st['focus'] and st['val'] == '0', f'Menge der dritten Zeile markiert, Fokus, Eingabe bleibt: {st["txt"]}')
        check(q.eval_on_selector('#rclines .rcl:nth-child(1) .rcq', 'e => !e.hasAttribute("aria-invalid")'), 'Menge der ersten Zeile nicht markiert')
        check(q.evaluate(JS, ['GET', f'/api/stock/{ia}'])['d']['item']['on_hand'] == 0, 'nichts gebucht')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-lager-wareneingang-{lang}-{w}.png')
        q.fill('#rclines .rcl:nth-child(3) .rcq', '2')
        check(q.eval_on_selector('#rclines .rcl:nth-child(3) .rcq', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
        q.click('#rcbook'); q.wait_for_selector('#rcdone', timeout=8000)
        check(q.evaluate(JS, ['GET', f'/api/stock/{ib}'])['d']['item']['on_hand'] == 2, 'korrigierter Wareneingang gebucht')
        # Stichtag in der Zukunft (Datumsfeld lässt das im Browser nicht zu – gemerkter Wert aus der Sitzung)
        q.evaluate("() => { sessionStorage.setItem('cfp_sa_date', '2099-01-01'); }")
        q.goto(B + '/#/stock/asof'); q.wait_for_selector('#sadate[aria-invalid=true]', timeout=10000)
        st = q.evaluate(STATE, '#sadate')
        check(bool(st['txt']) and st['val'] == '2099-01-01', f'Stichtag markiert, Eingabe bleibt: {st["txt"]}')
        check(q.evaluate("() => { try { return sessionStorage.getItem('cfp_sa_date') || ''; } catch { return 'x'; } }") == '', 'abgelehnter Stichtag nicht gemerkt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-lager-stichtag-{lang}-{w}.png')
        # Benutzer anlegen: ungültiger Benutzername
        q.goto(B + '/#/users'); q.wait_for_selector('#nf', state='attached', timeout=10000)
        q.evaluate("() => { document.querySelector('#nf').closest('details').open = true; }")
        check(q.evaluate("() => [...document.querySelectorAll('#nf input, #nf select')].filter((e) => e.offsetParent !== null).every((e) => e.labels && e.labels.length === 1)"), 'Benutzerformular: Beschriftungen zugeordnet')
        q.fill('#nuname', 'Feld Lager'); q.fill('#nuuser', 'a b')
        q.click('#nf button:not([type=button])')
        q.wait_for_selector('#nuuser[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#nuuser')
        check(bool(st['txt']) and st['focus'] and st['val'] == 'a b', f'Benutzername markiert, Fokus: {st["txt"]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-lager-benutzer-{lang}-{w}.png')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
