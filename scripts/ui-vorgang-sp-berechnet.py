# [CLAUDE] UI-Test (21.10.2026) – Vorgang nennt eine überfällige, nur berechnete SP (HU belegt, kein SP-Eintrag) unter „Fahrzeug-Info“ → „Prüfungen fällig“;
# Box ist offen (überfällig). Zusätzlich: automatischer Nachweistext in der Prüftermin-Liste übersetzt.
# DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EV = {'de': 'Frist nach StVZO Anlage VIII berechnet', 'uk': 'Строк розраховано за StVZO', 'en': 'Due date calculated per StVZO Annex VIII'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vs.inhaber', 'display_name': 'VS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'vs.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    today = datetime.date.today(); t = today.year * 12 + today.month - 1 - 8
    hu = f'{t // 12}-{t % 12 + 1:02d}-10'
    pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340312{pid:03d}{i:03d}'; vid = 'VIN:' + vin; plate = f'VS-P {pid}{i}'
        api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})
        api('POST', f'/api/vehicles/{vid}/spec', {'zgm_class': 'ueber_12', 'first_registration': '2020-01-10', 'spec_source': 'UI-Test F.2'})
        check(api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'HU', 'last_done_date': hu, 'evidence': 'Prüfbericht UI-Test'})['s'] == 201, f'{lang}: HU angelegt')
        cs = api('POST', '/api/cases', {'vehicle_id': vid, 'description': 'Spiegel lose', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'workshop_site': 'DORTMUND', 'request_key': f'vs-{pid}-{i}'})
        check(cs['s'] == 201, f'{lang}: Vorgang angelegt')
        d = api('GET', f"/api/cases/{cs['d']['id']}")['d']['vehicle_info']['inspections_due']
        check(any(x['kind'] == 'SP' and x.get('computed') for x in d), f'{lang}: Server liefert berechnete SP')
        api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); q.goto(B)
        q.evaluate(JS, ['POST', '/api/login', {'username': 'vs.inhaber', 'password': PW}])
        q.goto(B + '/#/cases/' + cs['d']['id']); q.wait_for_selector('details.vinfo', timeout=10000)
        vi = q.locator('details.vinfo')
        check(vi.get_attribute('open') is not None, f'{lang}: Fahrzeug-Info offen (überfällig)')
        txt = vi.inner_text()
        check('SP' in txt, f'{lang}: SP in „Prüfungen fällig“ ({txt.strip()[:80]!r})')
        sb = q.evaluate("() => document.documentElement.scrollWidth > window.innerWidth + 1")
        check(not sb, f'{lang}: kein waagerechtes Scrollen')
        if SHOTS: vi.screenshot(path=f'{SHOTS}/vorgang-sp-{lang}-{w}.png')
        # automatischer Nachweistext (Termin aus der Akte planen legt den Eintrag mit festem Text an) → Liste in der App-Sprache
        pl = api('POST', f'/api/vehicles/{vid}/husp/SP/plan', {'planned_date': (today + datetime.timedelta(days=7)).isoformat()})
        check(pl['s'] == 200, f'{lang}: SP-Termin geplant ({pl["s"]} {str(pl["d"])[:80]})')
        q.goto(B + '/#/maintenance'); q.wait_for_selector(f'text={plate}', timeout=10000)
        body = q.locator('main').inner_text() if q.locator('main').count() else q.inner_text('body')
        check(EV[lang] in body and (lang == 'de' or EV['de'] not in body), f'{lang}: Nachweistext übersetzt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgang-sp-liste-{lang}-{w}.png')
        c.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
