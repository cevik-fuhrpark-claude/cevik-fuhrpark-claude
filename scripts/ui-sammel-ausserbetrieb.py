# [CLAUDE] UI-Test Backlog 1577 (Backlog 1501 Stufe 19, WCAG 3.3.1): Sammelmeldung, während die Seite offen ist, wird ein gewähltes Fahrzeug
# außer Betrieb genommen → Meldung nennt das Kennzeichen, Auswahlliste markiert (aria-invalid + Hinweis), abgelehntes Kästchen gestrichelt
# umrandet, trotz Suchfilter sichtbar und fokussiert; Abwählen hebt die Kennzeichnung auf, Senden klappt danach. DE bei 390/820/1366 px, UK/EN bei 390 px.
# Backlog 1578: Einzelmeldung an einem inzwischen außer Betrieb genommenen Fahrzeug → Fahrzeugauswahl markiert, Fokus auf dem Fahrzeug,
# Beschreibung bleibt stehen (DE/UK/EN bei 390 px, DE bei 1366 px).
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
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sb.inhaber', 'display_name': 'SB Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'sb.inhaber', 'password': PW})['s'] == 200, 'Inhaber angemeldet')
    runs = [('de', 390, 844), ('de', 820, 1180), ('de', 1366, 900), ('uk', 390, 844), ('en', 390, 844)]
    words = {'de': 'abwählen', 'uk': 'зніміть', 'en': 'deselect'}
    for i, (lang, w, h) in enumerate(runs):
        print('—', lang, w)
        ids = []
        for k in range(3):
            vin = f'WDB963403105770{i}{k}'; ids.append('VIN:' + vin)
            api('POST', '/api/vehicles', {'plate': f'SB-AB 7{i}{k}', 'vin': vin, 'site': 'Dortmund'})
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'sb.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/new'); q.reload(); q.wait_for_selector('#tomulti', timeout=20000); q.click('#tomulti'); q.wait_for_selector('#mpick', timeout=15000)
        for vid in ids[:3]: q.check(f'input[name=mveh][value="{vid}"]', force=True)
        q.fill('#d', 'Hagelschaden: Dellen im Dach (Test)')
        # Suchfilter auf das erste Fahrzeug – das abgelehnte (zweite) bleibt sichtbar, weil es gewählt ist; danach außer Betrieb nehmen
        q.fill('#vq', f'SB-AB 7{i}0')
        check(api('POST', f'/api/vehicles/{ids[1]}/active', {'active': False, 'reason': 'Verkauft (Test)'})['s'] == 200, 'Fahrzeug außer Betrieb genommen')
        q.click('#sb')
        q.wait_for_selector('#mpick[aria-invalid=true]', timeout=8000)
        st = q.evaluate("""(v) => { const g = document.getElementById('mpick'); const d = (g.getAttribute('aria-describedby') || '').split(' ')[0]; const p = d && document.getElementById(d);
          const box = document.querySelector(`input[name=mveh][value="${v}"]`); const l = box.closest('label'); const cs = getComputedStyle(l);
          return { txt: p ? p.textContent : '', bad: l.dataset.mbad, hidden: l.hidden, focus: document.activeElement === box, dash: cs.borderTopStyle, n: document.querySelectorAll('[data-mbad]').length }; }""", ids[1])
        check(f'SB-AB 7{i}1' in st['txt'] and words[lang] in st['txt'], f'Hinweis an der Auswahl nennt das Kennzeichen: {st["txt"]}')
        check(st['bad'] == '1' and st['n'] == 1 and st['dash'] == 'dashed', f'nur das abgelehnte Kästchen gestrichelt markiert ({st})')
        check(not st['hidden'] and st['focus'], 'abgelehntes Kästchen sichtbar und fokussiert')
        check(q.input_value('#d') == 'Hagelschaden: Dellen im Dach (Test)', 'Beschreibung bleibt stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sammel-ausserbetrieb-{lang}-{w}.png', full_page=False)
        sw = q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(sw <= 0, f'ohne Querscrollen ({sw})')
        q.uncheck(f'input[name=mveh][value="{ids[1]}"]', force=True)
        check(q.evaluate("() => !document.querySelector('[data-mbad]') && !document.getElementById('mpick').hasAttribute('aria-invalid')"), 'Abwählen hebt die Markierung auf')
        q.click('#sb'); q.wait_for_selector('[data-multidone]', timeout=15000)
        check(q.locator('[data-mcase]').count() == 2, 'danach zwei Vorgänge angelegt')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    # Backlog 1578: Einzelmeldung
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 390, 844), ('en', 390, 844), ('de', 1366, 900)]):
        print('— Einzelmeldung', lang, w)
        vin = f'WDB963403105780{i}0'; vid = 'VIN:' + vin; pl = f'SB-EM 8{i}0'
        api('POST', '/api/vehicles', {'plate': pl, 'vin': vin, 'site': 'Dortmund'})
        c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.evaluate(JS, ['POST', '/api/login', {'username': 'sb.inhaber', 'password': PW}])
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/new'); q.reload(); q.wait_for_selector('#f #d', timeout=20000)
        q.fill('#vq', pl); q.wait_for_selector(f'input[name=veh][value="{vid}"]', state='attached', timeout=15000)
        q.check(f'input[name=veh][value="{vid}"]', force=True)
        q.fill('#d', 'Rückleuchte links defekt (Test)')
        check(api('POST', f'/api/vehicles/{vid}/active', {'active': False, 'reason': 'Verkauft (Test)'})['s'] == 200, 'Fahrzeug außer Betrieb genommen')
        q.click('#f button[type=submit], #f button:not([type])')
        q.wait_for_selector('.vehpick[aria-invalid=true]', timeout=8000)
        st = q.evaluate("""(v) => { const g = document.querySelector('.vehpick[aria-invalid=true]'); const d = (g.getAttribute('aria-describedby') || '').split(' ')[0]; const p = d && document.getElementById(d);
          const box = document.querySelector(`input[name=veh][value="${v}"]`); return { txt: p ? p.textContent : '', inside: g.contains(box), focus: document.activeElement === box }; }""", vid)
        check(bool(st['txt']) and st['inside'] and st['focus'], f'Fahrzeugauswahl markiert, Fokus am Fahrzeug: {st}')
        check(q.input_value('#d') == 'Rückleuchte links defekt (Test)', 'Beschreibung bleibt stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/einzel-ausserbetrieb-{lang}-{w}.png')
        sw = q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(sw <= 0, f'ohne Querscrollen ({sw})')
        check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
        c.close()
    br.close()
print('\nOK' if not fails else f'\n{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
