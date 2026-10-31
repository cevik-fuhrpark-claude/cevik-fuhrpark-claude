# [CLAUDE] UI-Test (31.10.2026, Backlog 801, Blickwinkel „Funkloch“): Anmeldung ohne Antwort.
# Vorher hatte POST /api/login kein Zeitlimit – im Funkloch (Netz angezeigt, keine Antwort) blieb „Anmelden“ ohne Ende gesperrt.
# Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s, nur Aufrufe aus app-main.js) „Keine Verbindung.“, Knopf wieder frei,
# Eingaben bleiben; Netz wieder da → erneut „Anmelden“ führt in die App. DE/UK/EN 390 px und DE 1366 px. Gegen den alten Stand rot.
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
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fl.inhaber', 'display_name': 'FL Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        for lang, w in [('de', 390), ('uk', 390), ('en', 390), ('de', 1366)]:
            ctx = await br.new_context(viewport={'width': w, 'height': 844 if w < 500 else 900}, service_workers='block'); await ctx.add_init_script(FAST)
            await ctx.add_init_script(f"try {{ localStorage.setItem('cfp_lang', '{lang}'); }} catch {{}}")
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B + '/#/login'); await q.wait_for_selector('#u', timeout=15000)
            hold = asyncio.Event(); seen = []
            async def no_answer(route):
                if route.request.method != 'POST': await route.continue_(); return
                seen.append(1); await hold.wait()
                try: await route.abort()
                except Exception: pass
            await q.route('**/api/login', no_answer)
            await q.fill('#u', 'fl.inhaber'); await q.fill('#p', PW)
            btn = q.locator('#f button.btn.block').first
            await btn.click()
            ok = False
            for _ in range(32):
                await q.wait_for_timeout(250)
                if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} {w}px nach dem Zeitlimit „{NOCONN[lang]}“' if ok and seen else f'FEHLER: {lang} {w}px Anmeldung hängt ohne Ende (Anfragen {len(seen)})')
            dis = await btn.is_disabled()
            _r(f'ok: {lang} Knopf wieder frei' if not dis else 'FEHLER: Knopf bleibt gesperrt')
            _r(f'ok: {lang} Eingaben bleiben' if await q.input_value('#u') == 'fl.inhaber' and await q.input_value('#p') == PW else 'FEHLER: Eingaben verloren')
            if OUT: await q.screenshot(path=f'{OUT}/anmeldung-funkloch-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.unroute('**/api/login')
            await btn.click()
            inapp = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if '#/login' not in q.url and await q.locator('#main h1').count(): inapp = True; break
            _r(f'ok: {lang} Netz wieder da → angemeldet' if inapp else f'FEHLER: erneute Anmeldung scheitert ({q.url})')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Anmeldung im Funkloch: alles grün')

asyncio.run(main())
