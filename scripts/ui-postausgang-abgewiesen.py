# [CLAUDE] UI-Test: vom Server abgewiesene Einträge im Offline-Postausgang (17.10.2026) – bleiben als „nicht gesendet“ sichtbar
# (Text, Grund, Erneut senden, Verwerfen) statt still verworfen zu werden; offline gespeicherte Abfahrtskontrolle sendet den
# Durchführungszeitpunkt mit. DE/UK/EN, Handy 390, Tablet 820, PC 1366. Frischer Dev-Server nötig (CFP_URL, Standard 8787).
import asyncio, os, json
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
OUT = os.environ.get('CFP_SHOTS', '/tmp/cfp-shots'); os.makedirs(OUT, exist_ok=True)
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'VIN:WDB96340310777002'
WORDS = {'de': ('nicht gesendet', 'Erneut senden', 'Verwerfen'), 'uk': ('не надіслано', 'Надіслати ще раз', 'Видалити'), 'en': ('not sent', 'Send again', 'Discard')}
bad = []

async def outbox(q):
    return await q.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('cfp_outbox_')).flatMap(k => JSON.parse(localStorage.getItem(k)))")

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); a = await br.new_page(); await a.goto(B)
        api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pb.inhaber', 'display_name': 'PB Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'pb.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'PB-AB 2', 'vin': VIN[4:], 'site': 'Dortmund'})
        for lang, (w_head, w_retry, w_del) in WORDS.items():
            for wd in (390, 820, 1366):
                ctx = await br.new_context(viewport={'width': wd, 'height': 900}); q = await ctx.new_page()
                errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
                await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'pb.inhaber', 'password': PW}])
                await q.evaluate(f"localStorage.setItem('cfp_lang','{lang}')")
                await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
                # 1. Meldung offline speichern
                await q.goto(B + '/#/new'); await q.wait_for_selector('#d')
                await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d', f'Spiegel rechts lose ({lang} {wd})')
                async def off(route): await route.abort()
                await q.route('**/api/**', off); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', off)
                # 2. Server weist beim Nachsenden ab (400) → Eintrag bleibt als „nicht gesendet“
                async def reject(route):
                    if route.request.method == 'POST': await route.fulfill(status=400, content_type='application/json', body=json.dumps({'error': 'validation', 'message': 'Fahrzeug ist außer Betrieb.'}))
                    else: await route.continue_()
                await q.route('**/api/cases', reject)
                await q.goto(B + '/#/'); await q.wait_for_timeout(300)
                await q.evaluate("window.dispatchEvent(new Event('online'))"); await q.wait_for_selector('#outbox_failed', timeout=5000)
                ob = await outbox(q)
                txt = await q.inner_text('#outbox_failed')
                if not (len(ob) == 1 and ob[0].get('failed')): bad.append(f'{lang}/{wd}: Eintrag nicht als abgewiesen behalten {ob}')
                for w in (w_head, w_retry, w_del, 'PB-AB 2'):
                    if w.lower() not in txt.lower(): bad.append(f'{lang}/{wd}: „{w}“ fehlt')
                if 'Spiegel rechts lose' not in await q.input_value('#outbox_failed textarea'): bad.append(f'{lang}/{wd}: Text fehlt')
                sw = await q.evaluate('document.documentElement.scrollWidth')
                if sw > wd: bad.append(f'{lang}/{wd}: horizontal scroll {sw}')
                await q.screenshot(path=f'{OUT}/postausgang-abgewiesen-{lang}-{wd}.png', full_page=True)
                # 3. Erneut senden, Server nimmt jetzt an → Vorgang angelegt, Bereich verschwindet
                await q.unroute('**/api/cases', reject)
                if wd == 390:
                    await q.click('[data-obx-retry]'); await q.wait_for_timeout(1500)
                    if await outbox(q): bad.append(f'{lang}/{wd}: nach Erneut senden nicht leer')
                    if await q.locator('#outbox_failed').count(): bad.append(f'{lang}/{wd}: Bereich bleibt')
                else:
                    q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
                    await q.click('[data-obx-del]'); await q.wait_for_timeout(500)
                    if await outbox(q): bad.append(f'{lang}/{wd}: nach Verwerfen nicht leer')
                    if await q.locator('#outbox_area').count(): bad.append(f'{lang}/{wd}: Bereich bleibt nach Verwerfen')
                if errs: bad.append(f'{lang}/{wd}: JS-Fehler {errs}')
                await ctx.close()
        # 4. Abfahrtskontrolle offline: Durchführungszeitpunkt wird mitgesendet
        ctx = await br.new_context(viewport={'width': 390, 'height': 900}); q = await ctx.new_page()
        await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'pb.inhaber', 'password': PW}]); await q.evaluate("localStorage.setItem('cfp_lang','de')")
        await q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        await q.goto(B + '/#/check'); await q.wait_for_selector('.checkitem'); await q.select_option('#v', VIN)
        await q.evaluate("() => document.querySelectorAll('.checkitem').forEach(r => r.querySelector('input[value=ok]').click())")
        async def off2(route): await route.abort()
        await q.route('**/api/**', off2); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', off2)
        saved = (await outbox(q))[0]['saved_at']
        sent = []
        q.on('request', lambda r: sent.append(r.post_data) if r.url.endswith('/api/inspections') and r.method == 'POST' else None)
        await q.goto(B + '/#/'); await q.evaluate("window.dispatchEvent(new Event('online'))"); await q.wait_for_timeout(1500)
        if not sent or json.loads(sent[0]).get('performed_at') != saved: bad.append(f'Kontrolle ohne Durchführungszeitpunkt: {sent[:1]}')
        if await outbox(q): bad.append('Kontrolle nicht gesendet')
        await ctx.close(); await br.close()
    print('FEHLER:\n' + '\n'.join(bad) if bad else 'Postausgang abgewiesen: alles grün')
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
