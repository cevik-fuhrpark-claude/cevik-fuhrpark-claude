# [CLAUDE] UI-Test (27.10.2026, Backlog 439, Blickwinkel „Rechnung der Fremdfirma kommt per Post – zu welchem Vorgang gehört sie?“):
# Leitung tippt in „Vorgänge“ die Rechnungsnummer der Fremdleistung (andere Schreibweise) und findet den Vorgang, ebenso in der Suche (Lupe)
# über den Lieferanten; Werkstatt findet ihn über die Teilenummer, Suchfeld nennt je Rolle, wonach gesucht wird. DE 390, UK 820, EN 1366;
# kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sr.inhaber', 'display_name': 'SR Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'sr.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'SR Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:5]; inv = f'KVA-{n}-77'; sup = f'Achsvermessung Müller {n}'; pn = f'81.{n}-6195'
        vin = 'WDB9634031C' + str(uuid.uuid4().int)[:6]
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'SR-A {n[:3]}', 'site': 'Dortmund'})['s'] in (200, 201), f'{lang}: Fahrzeug')
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Reifen innen einseitig abgefahren', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        cmd = lambda f, action, payload={}, note=None: f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': payload, **({'note': note} if note else {})})
        check(cmd(api, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Achsvermessung bei Fremdfirma')['s'] == 200, f'{lang}: freigegeben')
        check(cmd(api, 'add_external_cost', {'supplier': sup, 'invoice_no': inv, 'amount_net': '180,00', 'valuation': 'estimate'})['s'] == 200, f'{lang}: Fremdleistung')
        check(cmd(wsapi, 'acknowledge')['s'] == 200 and cmd(wsapi, 'start_repair')['s'] == 200, f'{lang}: Werkstatt übernimmt')
        check(cmd(wsapi, 'add_part', {'name': 'Spurstangenkopf', 'part_number': pn, 'quantity': 1})['s'] == 200, f'{lang}: Teil')
        cno = api('GET', f'/api/cases/{cid}')['d']['case']['case_no']
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases'); q.wait_for_selector('#cq', timeout=15000); T = q.evaluate(TR)
        check(q.get_attribute('#cq', 'placeholder') == T['case_search_mgr'], f'{lang}: Suchfeld Leitung nennt Rechnungs-/Teilenr.')
        q.fill('#cq', 'zzz-kein-treffer'); q.wait_for_timeout(1000); q.fill('#cq', inv.lower()); q.wait_for_selector(f'#cl a.row[href="#/cases/{cid}"]', timeout=10000); q.wait_for_timeout(300)
        check(q.locator('#cl a.row').count() == 1, f'{lang}: Rechnungsnummer (klein) findet genau den Vorgang')
        check(q.evaluate(noscroll), f'{lang}: Liste ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/suche-rechnung-{lang}-{w}.png')
        q.goto(B + '/#/search'); q.wait_for_selector('#gq', timeout=15000); q.fill('#gq', sup.upper())
        q.wait_for_selector(f'#gr a[href="#/cases/{cid}"]', timeout=10000)
        check(cno in q.inner_text('#gr'), f'{lang}: Suche (Lupe) findet den Vorgang über den Lieferanten')
        q.fill('#gq', 'x'); q.wait_for_timeout(500)
        check(T['search_hint'] in q.inner_text('#gr'), f'{lang}: Suchhinweis')
        check(not errs, f'{lang}: keine Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
        # Werkstatt: Teilenummer
        q0.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases'); q.wait_for_selector('#cq', timeout=15000); T = q.evaluate(TR)
        check(q.get_attribute('#cq', 'placeholder') == T['case_search_ws'], f'{lang}: Suchfeld Werkstatt nennt Teilenummer')
        q.fill('#cq', 'zzz-kein-treffer'); q.wait_for_timeout(1000); q.fill('#cq', pn); q.wait_for_selector(f'#cl a.row[href="#/cases/{cid}"]', timeout=10000)
        check(q.locator('#cl a.row').count() == 1, f'{lang}: Werkstatt findet den Auftrag über die Teilenummer')
        q.fill('#cq', inv); q.wait_for_timeout(1200)
        check(q.locator(f'#cl a.row[href="#/cases/{cid}"]').count() == 0, f'{lang}: Werkstatt findet nichts über die Rechnungsnummer (Kosten nur Leitung)')
        check(q.evaluate(noscroll), f'{lang}: Werkstatt ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler (Werkstatt) {errs[:1]}'); ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
