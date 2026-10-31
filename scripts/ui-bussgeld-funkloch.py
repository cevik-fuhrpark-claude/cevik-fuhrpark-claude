# [CLAUDE] UI-Test (31.10.2026, Backlog 803, Blickwinkel „Büro erfasst einen Bußgeldbescheid bei schlechtem Netz“): Anlage ohne Antwort.
# Vorher hatte das Speichern eines neuen Bußgeld-/Anhörungsvorgangs kein Zeitlimit – blieb die Antwort aus (Anfrage kam an, Antwort nicht),
# blieb „Speichern“ ohne Ende gesperrt. Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei;
# erneut speichern schickt denselben request_key → der vorhandene Vorgang öffnet sich, kein zweiter. DE 390 / UK 820 / EN 1366 px.
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

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'bf.inhaber', 'display_name': 'BF Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'bf.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        await api('POST', '/api/vehicles', {'plate': 'BF-UI 803', 'vin': 'WDB96340310803001', 'site': 'Dortmund'})
        for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
            await api('PATCH', '/api/me', {'language': lang})
            auth = f'Bußgeldstelle Funkloch {lang} {w}'
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'bf.inhaber', 'password': PW}])
            hold = asyncio.Event(); seen = []
            async def lost_answer(route):
                if route.request.method != 'POST': await route.continue_(); return
                resp = await route.fetch(); seen.append(resp.status)
                await hold.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            await q.goto(B + '/#/fines'); await q.reload(); await q.wait_for_selector('#nf', state='attached', timeout=15000)
            await q.evaluate("() => { const d = document.querySelector('#nf').closest('details'); if (d) d.open = true; }")
            await q.fill('#nf [name=authority]', auth); await q.fill('#nf [name=offense_at]', '2026-10-01T08:30'); await q.fill('#nf [name=plate_in_letter]', 'BF-UI 803')
            await q.route('**/api/fines', lost_answer)
            btn = q.locator('#nf button[type=submit], #nf button').last
            await btn.click()
            ok = False
            for _ in range(32):
                await q.wait_for_timeout(250)
                if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} {w}px nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px Speichern hängt ohne Ende')
            _r(f'ok: {lang} Anfrage kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} Knopf wieder frei, Eingaben bleiben' if not await btn.is_disabled() and await q.input_value('#nf [name=authority]') == auth else 'FEHLER: Knopf gesperrt oder Eingaben weg')
            if OUT: await q.screenshot(path=f'{OUT}/bussgeld-funkloch-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/api/fines')
            await btn.click()
            try: await q.wait_for_url('**/#/fines/*', timeout=10000); opened = True
            except Exception: opened = False
            _r(f'ok: {lang} erneut gespeichert → vorhandener Vorgang geöffnet' if opened else f'FEHLER: Vorgang nicht geöffnet ({q.url})')
            rows = [f for f in (await api('GET', '/api/fines'))['d']['fines'] if f.get('authority') == auth]
            _r(f'ok: {lang} genau ein Bußgeldvorgang' if len(rows) == 1 else f'FEHLER: {len(rows)} Vorgänge')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Bußgeld im Funkloch: alles grün')

asyncio.run(main())
