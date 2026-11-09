# [CLAUDE] UI-Test (09.11.2026, Backlog 1233, Blickwinkel „Werkstatt zählt die Inventur mit Barcode-Scanner“): Im Inventurbereich der
# Lagerseite springt „Artikel suchen oder scannen“ + Enter ins Zählfeld des einen passenden Artikels (Teilenummer ohne Leerzeichen; die
# Lagerort-Auswahl wird dafür auf „alle“ gestellt), Enter im Zählfeld zurück ins Suchfeld (markiert); mehrere Treffer → Anzahl, Suchtext
# markiert. „Prüfen“ zeigt die gescannte Zählung als Differenz, gebucht wird nichts. DE 390, UK 820, EN 1366; kein Querscrollen, keine
# Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SELALL = "(s) => { const e = document.querySelector(s); return !!e && document.activeElement === e && e.selectionStart === 0 && e.selectionEnd === e.value.length && e.value.length > 0; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'is.inhaber', 'display_name': 'IS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['is.inhaber', 'se.inhaber', 'bs.inhaber', 'wn.inhaber', 'tl.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]; pid = int(uuid.uuid4().int % 10**6)
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        site = 'DORTMUND'; wsu = f'is.ws.{tag}{i}'
        # je Sprache eigene Werkstatt-Person, Artikel in einem eigenen Lagerort-Paar (Lager wird geteilt)
        u = api('POST', '/api/users', {'username': wsu, 'display_name': 'IS Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': site, 'language': lang})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
        if i == 0:
            for k in range(9): wsapi('POST', '/api/stock', {'site': site, 'name': f'Füllartikel {tag} {k}', 'part_number': f'F{tag}-{k}', 'initial_qty': '2', 'location': f'Regal A{tag}'})
        pn = f'C 300 {pid % 100:02d} {i}{i} 5'; scan = pn.replace(' ', '')
        ia = wsapi('POST', '/api/stock', {'site': site, 'name': f'Bremsscheibe {tag}{i}', 'part_number': pn, 'initial_qty': '4', 'location': f'Regal B{tag}'})['d']['id']
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/stock'); q.reload(); q.wait_for_selector('#inv', timeout=15000)
        q.click('#inv > summary'); q.wait_for_selector('#invq', timeout=10000)
        if q.locator('#invloc').count():
            q.select_option('#invloc', f'Regal A{tag}'); q.wait_for_timeout(100)
            check(q.locator(f'[data-inv="{ia}"]').is_hidden(), f'{lang}: Zielartikel durch Lagerort-Auswahl ausgeblendet')
        q.click('#invq'); q.keyboard.type(scan, delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(300)
        check(q.evaluate("() => document.activeElement && document.activeElement.dataset.inv") == ia, f'{lang}: Scan + Enter → Zählfeld des Artikels')
        check(q.locator(f'[data-inv="{ia}"]').is_visible(), f'{lang}: Artikel sichtbar (Lagerort-Auswahl auf alle)')
        q.keyboard.type('3'); q.keyboard.press('Enter'); q.wait_for_timeout(100)
        check(q.evaluate(SELALL, '#invq'), f'{lang}: Enter im Zählfeld → zurück ins Suchfeld, markiert')
        q.keyboard.type(f'F{tag}', delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(200)
        check(q.locator('#invqn:not([hidden])').count() == 1 and '9' in q.inner_text('#invqn') and q.evaluate(SELALL, '#invq'), f'{lang}: mehrere Treffer → Anzahl, Suchtext markiert')
        if SHOTS: q.locator('#inv').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/inventur-scanner-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}: ohne Querscrollen')
        q.click('#invchk'); q.wait_for_selector('#invres [data-invdiff]', timeout=10000)
        check(f'Bremsscheibe {tag}{i}' in q.inner_text('#invres'), f'{lang}: „Prüfen“ zeigt die gescannte Zählung als Differenz')
        check(wsapi('GET', f'/api/stock/{ia}')['d']['item']['on_hand'] == 4, f'{lang}: nichts gebucht')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        q.evaluate("() => { try { Object.keys(localStorage).filter((k) => k.startsWith('cfp_inv_')).forEach((k) => localStorage.removeItem(k)); } catch {} }")
        ctx.close(); c0.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
