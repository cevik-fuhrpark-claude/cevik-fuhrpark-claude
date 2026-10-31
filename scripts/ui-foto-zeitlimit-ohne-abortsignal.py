# [CLAUDE] UI-Test (31.10.2026, Backlog 797, Blickwinkel „Fahrer im Funkloch mit älterem Handy“): Foto-Upload ohne AbortSignal.timeout.
# Chrome/Android-WebView < 103 und iOS < 16 kennen AbortSignal.timeout nicht – vorher hatte der Foto-Upload dort gar kein Zeitlimit:
# im Funkloch (Anfrage hängt ohne Antwort) blieb „Lade Foto 1/1“ ohne Ende stehen, die Fotos kamen nie in den Postausgang.
# Nachstellung: Browser ohne AbortSignal.timeout, Upload-Anfrage bleibt hängen; das Zeitlimit (120 s) wird für den Test auf 3 s verkürzt
# (setTimeout mit genau 120000 ms). Erwartet: Meldung angelegt, Seite wechselt zum Vorgang, Foto liegt im Postausgang; Netz wieder da →
# Foto kommt am Vorgang an. DE/UK/EN am Handy (390 px), DE zusätzlich am PC (1366 px). Gegen den alten Stand rot (Upload hängt).
import asyncio, os, base64, tempfile
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310797001'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fjcWfAAAAAElFTkSuQmCC')
FOTO = os.path.join(tempfile.gettempdir(), 'zl-foto.png'); open(FOTO, 'wb').write(PNG)
OLD = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms === 120000 ? 3000 : ms, ...a); })();"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'zl.inhaber', 'display_name': 'ZL Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'zl.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'ZL-FO 7', 'vin': VIN, 'site': 'Dortmund'})
        for lang, w in [('de', 390), ('uk', 390), ('en', 390), ('de', 1366)]:
            await api('PATCH', '/api/me', {'language': lang})
            ctx = await br.new_context(viewport={'width': w, 'height': 844 if w < 500 else 900}, service_workers='block'); await ctx.add_init_script(OLD)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'zl.inhaber', 'password': PW}])
            _r('ok: Browser ohne AbortSignal.timeout nachgebildet' if await q.evaluate('!AbortSignal.timeout') else 'FEHLER: AbortSignal.timeout noch da')
            mark = f'ZEITLIMIT-{lang}-{w}'
            hang = asyncio.Event()
            async def stuck(route):  # Funkloch: keine Antwort
                await hang.wait()
                try: await route.abort()
                except Exception: pass
            await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#d', timeout=15000)
            await q.fill('#vq', 'ZL-FO 7'); await q.locator('.vehpick label:not([hidden])').filter(has_text='ZL-FO 7').first.click(); await q.fill('#d', f'Delle Tür links {mark}')
            await q.set_input_files('#ph', FOTO)
            await q.route('**/api/cases/*/files', stuck)
            await q.click('#sb')
            moved = False
            for _ in range(24):  # bis 12 s (Zeitlimit im Test 3 s)
                await q.wait_for_timeout(500)
                if await q.evaluate("location.hash.startsWith('#/cases/')"): moved = True; break
            sbt = await q.evaluate("location.hash + ' | ' + ((document.querySelector('#sb') || {}).textContent || '') + ' | ' + [...document.querySelectorAll('.toast,.err,[role=alert]')].map(x=>x.textContent).join(' / ')")
            if not moved: await q.screenshot(path=os.path.join(tempfile.gettempdir(), 'zl-fehler.png'), full_page=True)
            _r(f'ok: {lang} {w}px Upload bricht nach dem Zeitlimit ab, Vorgang wird geöffnet' if moved else f'FEHLER: {lang} {w}px Upload hängt ohne Ende ({sbt!r})')
            ob = await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v)).filter(x=>x.photo_target).length")
            _r(f'ok: {lang} Foto im Postausgang' if ob == 1 else f'FEHLER: {lang} Postausgang mit Foto: {ob}')
            if OUT: await q.screenshot(path=f'{OUT}/foto-zeitlimit-{lang}-{w}.png')
            hang.set(); await q.wait_for_timeout(300); await q.unroute('**/api/cases/*/files')
            await q.goto(B + '/#/'); await q.wait_for_timeout(500); await q.reload(); await q.wait_for_timeout(3500)  # Netz wieder da → Postausgang sendet
            c = [x for x in (await api('GET', '/api/cases?f=all'))['d']['cases'] if mark in x['description']]
            files = (await api('GET', f"/api/cases/{c[0]['id']}"))['d'].get('files', []) if c else []
            _r(f'ok: {lang} Foto nachgereicht' if len(c) == 1 and len(files) == 1 else f'FEHLER: {lang} Vorgänge {len(c)}, Fotos {len(files)}')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Foto-Zeitlimit ohne AbortSignal.timeout: alles grün')

asyncio.run(main())
