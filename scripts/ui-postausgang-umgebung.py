# [CLAUDE] UI-Test (19.10.2026) – Offline-Postausgang:
# 1. Konto inzwischen Test → Betrieb umgestellt: Eintrag aus „Test“ wird nicht gesendet, bleibt sichtbar (Grund, Text, nur Verwerfen) – UK 390 px.
# 2. Werkstatt: nach dem Anmelden ohne Netz „Schaden melden“ möglich (Fahrzeugliste vorgehalten), Bestätigung mit Postausgang-Bereich.
import asyncio, os
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'VIN:WDB96340310777031'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
async def outbox(q):
    return await q.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('cfp_outbox_')).flatMap(k => JSON.parse(localStorage.getItem(k)))")
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); a = await br.new_page(); await a.goto(B)
        api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pu.inhaber', 'display_name': 'PU Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'pu.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'PU-AB 31', 'vin': VIN[4:], 'site': 'Dortmund'})
        site = (await api('GET', '/api/meta'))['d']['workshops'][0]['code']
        pid = os.getpid() % 100000
        # 1. Fahrer in Test, Meldung offline, dann Betrieb
        u = await api('POST', '/api/users', {'username': f'pu.fahrer{pid}', 'display_name': 'PU Fahrer', 'role': 'driver', 'environment': 'test'})
        await api("POST", f"/api/vehicles/{VIN}/drivers", {"user_id": u["d"]["id"]})
        ctx = await br.new_context(viewport={'width': 390, 'height': 900}); q = await ctx.new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        await q.evaluate(JS, ['POST', '/api/login', {'username': f'pu.fahrer{pid}', 'password': PW}]); await q.evaluate(JS, ['PATCH', '/api/me', {'language': 'uk'}])
        await q.goto(B + '/#/new'); await q.wait_for_selector('#d')
        await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d', 'Дзеркало праве хитається (тест)')
        async def off(route): await route.abort()
        await q.route('**/api/**', off); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', off)
        check(await q.locator('#outbox_slot').count() == 1, 'Bestätigung hat Postausgang-Bereich')
        r = await api('PATCH', f"/api/users/{u['d']['id']}", {'environment': 'production'})
        check(r['s'] == 200, 'Konto auf Betrieb umgestellt')
        await q.evaluate(JS, ['POST', '/api/login', {'username': f'pu.fahrer{pid}', 'password': PW}])
        await q.goto(B + '/#/'); await q.reload(); await q.wait_for_timeout(2000)
        if not await q.locator('#outbox_failed').count():
            print('DBG', await q.evaluate("() => Object.keys(localStorage)"), (await q.evaluate(JS, ['GET', '/api/me', None]))['d'].get('user', {}).get('environment'), (await q.inner_text('body'))[:400])
        await q.wait_for_selector('#outbox_failed', timeout=8000)
        txt = await q.inner_text('#outbox_failed')
        check('іншому середовищі' in txt or 'інше середовище' in txt, 'Grund „Umgebung geändert“ (UK)')
        check(await q.locator('[data-obx-retry]').count() == 0 and await q.locator('[data-obx-del-env]').count() == 1, 'nur Verwerfen')
        check('PU-AB 31' in txt, 'Kennzeichen statt FIN')
        cases = (await q.evaluate(JS, ['GET', '/api/cases', None]))['d']['cases']
        check(not any('Дзеркало' in (c.get('description') or '') for c in cases), 'nichts im Betrieb angelegt')
        q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await q.click('[data-obx-del-env]'); await q.wait_for_timeout(500)
        check(len(await outbox(q)) == 0 and await q.locator('#outbox_failed').count() == 0, 'verworfen, Bereich weg')
        await ctx.close()
        # 2. Werkstatt offline nach dem Anmelden
        w = await api('POST', '/api/users', {'username': f'pu.ws{pid}', 'display_name': 'PU WS', 'role': 'workshop', 'environment': 'test', 'workshop_site': site})
        ctx = await br.new_context(viewport={'width': 390, 'height': 900}); q = await ctx.new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': w['d']['invite_token'], 'password': PW}])
        await q.evaluate(JS, ['POST', '/api/login', {'username': f'pu.ws{pid}', 'password': PW}]); await q.evaluate(JS, ['PATCH', '/api/me', {'language': 'en'}])
        await q.goto(B + '/#/'); await q.wait_for_timeout(1500)
        await q.route('**/api/**', off)
        await q.goto(B + '/#/new'); await q.wait_for_timeout(1500)
        check(await q.locator('#d').count() == 1 and await q.locator(f'input[name=veh][value="{VIN}"]').count() == 1, 'Werkstatt offline: Meldeformular mit Fahrzeug')
        await br.close()
asyncio.run(main())
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
