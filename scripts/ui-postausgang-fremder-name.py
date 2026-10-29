# [CLAUDE] UI-Test (18.10.2026, aus der Fehlersuche übernommen) – frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Nachstellung: Postausgang von Fahrer A wird nach Personenwechsel im anderen Tab unter dem Namen von Fahrer B angelegt.
# Ein Gerät (ein Browser-Kontext = ein Cookie), zwei Tabs. Tab 1: A erfasst offline eine Meldung (Postausgang von A).
# Tab 2: A meldet ab, B meldet an. Tab 1 bekommt wieder Netz ('online') -> flushOutbox mit S.me = A, Cookie = B.
# Zusätzlich: Tab 1 (Formular von A noch offen) sendet online -> Meldung unter B.
import asyncio, os, json
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'VIN:WDB96340310777777'

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fe.inhaber', 'display_name': 'FE Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fe.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'FE-XY 1', 'vin': VIN[4:], 'site': 'Dortmund'})
        ids = {}
        for u, n in [('fe.fahrer.a', 'Fahrer Anna'), ('fe.fahrer.b', 'Fahrer Bernd')]:
            r = await api('POST', '/api/users', {'username': u, 'display_name': n, 'role': 'driver', 'environment': 'production'})
            if r['s'] == 201:
                tmp = await (await br.new_context()).new_page(); await tmp.goto(B)
                await tmp.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); await tmp.context.close()

        dev = await br.new_context(viewport={'width': 390, 'height': 844})   # gemeinsames Gerät
        t1 = await dev.new_page(); await t1.goto(B)
        await t1.evaluate(JS, ['POST', '/api/login', {'username': 'fe.fahrer.a', 'password': PW}])
        # Tab 3: zweites Formular von Anna bleibt offen (vor dem Postausgang geöffnet)
        t3 = await dev.new_page(); await t3.goto(B + '/#/new'); await t3.wait_for_selector('#d')
        await t3.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await t3.fill('#d', 'Meldung von ANNA (Formular offen gelassen)')
        await t1.goto(B + '/#/new'); await t1.wait_for_selector('#d')
        await t1.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await t1.fill('#d', 'Meldung von ANNA (offline erfasst)')
        async def ab(route): await route.abort()
        await t1.route('**/api/**', ab); await t1.click('#sb'); await t1.wait_for_selector('.panel.alert')
        print('Tab 1 (Anna): Postausgang-Schluessel:', await t1.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('cfp_outbox_'))"))
        # Tab 2: Personenwechsel
        t2 = await dev.new_page(); await t2.goto(B)
        await t2.evaluate(JS, ['POST', '/api/logout', {}])
        print('Tab 2: Bernd angemeldet:', (await t2.evaluate(JS, ['POST', '/api/login', {'username': 'fe.fahrer.b', 'password': PW}]))['s'])
        # Tab 1: Netz wieder da
        await t1.unroute('**/api/**', ab)
        await t1.evaluate("window.dispatchEvent(new Event('online'))"); await t1.wait_for_timeout(2500)
        # Tab 3 kann inzwischen neu geladen sein (Abmelden/Anmelden im anderen Tab, Backlog „Anmeldung über Tabs hinweg“ 21.10.2026) und
        # steht dann auf der Anmeldeseite bzw. im Formular der neuen Person – beides zulässig; nur ein noch offenes Formular von Anna senden.
        # (29.10.2026: je nach Zeitpunkt der Abmeldung lag Tab 3 auf der Anmeldeseite – Skript wartete 30 s auf „#sb“ und war rot)
        await t3.wait_for_timeout(1000)
        if await t3.locator('#sb').count() and 'ANNA' in (await t3.input_value('#d') if await t3.locator('#d').count() else ''):
            await t3.click('#sb'); await t3.wait_for_timeout(2500)
        else:
            print('Tab 3: neu geladen (', t3.url.split('#')[-1], ') – Formular von Anna nicht mehr offen')
        cases = (await api('GET', '/api/cases?f=all'))['d']['cases']
        bad = False
        for c in cases:
            if 'ANNA' in c['description']:
                d = (await api('GET', f"/api/cases/{c['id']}"))['d']['case']
                who = {u['id']: u['display_name'] for u in (await api('GET', '/api/users'))['d']['users']}.get(d.get('reporter_id'), d.get('reporter_id'))
                print(f"  {c['case_no']}: '{c['description']}' -> gemeldet von: {who}")
                if 'Bernd' in str(who): bad = True
        _r('FEHLER: Meldungen von Anna unter Bernds Namen angelegt' if bad else 'ok')
        await br.close()

asyncio.run(main())
