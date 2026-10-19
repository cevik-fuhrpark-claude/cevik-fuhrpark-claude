# [CLAUDE] UI-Test (18.10.2026, aus der Fehlersuche übernommen) – frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Nachstellung: Inhaber erfasst im Funkloch in der Ansicht „Test“ eine Meldung, wechselt (noch ohne Netz) auf „Betrieb“;
# beim Nachsenden wird die Meldung in BETRIEB angelegt (Postausgang merkt sich die Umgebung nicht; Schlüssel nutzt S.me.environment,
# gesendet wird mit der aktuellen Ansicht x-cfp-env). Vorhandener Test scripts/ui-postausgang.py Teil 4 sendet vor dem Wechsel und sieht das nicht.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body, env]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (env) h['x-cfp-env'] = env;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'VIN:WDB96340310775555'
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None, env=None: adm.evaluate(JS, [m, pa, b, env])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fe.inhaber', 'display_name': 'FE Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fe.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'FE-UM 5', 'vin': VIN[4:], 'site': 'Dortmund'})
        q = await (await br.new_context()).new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/login', {'username': 'fe.inhaber', 'password': PW}, None])
        await q.evaluate("localStorage.setItem('cfp_env','test')")
        await q.goto(B + '/#/new'); await q.wait_for_selector('#d')
        await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d', 'SCHULUNG – nur Testumgebung')
        async def ab(route): await route.abort()
        await q.route('**/api/**', ab); await q.click('#sb'); await q.wait_for_selector('.panel.alert')
        await q.goto(B + '/#/more'); await q.wait_for_selector('#envsel'); await q.select_option('#envsel', 'production'); await q.wait_for_timeout(800)
        await q.unroute('**/api/**', ab)
        await q.evaluate("window.dispatchEvent(new Event('online'))"); await q.wait_for_timeout(2500)
        inT = [c['case_no'] for c in (await api('GET', '/api/cases?f=all', None, 'test'))['d']['cases'] if 'SCHULUNG' in c['description']]
        inP = [c['case_no'] for c in (await api('GET', '/api/cases?f=all', None, 'production'))['d']['cases'] if 'SCHULUNG' in c['description']]
        print('in Test:', inT, '| in Betrieb:', inP)
        _r('FEHLER: Test-Meldung im Betrieb angelegt' if inP else 'ok')
        await br.close()
asyncio.run(main())
