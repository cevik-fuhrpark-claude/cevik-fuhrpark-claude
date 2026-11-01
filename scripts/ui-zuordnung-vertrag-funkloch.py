# [CLAUDE] UI-Test (01.11.2026, Backlog 805j, Blickwinkel „Funkloch“): Fahrerzuordnung beenden und Vertrag bearbeiten ohne Antwort.
# Vorher kein Zeitlimit (Knopf ohne Ende gesperrt); ein zweiter Versuch meldete „Zuordnung nicht gefunden oder bereits beendet“ bzw.
# „Vertrag wurde zwischenzeitlich geändert“. Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“; der zweite Versuch meldet
# „War bereits gespeichert“. DE 390 / UK 820 / EN 1366 px.
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
  window.setTimeout = (f, ms, ...a) => st(f, ((ms === 60000 || ms === 120000) && /app-(main|fahrzeug)\\.js/.test(new Error().stack || '')) ? (ms === 60000 ? 1500 : 2500) : ms, ...a); })();"""
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
            vin = f'WDB96340310805J0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-ZV 80{i}', 'vin': vin, 'site': 'Dortmund'})
            u = await api('POST', '/api/users', {'username': f'tz.fahrer805j.{lang}', 'display_name': f'TZ Fahrer 805j {lang}', 'role': 'driver', 'environment': env})
            asg = await api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id'], 'evidence': f'Plan {lang}'})
            ct = await api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'miete', 'partner': f'Miete 805j {lang}', 'evidence': f'MV {lang}'})
            _r(f'ok: {lang} Zuordnung/Vertrag angelegt' if asg['s'] == 201 and ct['s'] == 201 else f'FEHLER: Vorbereitung {asg} {ct}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/vehicles/' + vid); await q.reload(); await q.wait_for_selector('[data-end]', state='attached', timeout=20000)

            async def lost(glob, method, click, name):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != method: await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.route(glob, lost_answer)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: {name} Server-Antwort {seen}')
                if OUT: await q.screenshot(path=f'{OUT}/zuordnung-vertrag-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                if OUT: await q.screenshot(path=f'{OUT}/zuordnung-vertrag-funkloch-{name}-erneut-{lang}-{w}.png')
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“: {(await q.inner_text("body"))[-300:]}')

            await lost('**/api/assignments/*', 'DELETE', lambda: q.click('[data-end]'), 'zuordnung')
            d = (await api('GET', f'/api/vehicles/{vid}'))['d']
            n = sum(1 for x in (d.get('drivers') or []) if not x.get('valid_to'))
            _r(f'ok: {lang} Zuordnung beendet' if n == 0 else f'FEHLER: {lang} noch {n} offene Zuordnungen')
            fsel = f'form[data-ctedit="{ct["d"]["id"]}"]'
            await q.wait_for_selector(fsel, state='attached', timeout=20000)
            async def edit():
                await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
                await q.fill(fsel + ' [name=contract_no]', f'MV-805j-{lang}')
                await q.click(fsel + ' button.btn')
            await lost('**/api/contracts/*', 'PATCH', edit, 'vertrag')
            c = [x for x in (await api('GET', f'/api/vehicles/{vid}'))['d']['contracts'] if x['id'] == ct['d']['id']][0]
            _r(f'ok: {lang} Vertragsnummer gespeichert' if c.get('contract_no') == f'MV-805j-{lang}' else f'FEHLER: Vertrag {c.get("contract_no")}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Zuordnung/Vertrag im Funkloch: alles grün')

asyncio.run(main())
