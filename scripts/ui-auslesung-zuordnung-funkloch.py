# [CLAUDE] UI-Test (01.11.2026, Backlog 805, Blickwinkel „Funkloch“): Fahrtenschreiber-Auslesung (Fahrzeug- und Fahrerakte) und
# Fahrerzuordnung ohne Antwort. Vorher kein Zeitlimit – der Knopf blieb ohne Ende gesperrt; ein zweiter Versuch meldete nur „bereits erfasst“
# bzw. „bereits zugeordnet“. Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei; erneut
# speichern mit denselben Eingaben meldet „War bereits gespeichert“ und legt nichts doppelt an. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, json
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
SAVED = {'de': 'War bereits gespeichert', 'uk': 'Уже було збережено', 'en': 'Already saved'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tz.inhaber', 'display_name': 'TZ Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        env = (await api('GET', '/api/me'))['d']['active_environment']
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            await api('PATCH', '/api/me', {'language': lang})
            vin = f'WDB9634031080510{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-UI 81{i}', 'vin': vin, 'site': 'Dortmund'})
            u = await api('POST', '/api/users', {'username': f'tz.fahrer.{lang}', 'display_name': f'TZ Fahrer {lang}', 'role': 'driver', 'environment': env})
            drv = await api('POST', '/api/drivers', {'display_name': f'TZ Akte {lang}'})
            _r(f'ok: {lang} Fahrer angelegt' if u['s'] in (200, 201) and drv['s'] == 201 else f'FEHLER: Fahrer {u} {drv}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])

            async def lost_retry(name, sel, glob, fill):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != 'POST': await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await fill()
                await q.route(glob, lost_answer)
                btn = q.locator(sel + ' button').last
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: {name} Server-Antwort {seen}')
                _r(f'ok: {lang} {name}: Knopf frei' if not await btn.is_disabled() else f'FEHLER: {name} Knopf gesperrt')
                if OUT: await q.screenshot(path=f'{OUT}/auslesung-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“')

            await q.goto(B + '/#/vehicles/' + vid); await q.reload(); await q.wait_for_selector('#tvf', state='attached', timeout=20000)
            async def fill_tv(): await q.fill('#tvf [name=evidence]', f'Massenspeicher {lang}')
            await lost_retry('massenspeicher', '#tvf', '**/api/tacho/downloads', fill_tv)
            n = json.dumps((await api('GET', f'/api/vehicles/{vid}'))['d'], ensure_ascii=False).count(f'Massenspeicher {lang}')
            _r(f'ok: {lang} genau eine Massenspeicher-Auslesung' if n == 1 else f'FEHLER: {n} Auslesungen')
            await q.wait_for_selector('#drvsel option', state='attached', timeout=15000)
            async def fill_df():
                await q.select_option('#drvsel', u['d']['id'] if 'id' in u['d'] else u['d']['user']['id'])
            await lost_retry('zuordnung', '#df', '**/drivers', fill_df)
            d = (await api('GET', f'/api/vehicles/{vid}'))['d']
            n = sum(1 for x in (d.get('drivers') or d.get('assignments') or []) if not x.get('valid_to'))
            _r(f'ok: {lang} genau eine offene Zuordnung' if n == 1 else f'FEHLER: {n} Zuordnungen ({list(d.keys())[:40]})')
            await q.goto(B + '/#/drivers/' + drv['d']['id']); await q.wait_for_selector('#tdf', state='attached', timeout=20000)
            async def fill_td(): await q.fill('#tdf [name=evidence]', f'Fahrerkarte {lang}')
            await lost_retry('fahrerkarte', '#tdf', '**/api/tacho/downloads', fill_td)
            n = json.dumps((await api('GET', f"/api/drivers/{drv['d']['id']}"))['d'], ensure_ascii=False).count(f'Fahrerkarte {lang}')
            _r(f'ok: {lang} genau eine Fahrerkarten-Auslesung' if n == 1 else f'FEHLER: {n} Auslesungen')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Auslesung/Zuordnung im Funkloch: alles grün')

asyncio.run(main())
