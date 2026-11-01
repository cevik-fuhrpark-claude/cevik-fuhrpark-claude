# [CLAUDE] UI-Test (01.11.2026, Backlog 813, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig – Werkstattplan“):
# Leitung A wählt im Werkstattplan ein Datum für einen Auftrag ohne Termin; inzwischen schreibt Leitung B eine Rückfrage an den Vorgang
# (Version steigt). A klickt „Termin setzen“. Vorher: Meldung „Bitte neu laden“, obwohl der Plan schon neu geladen war. Jetzt: Hinweis
# „Ihre Eingaben stehen noch im Formular“, das gewählte Datum steht noch im Feld, zweiter Klick speichert. DE 390 / UK 820 / EN 1366 px.
import os, datetime, random
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT = {'de': 'Ihre Eingaben stehen noch im Formular', 'uk': 'ваші дані залишилися у формі', 'en': ''}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
R = random.randint(100, 999)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pg.inhaber', 'display_name': 'PG Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'pg.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    today = datetime.datetime.now(datetime.timezone.utc).date().isoformat(); hu_last = f'{int(today[:4]) - 1}{today[4:8]}01'
    wu = api('POST', '/api/users', {'username': f'pg.ws{R}', 'display_name': 'PG Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    wp = br.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/invite/accept', {'token': wu['d']['invite_token'], 'password': PW}])
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = f'WDB9634031{R}PG{i}'.ljust(17, '0')[:17]; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'PG-G {R}{i}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        api('POST', f'/api/vehicles/{VID}/spec', {'zgm_class': 'ueber_12', 'spec_source': 'UI-Test: Fahrzeugschein F.2'})
        rule = api('POST', f'/api/vehicles/{VID}/maintenance', {'kind': 'HU', 'last_done_date': hu_last, 'interval_months': 12, 'evidence': 'UI-Test Prüfbericht'})
        o = api('POST', f"/api/maintenance/{rule['d']['id']}/order", {'workshop_site': 'DORTMUND', 'note': 'HU', 'request_key': f'pg-{R}-{i}'})
        check(o['s'] == 201, f'{lang}: Auftrag aus HU'); cid = o['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        check(wp.evaluate(JS, ['POST', f'/api/cases/{cid}/commands', {'action': 'acknowledge', 'command_id': f'pgk{R}{i}', 'expected_version': ver()}])['s'] == 200, f'{lang}: Werkstatt übernimmt')
        ctx = br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'pg.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/plan'); q.reload(); q.wait_for_selector(f'#pd-{cid}', state='attached', timeout=20000)
        q.evaluate(f"() => {{ const d = document.querySelector('#pd-{cid}').closest('details'); if (d) d.open = true; }}")
        r = api('POST', f'/api/cases/{cid}/commands', {'action': 'comment', 'command_id': f'pgc{R}{i}', 'expected_version': ver(), 'note': 'Rückfrage der anderen Leitung'})
        check(r['s'] == 200, f'{lang}: Leitung B schreibt Rückfrage')
        d = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        q.fill(f'#pd-{cid}', d); q.click(f'[data-pset="{cid}"]')
        q.wait_for_function("() => [...document.querySelectorAll('#toast, .toast')].some((x) => x.textContent.trim())", timeout=15000); q.wait_for_timeout(800)
        tt = ' '.join(q.locator('#toast, .toast').all_inner_texts())
        exp = KEPT[lang] or 'still in the form'
        check(exp in tt and 'reload' not in tt.lower() and 'neu laden' not in tt, f'{lang}: Hinweis „Eingaben stehen noch im Formular“: {tt[:160]!r}')
        check(q.input_value(f'#pd-{cid}') == d, f'{lang}: gewähltes Datum steht noch im Feld')
        check(not api('GET', f'/api/cases/{cid}')['d']['case'].get('planned_date'), f'{lang}: noch nichts gespeichert')
        check(q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth') <= 0, f'{lang}: kein Querscrollen')
        if SHOTS: q.locator(f'#pd-{cid}').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plan-gleichzeitig-{lang}-{w}.png')
        q.click(f'[data-pset="{cid}"]')
        pd = None
        for _ in range(40):
            q.wait_for_timeout(250); pd = api('GET', f'/api/cases/{cid}')['d']['case'].get('planned_date')
            if pd: break
        check(pd == d, f'{lang}: zweiter Klick speichert den Termin ({pd})')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
