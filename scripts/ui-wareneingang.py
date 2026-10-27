# [CLAUDE] UI-Test (27.10.2026, Backlog 445, Blickwinkel „Lieferung mit mehreren Positionen kommt – Wareneingang“):
# Werkstatt öffnet Lager → „Wareneingang“, gibt Lieferant/Lieferschein einmal ein, zwei Positionen (Artikel, Menge, Preis), bucht; Bestände
# stimmen, Pflichtprüfung ohne Menge, doppelter Artikel abgewiesen. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'we.inhaber', 'display_name': 'WE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['we.inhaber', 'tv.inhaber', 'sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'we.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'WE Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:5]
        ia = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Ölfilter {n}', 'part_number': f'W {n}'})['d']['id']
        ib = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Luftfilter {n}', 'initial_qty': '1'})['d']['id']
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/stock'); q.wait_for_selector('#srcpt', timeout=15000); T = q.evaluate(TR)
        check(q.inner_text('#srcpt').strip() == T['rcpt_title'], f'{lang}: Knopf im Lager')
        q.click('#srcpt'); q.wait_for_selector('#rcf', timeout=10000)
        q.fill('#rcsup', f'Teile Nord {n}'); q.fill('#rcdoc', f'LS-{n}')
        q.select_option('#rclines .rcl:nth-child(1) select', ia); q.fill('#rclines .rcl:nth-child(1) .rcp', '7,50' if lang != 'en' else '7.50')
        q.click('#rcbook'); q.wait_for_timeout(400)
        check(q.locator('#rcdone').count() == 0, f'{lang}: ohne Menge nicht gebucht')
        q.fill('#rclines .rcl:nth-child(1) .rcq', '5')
        q.click('#rcadd'); q.select_option('#rclines .rcl:nth-child(2) select', ia); q.fill('#rclines .rcl:nth-child(2) .rcq', '1')
        q.click('#rcbook'); q.wait_for_timeout(400)
        check(q.locator('#rcdone').count() == 0, f'{lang}: doppelter Artikel abgewiesen')
        q.select_option('#rclines .rcl:nth-child(2) select', ib); q.fill('#rclines .rcl:nth-child(2) .rcq', '4')
        check(T['rcpt_count'].replace('{n}', '2') in q.inner_text('#rcsum'), f'{lang}: Zähler Positionen')
        check(q.evaluate(noscroll), f'{lang}: Formular ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wareneingang-{lang}-{w}.png', full_page=True)
        q.click('#rcbook'); q.wait_for_selector('#rcdone', timeout=10000)
        check(T['rcpt_done'].replace('{n}', '2') in q.inner_text('#rcdone'), f'{lang}: gebucht')
        da = wsapi('GET', f'/api/stock/{ia}')['d']; db = wsapi('GET', f'/api/stock/{ib}')['d']
        check(da['item']['on_hand'] == 5 and da['item']['unit_price_net'] == 7.5 and db['item']['on_hand'] == 5, f'{lang}: Bestände und Preis')
        check(da['movements'][0]['document_ref'] == f'LS-{n}' and da['movements'][0]['supplier'] == f'Teile Nord {n}', f'{lang}: Lieferschein/Lieferant je Buchung')
        check(q.locator('#rclines .rcl').count() == 1 and q.input_value('#rcdoc') == '', f'{lang}: Formular geleert')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
