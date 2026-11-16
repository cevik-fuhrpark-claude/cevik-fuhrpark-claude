# [CLAUDE] UI-Test (16.11.2026, Backlog 1521, Blickwinkel „Werkstatt verschiebt den UVV-Termin der Zugmaschine – der Feuerlöscher des fest
# gekoppelten Aufliegers war für denselben Tag geplant“): Fahrzeugakte → UVV-Termin von Tag 10 auf Tag 12 verschieben → Hinweis nennt den
# bisherigen Tag und den Feuerlöscher des Aufliegers (mit Kennzeichen); dort nichts mitverschoben. Werkstattkonto, DE 820 / UK 390 / EN 1366 px;
# kein Querscrollen, keine Skriptfehler. Backlog 1522: zusätzlich Werkstattauftrag des Aufliegers am selben Tag → als „Auftrag …“ genannt. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def iso(d): return (datetime.date.today() + datetime.timedelta(days=d)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'gm.inhaber', 'display_name': 'GM Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    if api('POST', '/api/login', {'username': 'gm.inhaber', 'password': PW})['s'] != 200:
        check(any(api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200 for un in ['fk.inhaber', 'tu.inhaber', 'pd.inhaber']), 'Anmeldung Inhaber')
    me = api('GET', '/api/me')['d']; envn = (me.get('user') or me).get('environment') or 'test'
    R = os.getpid() % 100000
    for i, (lang, w, h) in enumerate([('de', 820, 1180), ('uk', 390, 844), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = f'WBT{R:05d}{i:02d}0000000'[:17]; tvin = f'WBU{R:05d}{i:02d}0000000'[:17]; VID = 'VIN:' + vin; TID = 'VIN:' + tvin
        tp = f'BT-AN {R % 900}{i}'
        rr = api('POST', '/api/vehicles', {'plate': tp, 'vin': tvin, 'kind': 'anhaenger', 'site': 'Dortmund'}); check(rr['s'] == 201, f"{lang}: Auflieger{'' if rr['s'] == 201 else ' ' + str(rr)}")
        check(api('POST', '/api/vehicles', {'plate': f'BT-SZ {R % 900}{i}', 'vin': vin, 'site': 'Dortmund', 'trailer_plate': tp})['s'] == 201, f'{lang}: Zugmaschine')
        mk = lambda vid, kind, due: api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': kind, 'next_due_date': due, 'evidence': 'Test 1521'})
        r = mk(VID, 'UVV', iso(60)); check(r['s'] == 201, f'{lang}: UVV'); rid = r['d']['id']
        f = mk(TID, 'Feuerlöscher', iso(60)); check(f['s'] == 201, f'{lang}: Feuerlöscher'); fid = f['d']['id']
        check(api('POST', f'/api/maintenance/{rid}/plan', {'planned_date': iso(10)})['s'] == 200 and api('POST', f'/api/maintenance/{fid}/plan', {'planned_date': iso(10)})['s'] == 200, f'{lang}: beide auf Tag 10 geplant')
        # Backlog 1522: Werkstattauftrag am Auflieger für denselben Tag
        cs = api('POST', '/api/cases', {'vehicle_id': TID, 'description': 'Plane eingerissen', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'workshop_site': 'DORTMUND', 'request_key': f'bt{R}{i}'})
        check(cs['s'] == 201, f'{lang}: Vorgang am Auflieger'); cid = cs['d']['id']
        cv = api('GET', f'/api/cases/{cid}')['d']['case']
        ap = api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'bt{R}{i}a', 'expected_version': cv['version'], 'payload': {'workshop_site': 'DORTMUND', 'planned_date': iso(10)}, 'note': 'Plane'})
        check(ap['s'] == 200, f"{lang}: Auftrag auf Tag 10{'' if ap['s'] == 200 else ' ' + str(ap)}"); cno = cv['case_no']
        un = f'bt.ws{R}.{i}'
        u = api('POST', '/api/users', {'username': un, 'display_name': f'BT Werkstatt {i}', 'role': 'workshop', 'environment': envn, 'language': lang, 'workshop_site': 'DORTMUND'})
        check(u['s'] in (200, 201), f'{lang}: Werkstattkonto')
        ctx = br.new_context(viewport={'width': w, 'height': h}); errs = []
        q = ctx.new_page(); q.on('pageerror', lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        T = q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { a: S.STRINGS[l].plan_left_prev, s: S.STRINGS[l].plan_also_saved, c: S.STRINGS[l].case_no_lbl }; }", lang)
        q.goto(B + '/#/vehicles/' + VID.replace(':', '%3A')); q.reload()
        fm = q.locator(f'form[data-hsplan="{rid}"]'); fm.wait_for(state='attached', timeout=20000)
        fm.locator('xpath=ancestor::details[1]/summary').click()
        fm.locator('input[name=planned_date]').fill(iso(12)); fm.locator('button').click()
        q.wait_for_selector('.toast.err', timeout=15000); q.wait_for_timeout(300)
        tt = q.locator('.toast.err').last.inner_text()
        check(T['s'] in tt and T['a'].split('{d}')[0][:12] in tt and tp in tt, f'{lang}: Hinweis „{tt[:160]}…“')
        check(iso(10)[8:10] in tt, f'{lang}: bisheriger Tag genannt')
        check(T['c'].replace('{no}', cno) in tt, f'{lang}: Werkstattauftrag {cno} genannt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/termin-bisheriger-tag-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), f'{lang}: ohne Querscrollen')
        rows = api('GET', '/api/maintenance')['d']['rows']
        check(any(x['id'] == rid and x.get('planned_date') == iso(12) for x in rows), f'{lang}: Termin verschoben')
        check(any(x['id'] == fid and x.get('planned_date') == iso(10) for x in rows), f'{lang}: Feuerlöscher nicht mitverschoben')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
