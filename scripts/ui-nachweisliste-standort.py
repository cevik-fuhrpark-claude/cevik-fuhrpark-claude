# [CLAUDE] UI-Test (06.11.2026, Backlog 1059, Blickwinkel „Leitung Bayern zieht vor der HU-Woche die Nachweisliste des eigenen Standorts“):
# Prüftermine → Standort wählen → „Durchgeführte Prüfungen“ zeigt nur Durchführungen dieses Standorts (vorher: ganze Flotte trotz Auswahl)
# und einen Hinweis „Nur Standort …“. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ns.inhaber', 'display_name': 'NS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    user = None
    for un in ['ns.inhaber', 'hm.inhaber', 'hs.inhaber', 'nf.inhaber', 'tz.inhaber', 'nw.inhaber', 'nb.inhaber', 'au.inhaber', 'ab.inhaber', 'ws.inhaber', 'ft.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: user = un; break
    check(user is not None, 'Anmeldung Inhaber')
    today = datetime.date.today(); d0 = (today - datetime.timedelta(days=10)).isoformat()
    pid = os.getpid() % 900 + 100
    plates = {}
    for site, n in [('Dortmund', 1), ('Bayern', 2)]:
        vin = f'WDB96340320{pid:03d}{n:03d}'; vid = 'VIN:' + vin; plates[site] = f'NS-B {pid}{n}'
        api('POST', '/api/vehicles', {'plate': plates[site], 'vin': vin, 'site': site})
        r = api('POST', f'/api/vehicles/{vid}/husp/HU/complete', {'done_date': d0, 'evidence': f'HU-Bericht {site} UI', 'result': 'ohne_maengel'})
        check(r['s'] == 200, f'HU {site} erfasst {r["s"]}')
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
            m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}])
            m.goto(B + '/#/maintenance'); m.reload()
            m.wait_for_selector('#msite', timeout=15000)
            T = m.evaluate("async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }")
            opt = m.evaluate("() => [...document.querySelectorAll('#msite option')].map((o) => o.value).find((v) => v.toLowerCase() === 'bayern')")
            check(bool(opt), f'{lang} {w}px: Standort Bayern wählbar')
            m.select_option('#msite', opt); m.wait_for_function("() => document.querySelector('#msite') && document.querySelector('#msite').value.toLowerCase() === 'bayern'", timeout=15000)
            m.locator('#mhist > summary').click()
            m.fill('#mhf input[name=from]', d0); m.fill('#mhf input[name=to]', today.isoformat())
            m.locator('#mhf button:not([type=button])').click()
            m.wait_for_selector('#mhres [data-mhsite]', timeout=15000)
            res = m.inner_text('#mhres')
            check(plates['Bayern'] in res, f'{lang} {w}px: Bayern-Fahrzeug in der Nachweisliste')
            check(plates['Dortmund'] not in res, f'{lang} {w}px: Dortmunder Fahrzeug nicht in der Nachweisliste')
            check(T['mh_site'].split('{s}')[0].strip() in m.inner_text('#mhres [data-mhsite]'), f'{lang} {w}px: Hinweis „nur Standort“')
            check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
            check(not errs, f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
            if SHOTS: m.locator('#mhres').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/nachweis_standort_{lang}_{w}.png')
            ctx.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
