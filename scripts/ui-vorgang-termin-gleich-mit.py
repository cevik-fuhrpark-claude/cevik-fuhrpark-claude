# [CLAUDE] UI-Test (16.11.2026, Backlog 1519, Folge aus 1518, Blickwinkel „Leitung/Werkstatt legt den Werkstatttermin eines Schadens fest –
# weitere Prüfungen des Fahrzeugs sind bis dahin ebenfalls fällig und haben keinen Termin“): Werkstatt setzt im Vorgang „Termin“ (Tag 10) →
# Hinweis nennt die UVV (Tag 20), nicht die Bremsen (Tag 90); nichts zusätzlich geplant. DE 390 / UK 820 / EN 1366 px; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787);
# Screenshots: CFP_SHOTS=<Ordner>.
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
def iso(d): return (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=d)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vg.inhaber', 'display_name': 'VG Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['vg.inhaber', 'gm.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber', 'hm.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'vg.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'VG Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = 'WDB9634031C' + str(uuid.uuid4().int)[:6]; plate = f'VG-A {str(uuid.uuid4().int)[:3]}'; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] in (200, 201), f'{lang}: Fahrzeug')
        mk = lambda kind, due: api('POST', f'/api/vehicles/{VID}/maintenance', {'kind': kind, 'next_due_date': due, 'evidence': 'Test 1519'})['s']
        check(mk('UVV', iso(20)) == 201 and mk('Bremsen', iso(90)) == 201, f'{lang}: UVV + Bremsen')
        r = api('POST', '/api/cases', {'vehicle_id': VID, 'description': 'Spiegel rechts abgebrochen', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': {'workshop_site': 'DORTMUND'}, 'note': 'Spiegel tauschen'})['s'] == 200, f'{lang}: freigegeben')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        check(q.evaluate(JS, ['POST', f'/api/cases/{cid}/commands', {'action': 'acknowledge', 'command_id': str(uuid.uuid4()), 'expected_version': ver()}])['s'] == 200, f'{lang}: Werkstatt übernimmt')
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('button[data-act="set_planned_date"]', timeout=15000)
        T = q.evaluate(TR)
        q.locator('button[data-act="set_planned_date"]').click(); q.wait_for_selector('#af input[name=planned_date]', timeout=5000)
        q.fill('#af input[name=planned_date]', iso(10))
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('.toast.err', timeout=15000); q.wait_for_timeout(300)
        tt = q.locator('.toast.err').last.inner_text(); pre = T['plan_also_due'].split('{list}')[0][:20]
        check(pre in tt and 'UVV' in tt and iso(20)[8:10] in tt, f'{lang}: Hinweis im Vorgang „{tt[:140]}…“')
        check(T['mk_brakes'] not in tt, f'{lang}: Bremsen (Tag 90) nicht genannt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgang-termin-gleich-mit-{lang}-{w}.png')
        check(q.evaluate(noscroll), f'{lang}: Vorgang ohne Querscrollen')
        check(api('GET', f'/api/cases/{cid}')['d']['case']['planned_date'] == iso(10), f'{lang}: Termin gespeichert')
        rows = api('GET', '/api/maintenance')['d']['rows']
        check(not any(x['vehicle_id'] == VID and x.get('planned_date') for x in rows), f'{lang}: nichts zusätzlich geplant')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
