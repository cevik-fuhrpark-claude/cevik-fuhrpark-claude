# [CLAUDE] UI-Test (31.10.2026, Backlog 804, Blickwinkel „Funkloch“): Hinweis zum Fahrzeug und Kilometerstand ohne Antwort.
# Vorher hatten beide Formulare der Fahrzeugakte kein Zeitlimit – blieb die Antwort aus (Anfrage kam an, Antwort nicht), blieb „Speichern“
# ohne Ende gesperrt; ein zweiter Versuch hätte beim Hinweis einen doppelten Eintrag angelegt. Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS,
# im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei, Eingaben bleiben; erneut speichern legt keinen zweiten Hinweis/Kilometerstand an
# (Hinweis: derselbe request_key; Kilometerstand: gleicher Stand am selben Tag = duplicate). DE 390 / UK 820 / EN 1366 px.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
FAST = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout;
  window.setTimeout = (f, ms, ...a) => st(f, (ms === 60000 && /app-main\\.js/.test(new Error().stack || '')) ? 1500 : ms, ...a); })();"""
NOCONN = {'de': 'Keine Verbindung', 'uk': 'Немає з’єднання', 'en': 'No connection'}
VIN = 'WDB96340310804001'; VID = 'VIN:' + VIN

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hk.inhaber', 'display_name': 'HK Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'hk.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        await api('POST', '/api/vehicles', {'plate': 'HK-UI 804', 'vin': VIN, 'site': 'Dortmund'})
        base_km = 400000
        for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
            base_km += 1000
            await api('PATCH', '/api/me', {'language': lang})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'hk.inhaber', 'password': PW}])
            hold = asyncio.Event(); seen = []
            async def lost_answer(route):
                if route.request.method != 'POST': await route.continue_(); return
                resp = await route.fetch(); seen.append(resp.status)
                await hold.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            async def no_conn():
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): return True
                return False
            await q.goto(B + '/#/vehicles/' + VID); await q.reload(); await q.wait_for_selector('#vnf', state='attached', timeout=20000)
            # 1) Hinweis zum Fahrzeug
            text = f'Funkloch-Hinweis {lang} {w}'
            await q.evaluate("() => { const d = document.querySelector('#vnf').closest('details'); if (d) d.open = true; }")
            await q.fill('#vnf [name=text]', text)
            await q.route('**/notes', lost_answer)
            btn = q.locator('#vnf button').last
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await btn.click()
            _r(f'ok: {lang} {w}px Hinweis: nach dem Zeitlimit „{NOCONN[lang]}“' if await no_conn() else f'FEHLER: {lang} {w}px Hinweis hängt ohne Ende')
            _r(f'ok: {lang} Hinweis kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} Knopf frei, Text bleibt' if not await btn.is_disabled() and await q.input_value('#vnf [name=text]') == text else 'FEHLER: Knopf gesperrt oder Text weg')
            if OUT: await q.screenshot(path=f'{OUT}/hinweis-funkloch-{lang}-{w}.png', full_page=True)
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/notes')
            await btn.click()
            try: await q.wait_for_function("t => [...document.querySelectorAll('#vnotes ul.vnotes li b')].some((b) => b.textContent === t) && !document.querySelector('#vnf [name=text]')?.value", arg=text, timeout=10000); shown = True
            except Exception: shown = False
            _r(f'ok: {lang} erneut gespeichert → Hinweis angezeigt, Formular leer' if shown else 'FEHLER: Hinweis nicht angezeigt')
            notes = [n for n in (await api('GET', f'/api/vehicles/{VID}/notes'))['d']['notes'] if n['text'] == text]
            _r(f'ok: {lang} genau ein Hinweis' if len(notes) == 1 else f'FEHLER: {len(notes)} Hinweise')
            # 2) Kilometerstand
            hold = asyncio.Event(); seen.clear()
            await q.evaluate("() => { const d = document.querySelector('#kf').closest('details'); if (d) d.open = true; }")
            await q.fill('#kf [name=km]', str(base_km))
            await q.route('**/odometer', lost_answer)
            kb = q.locator('#kf button').last
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await kb.click()
            _r(f'ok: {lang} {w}px km: nach dem Zeitlimit „{NOCONN[lang]}“' if await no_conn() else f'FEHLER: {lang} {w}px km hängt ohne Ende')
            _r(f'ok: {lang} km kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} km-Knopf frei, Wert bleibt' if not await kb.is_disabled() and await q.input_value('#kf [name=km]') == str(base_km) else 'FEHLER: km-Knopf gesperrt oder Wert weg')
            if OUT: await q.screenshot(path=f'{OUT}/km-funkloch-{lang}-{w}.png')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/odometer')
            await kb.click()
            try: await q.wait_for_function("() => !document.querySelector('#kf') || !document.querySelector('#kf [name=km]').value", timeout=10000); done = True
            except Exception: done = False
            _r(f'ok: {lang} erneut gespeichert → Akte neu geladen' if done else 'FEHLER: Akte nicht neu geladen')
            d = (await api('GET', f'/api/vehicles/{VID}'))['d']
            n = sum(1 for r in d.get('odometer', []) if r.get('km') == base_km)
            _r(f'ok: {lang} genau ein Kilometerstand {base_km}' if n == 1 else f'FEHLER: {n} Kilometerstände {base_km} ({list(d.keys())[:30]})')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Hinweis/Kilometerstand im Funkloch: alles grün')

asyncio.run(main())
