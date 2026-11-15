# [CLAUDE] UI-Test Backlog 1501 Stufe 14 (WCAG 3.3.1): Vorgangsbefehle (Formular #af) – „Wiedervorlage“ ohne Änderung markiert das Datumsfeld,
# „Standort/Abschleppung“ mit Datum ohne Abschleppdienst markiert „Abschleppdienst“ (aria-invalid, Hinweis am Feld, Fokus, Eingaben bleiben);
# Beschriftungen zugeordnet (for/id). DE bei 390/820/1366 px, UK/EN bei 390 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# CFP_SHOTS=<ordner> speichert Bildschirmfotos.
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
LABELS = "(ids) => ids.every((i) => { const e = document.getElementById(i); return e && e.labels && e.labels.length === 1; })"
today = datetime.date.today().isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vf.inhaber', 'display_name': 'VF Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    a.evaluate(JS, ['POST', '/api/login', {'username': 'vf.inhaber', 'password': PW}])
    api('POST', '/api/vehicles', {'plate': 'AB-VF 1514', 'vin': 'WDB96340310815114', 'site': 'Dortmund'})
    cs = api('POST', '/api/cases', {'vehicle_id': 'VIN:WDB96340310815114', 'description': 'Spiegel links abgebrochen', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': 'vf-1514'})
    cid = cs['d'].get('id') or cs['d']['case']['id']
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    for lang, w, h in runs:
        print('—', lang, w)
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'vf.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + f'/#/cases/{cid}'); q.reload()
        # Wiedervorlage ohne Datum und ohne Vermerk → „unverändert“ am Datumsfeld
        q.wait_for_selector('[data-act=set_followup]', timeout=15000); q.click('[data-act=set_followup]')
        q.wait_for_selector('#af #fuon', timeout=8000)
        check(q.evaluate(LABELS, ['fuon']), 'Beschriftung Wiedervorlage zugeordnet')
        q.click('#af button:not([type=button])')
        q.wait_for_selector('#fuon[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#fuon')
        check(bool(st['txt']) and st['focus'], f'Wiedervorlage: Hinweis und Fokus am Feld: {st["txt"]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-vorgang-wv-{lang}-{w}.png')
        q.click('#ac')
        # Standort: Abschleppdatum ohne Abschleppdienst → „Abschleppdienst“ markiert, Datum bleibt stehen
        q.wait_for_selector('[data-act=set_vehicle_location]', timeout=8000); q.click('[data-act=set_vehicle_location]')
        q.wait_for_selector('#af #vlon', timeout=8000)
        check(q.evaluate(LABELS, ['vlloc', 'vlsvc', 'vlon']), 'Beschriftungen Standort/Abschleppdienst/Datum zugeordnet')
        q.fill('#vlon', today)
        q.click('#af button:not([type=button])')
        q.wait_for_selector('#vlsvc[aria-invalid=true]', timeout=8000)
        st = q.evaluate(STATE, '#vlsvc')
        check(bool(st['txt']) and st['focus'], f'Abschleppdienst: Hinweis und Fokus am Feld: {st["txt"]}')
        check(q.input_value('#vlon') == today, 'Abschleppdatum bleibt stehen')
        check(q.eval_on_selector('#vlon', 'e => !e.hasAttribute("aria-invalid")'), 'Datum nicht markiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-vorgang-vl-{lang}-{w}.png', full_page=False)
        q.fill('#vlsvc', 'Abschlepp Test')
        check(q.eval_on_selector('#vlsvc', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
        check(q.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"), 'kein seitliches Scrollen')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
