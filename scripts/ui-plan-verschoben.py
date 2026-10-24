# [CLAUDE] UI-Test (24.10.2026, Blickwinkel „Termin verpasst“): HU-Auftrag zweimal verschoben, zuletzt hinter das Fristende →
# Werkstattplan zeigt „2× verschoben“ und „Termin … liegt nach dem Fristende (Frist)“ (Grund-Feld nur bei überfälligen Terminen – API-Test).
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MOVED = {'de': '2× verschoben', 'uk': 'перенесено 2 рази', 'en': 'rescheduled 2 times'}
LATE = {'de': 'liegt nach dem Fristende', 'uk': 'пізніша за кінцевий термін', 'en': 'is after the deadline'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def plus(d, n): return (datetime.date.fromisoformat(d) + datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pv.inhaber', 'display_name': 'PV Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'pv.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    me = api('GET', '/api/me')['d']; env = me['active_environment']; pid = os.getpid()
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    hu_last = f'{int(today[:4]) - 1}{today[4:8]}01'
    wu = api('POST', '/api/users', {'username': f'pv.ws{pid}', 'display_name': 'PV Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    wctx = br.new_context(); wp = wctx.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/invite/accept', {'token': wu['d']['invite_token'], 'password': PW}])
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB9634031027{pid % 1000:03d}{i}'[:17].ljust(17, '0'); VID = 'VIN:' + vin; plate = f'PV-VS 24{i}'
        check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        api('POST', f'/api/vehicles/{VID}/spec', {'zgm_class': 'ueber_12', 'spec_source': 'UI-Test: Fahrzeugschein F.2'})
        rule = api('POST', f'/api/vehicles/{VID}/maintenance', {'kind': 'HU', 'last_done_date': hu_last, 'interval_months': 12, 'evidence': 'UI-Test Prüfbericht'})
        check(rule['s'] == 201, f'{lang}: HU-Nachweis')
        o = api('POST', f"/api/maintenance/{rule['d']['id']}/order", {'workshop_site': 'DORTMUND', 'note': 'HU', 'request_key': f'pv-{pid}-{i}'})
        check(o['s'] == 201, f'{lang}: Auftrag aus HU {o["s"]}'); cid = o['d']['id']
        due = [r for r in api('GET', '/api/maintenance')['d']['rows'] if r['id'] == rule['d']['id']][0]['next_due_date']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        wp.evaluate(JS, ['POST', f'/api/cases/{cid}/commands', {'action': 'acknowledge', 'command_id': f'pva{pid}{i}', 'expected_version': ver()}])
        for k, d in enumerate([today, plus(due, 1), plus(due, 2)]):
            api('POST', f'/api/cases/{cid}/commands', {'action': 'set_planned_date', 'command_id': f'pv{pid}{i}{k}', 'expected_version': ver(), 'payload': {'planned_date': d}, **({'note': 'Fahrzeug nicht erschienen'} if k == 2 else {})})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'pv.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/plan'); q.wait_for_selector(f'a.row[href="#/cases/{cid}"]')
        item = q.locator(f'a.row[href="#/cases/{cid}"]').first
        txt = item.inner_text()
        check(MOVED[lang] in txt, f'{lang}: Chip Verschiebungen: {txt[:200]!r}')
        check(LATE[lang] in txt, f'{lang}: Hinweis Termin nach Fristende')
        evs = api('GET', f'/api/cases/{cid}')['d']['events']
        check(any(e['action'] == 'set_planned_date' and e.get('note') == 'Fahrzeug nicht erschienen' for e in evs), f'{lang}: Grund im Verlauf')
        if SHOTS: item.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plan-verschoben-{lang}-{w}.png', full_page=False)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
