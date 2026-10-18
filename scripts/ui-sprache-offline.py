# [CLAUDE] UI-Test (18.10.2026, aus der Fehlersuche übernommen) – frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Nachstellung: Sprache im Funkloch (Offline-Start) unter "Mein Konto" umgestellt -> PATCH /api/me scheitert still,
# beim nächsten Start mit Netz setzt /api/me die alte Sprache zurück (Wahl geht verloren, kein Nachsenden).
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fe.inhaber', 'display_name': 'FE Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fe.inhaber', 'password': PW})
        r = await api('POST', '/api/users', {'username': 'fe.sp.fahrer', 'display_name': 'Fahrer Sprache', 'role': 'driver', 'environment': 'production'})
        q = await (await br.new_context()).new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}])
        await q.goto(B + '/#/'); await q.wait_for_timeout(1500)                 # online: Offline-Sitzung wird gespeichert
        async def ab(route): await route.abort()
        await q.route('**/api/**', ab)
        await q.reload(); await q.wait_for_timeout(1500)                          # Offline-Start
        await q.goto(B + '/#/more'); await q.wait_for_selector('#lang')
        await q.select_option('#lang', 'uk'); await q.wait_for_timeout(1000)
        print('offline umgestellt, html lang =', await q.evaluate('document.documentElement.lang'))
        await q.unroute('**/api/**', ab)
        await q.reload(); await q.wait_for_timeout(2000)                          # Netz wieder da, App-Start
        lang = await q.evaluate('document.documentElement.lang')
        srv = (await q.evaluate(JS, ['GET', '/api/me']))['d']['user']['language']
        print('nach Start mit Netz: html lang =', lang, '| Server-Sprache =', srv)
        _r('FEHLER: offline gewählte Sprache geht verloren' if lang != 'uk' else 'ok')
        await br.close()

asyncio.run(main())
