# [CLAUDE] UI-Test (27.10.2026, Backlog 440, Blickwinkel „Lkw kommt von der Fremdfirma zurück – Standortangabe veraltet?“): Werkstatt trägt
# im Vorgang „Standort / Abschleppung“ ein (Formular); Vorgang, Fahrzeugakte, Werkstattplan und Disposition („Nicht einplanen“) nennen
# „Stand <Zeitpunkt>“; Hilfe Disposition erklärt es. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ss.inhaber', 'display_name': 'SS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['ss.inhaber', 'sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    def mk_user(role, extra={}):
        un = f'ss.{role}.{tag}'
        u = api('POST', '/api/users', {'username': un, 'display_name': 'SS ' + role, 'role': role, 'environment': envname, **extra})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        return un
    dispo = mk_user('dispatch'); wsu = mk_user('workshop', {'workshop_site': 'DORTMUND'})
    wc = br.new_context(); wp = wc.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}])
    day = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=2)).isoformat()
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = 'WDB9634031D' + str(uuid.uuid4().int)[:6]; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'SS-A {str(uuid.uuid4().int)[:3]}', 'site': 'Dortmund'})['s'] in (200, 201), f'{lang}: Fahrzeug')
        r = api('POST', '/api/cases', {'vehicle_id': VID, 'description': 'Lkw zieht nach rechts, Reifen innen abgefahren', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        cmd = lambda f, action, payload={}, note=None: f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': payload, **({'note': note} if note else {})})
        check(cmd(api, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Achsvermessung bei Fremdfirma')['s'] == 200, f'{lang}: freigegeben')
        wsapi = lambda m, pa, b=None: wp.evaluate(JS, [m, pa, b])
        check(cmd(wsapi, 'acknowledge')['s'] == 200, f'{lang}: übernommen')
        check(cmd(wsapi, 'set_planned_date', {'planned_date': day})['s'] == 200, f'{lang}: Termin')
        # Werkstatt trägt den Standort über das Formular ein
        wp.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('button[data-act="set_vehicle_location"]', timeout=15000); T = q.evaluate(TR)
        q.locator('button[data-act="set_vehicle_location"]').click(); q.wait_for_selector('#af input[name=vehicle_location]', timeout=5000)
        q.fill('#af input[name=vehicle_location]', 'Fa. Prüfstand, Industriestr. 5 (Achsvermessung)')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('#vehloc [data-vlat]', timeout=10000)
        check(T['vl_as_of'] in q.inner_text('#vehloc [data-vlat]'), f'{lang}: Vorgang nennt „{T["vl_as_of"]} …“')
        check(q.evaluate(noscroll), f'{lang}: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('#vehloc').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/standort-stand-vorgang-{lang}-{w}.png')
        q.goto(B + '/#/plan'); q.wait_for_selector(f'a.row[href="#/cases/{cid}"] [data-vlat]', timeout=15000)
        check(T['vl_as_of'] in q.locator(f'a.row[href="#/cases/{cid}"] [data-vloc]').first.inner_text(), f'{lang}: Werkstattplan nennt den Stand')
        check(q.evaluate(noscroll), f'{lang}: Plan ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler (Werkstatt) {errs[:1]}'); ctx.close()
        # Leitung: Fahrzeugakte
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/vehicles/' + VID); q.wait_for_selector('#vvehloc [data-vlat]', timeout=15000)
        check('Fa. Prüfstand' in q.inner_text('#vvehloc'), f'{lang}: Fahrzeugakte mit Standort und Stand')
        check(q.evaluate(noscroll), f'{lang}: Akte ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
        # Disposition: „Nicht einplanen“
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': dispo, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector(f'a.row[href="#/cases/{cid}"] [data-vloc] [data-vlat]', timeout=15000)
        check(T['vl_as_of'] in q.locator(f'a.row[href="#/cases/{cid}"] [data-vloc]').first.inner_text(), f'{lang}: Disposition nennt den Stand')
        check(q.evaluate(noscroll), f'{lang}: Dispo ohne Querscrollen')
        if SHOTS: q.locator(f'a.row[href="#/cases/{cid}"] [data-vloc]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/standort-stand-dispo-{lang}-{w}.png')
        q.goto(B + '/#/help?s=dispo'); q.wait_for_timeout(800)
        check(T['vl_as_of'] in q.evaluate('document.body.innerText'), f'{lang}: Hilfe Disposition erklärt „{T["vl_as_of"]}“')
        check(not errs, f'{lang}: keine Skriptfehler (Disposition) {errs[:1]}'); ctx.close()
        # aufräumen: Standort und Termin entfernen
        cmd(wsapi, 'set_vehicle_location', {'vehicle_location': ''}); cmd(wsapi, 'set_planned_date', {'planned_date': None})
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
