# [CLAUDE] UI-Test (01.11.2026, Backlog 805, Blickwinkel „Werkstatt erfasst Prüfungen im Funkloch der Halle“): „erledigt“ und
# „Werkstattauftrag erstellen“ in der Fahrzeugakte ohne Antwort. Vorher kein Zeitlimit – „Speichern“ blieb ohne Ende gesperrt; die
# Wiederholung einer heutigen Durchführung mit km-Stand legte zudem einen zweiten gleichen km-Stand an (Server-Fehler, behoben).
# Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei, Eingaben bleiben; erneut speichern
# legt keine zweite Durchführung, keinen zweiten km-Stand und keinen zweiten Auftrag an. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, datetime
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

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pf.inhaber', 'display_name': 'PF Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'pf.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            await api('PATCH', '/api/me', {'language': lang})
            vin = f'WDB9634031080500{i}'; vid = 'VIN:' + vin; km = 500000 + i * 1000
            await api('POST', '/api/vehicles', {'plate': f'PF-UI 80{i}', 'vin': vin, 'site': 'Dortmund'})
            r1 = await api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'UVV', 'last_done_date': '2025-10-01', 'interval_months': 12, 'interval_km': 100000, 'last_done_km': km - 50000, 'evidence': 'UVV alt'})
            r2 = await api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'Bremsen', 'last_done_date': '2024-10-01', 'interval_months': 12, 'evidence': 'Bremsen alt'})
            _r(f'ok: {lang} Prüftermine angelegt' if r1['s'] == 201 and r2['s'] == 201 else f'FEHLER: Prüftermine {r1} {r2}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'pf.inhaber', 'password': PW}])
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
            await q.goto(B + '/#/vehicles/' + vid); await q.reload()
            rid = r1['d']['id']
            await q.wait_for_selector(f'button[data-done="{rid}"]', timeout=20000)
            await q.click(f'button[data-done="{rid}"]')
            fm = f'form[data-mdone="{rid}"]'
            await q.fill(fm + ' [name=done_km]', str(km)); await q.fill(fm + ' [name=evidence]', f'UVV-Bericht {lang}')
            await q.route('**/complete', lost_answer)
            btn = q.locator(fm + ' button.btn').last
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await btn.click()
            _r(f'ok: {lang} {w}px erledigt: nach dem Zeitlimit „{NOCONN[lang]}“' if await no_conn() else f'FEHLER: {lang} {w}px erledigt hängt ohne Ende')
            _r(f'ok: {lang} erledigt kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} Knopf frei, Nachweis bleibt' if not await btn.is_disabled() and await q.input_value(fm + ' [name=evidence]') == f'UVV-Bericht {lang}' else 'FEHLER: Knopf gesperrt oder Eingaben weg')
            if OUT: await q.screenshot(path=f'{OUT}/pruefung-funkloch-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/complete')
            await btn.click()
            try: await q.wait_for_function(f"() => {{ const f = document.querySelector('{fm}'); return !f || f.hidden; }}", timeout=10000); done = True
            except Exception: done = False
            _r(f'ok: {lang} erneut gespeichert → Akte neu geladen' if done else 'FEHLER: Akte nicht neu geladen')
            d = (await api('GET', f'/api/vehicles/{vid}'))['d']
            ne = sum(1 for x in d['maintenance_history'] if x.get('evidence') == f'UVV-Bericht {lang}')
            nk = sum(1 for x in d['odometer'] if x.get('km') == km)
            _r(f'ok: {lang} eine Durchführung, ein km-Stand' if ne == 1 and nk == 1 else f'FEHLER: {ne} Durchführungen, {nk} km-Stände')
            # Werkstattauftrag aus dem überfälligen Prüftermin
            hold = asyncio.Event(); seen.clear()
            fo = f'form[data-mord="{r2["d"]["id"]}"]'
            await q.wait_for_selector(fo, state='attached', timeout=15000)
            await q.evaluate("s => { const d = document.querySelector(s).closest('details'); if (d) d.open = true; }", fo)
            await q.route('**/order', lost_answer)
            ob = q.locator(fo + ' button').last
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await ob.click()
            _r(f'ok: {lang} {w}px Auftrag: nach dem Zeitlimit „{NOCONN[lang]}“' if await no_conn() else f'FEHLER: {lang} Auftrag hängt ohne Ende')
            _r(f'ok: {lang} Auftrag kam am Server an ({seen})' if seen and seen[0] == 201 else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} Auftrags-Knopf frei' if not await ob.is_disabled() else 'FEHLER: Auftrags-Knopf gesperrt')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/order')
            await ob.click()
            try: await q.wait_for_url('**/#/cases/*', timeout=10000); opened = True
            except Exception: opened = False
            _r(f'ok: {lang} erneut → vorhandener Auftrag geöffnet' if opened else f'FEHLER: Auftrag nicht geöffnet ({q.url})')
            cs = [c for c in (await api('GET', f'/api/cases?status=open&vehicle_id={vid}'))['d']['cases']]
            _r(f'ok: {lang} genau ein Auftrag' if len(cs) == 1 else f'FEHLER: {len(cs)} Aufträge')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Prüfung erledigt/Auftrag im Funkloch: alles grün')

asyncio.run(main())
