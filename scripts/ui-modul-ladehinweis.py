# [CLAUDE] UI-Test (29.10.2026, Backlog 595) – nachgeladene App-Module bei langsamem Netz:
# 1. Fahrzeugakte zum ersten Mal öffnen, Modul app-fahrzeug.js kommt erst nach 2,5 s: die Seite zeigt „Lädt…“ (DE/UK) statt still die vorige Seite,
#    danach die Akte; beim zweiten Öffnen kein Ladehinweis mehr nötig (Modul geladen).
# 2. Schneller Weiterklick, während das Modul lädt: die inzwischen geöffnete Seite bleibt stehen (kein „Lädt…“ und keine Akte darüber).
# 3. Modul lädt gar nicht (Netzfehler): Fehlerseite mit übersetzter Meldung statt endlosem „Lädt…“; nächster Versuch lädt erneut.
# Handy 390 px.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310595001'
LOAD = {'de': 'Lädt…', 'uk': 'Завантаження…'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, locale='de-DE', service_workers='block'); q = await ctx.new_page(); await q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ml.inhaber', 'display_name': 'ML Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'ml.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'ML-MO 1', 'vin': VIN, 'site': 'Dortmund'})
        mode = {'v': 'slow'}
        async def slow(route):
            if mode['v'] == 'fail': await route.abort(); return
            await asyncio.sleep(2.5); await route.continue_()
        await q.route('**/app-fahrzeug.js*', slow)
        for lang in ['de', 'uk']:
            await api('PATCH', '/api/me', {'language': lang})
            await q.goto(B + '/#/vehicles'); await q.reload(); await q.wait_for_selector('a.row', timeout=15000)
            await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_timeout(1000)
            txt = await q.inner_text('#main')
            _r(f'ok: {lang} „{LOAD[lang]}“ während das Modul lädt' if LOAD[lang] in txt and 'ML-MO 1' not in txt else f'FEHLER: {lang} kein Ladehinweis: {txt[:200]!r}')
            if OUT: await q.screenshot(path=f'{OUT}/modul-laedt-{lang}-390.png')
            await q.wait_for_selector('#tires', state='attached', timeout=15000)
            h1 = await q.inner_text('#main h1')
            _r(f'ok: {lang} Akte nach dem Laden ({h1})' if LOAD[lang] not in await q.inner_text('#main') else f'FEHLER: {lang} Ladehinweis bleibt')
            # zweites Öffnen: Modul ist da – kein Ladehinweis
            await q.goto(B + '/#/vehicles'); await q.wait_for_selector('a.row'); await q.goto(B + f'/#/vehicles/VIN:{VIN}')
            seen = await q.evaluate("""() => new Promise((res) => { let s = false; const o = new MutationObserver(() => { if (document.querySelector('#main p.muted') && /Lädt…|Завантаження…/.test(document.querySelector('#main').textContent) && !document.querySelector('#tires')) s = true; });
              o.observe(document.getElementById('app'), { childList: true, subtree: true }); setTimeout(() => { o.disconnect(); res(s); }, 1500); })""")
            _r(f'ok: {lang} zweites Öffnen ohne Ladehinweis' if not seen else f'FEHLER: {lang} Ladehinweis trotz geladenem Modul')
            # neue Seite (Modul wieder ungeladen): Weiterklick während des Ladens
            await q.goto(B + '/#/vehicles'); await q.reload(); await q.wait_for_selector('a.row', timeout=15000)
            await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_timeout(100); await q.goto(B + '/#/cases'); await q.wait_for_timeout(4500)
            txt = await q.inner_text('#main')
            ok = LOAD[lang] not in txt and not await q.locator('#tires').count() and await q.locator('#main h1').count()
            _r(f'ok: {lang} Weiterklick – Vorgangsliste bleibt stehen' if ok else f'FEHLER: {lang} Weiterklick überschrieben: {txt[:200]!r}')
        # Modul lädt nicht: Fehlerseite statt endlosem Ladehinweis, danach erneuter Versuch
        await api('PATCH', '/api/me', {'language': 'de'})
        mode['v'] = 'fail'
        await q.goto(B + '/#/vehicles'); await q.reload(); await q.wait_for_selector('a.row', timeout=15000)
        await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_timeout(2000)
        txt = await q.inner_text('#main')
        _r('ok: Ladefehler als Fehlerseite' if await q.locator('#errh').count() and 'Lädt…' not in txt else f'FEHLER: Ladefehler {txt[:200]!r}')
        if OUT: await q.screenshot(path=f'{OUT}/modul-fehler-de-390.png')
        mode['v'] = 'ok'
        async def fast(route): await route.continue_()
        await q.unroute('**/app-fahrzeug.js*'); await q.route('**/app-fahrzeug.js*', fast)
        await q.goto(B + '/#/vehicles'); await q.wait_for_selector('a.row'); await q.goto(B + f'/#/vehicles/VIN:{VIN}')
        await q.wait_for_selector('#tires', state='attached', timeout=15000)
        _r('ok: erneuter Versuch lädt die Akte')
        sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        _r('ok: 390 px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
        _r('ok: keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
        await br.close()
    print('Modul-Ladehinweis: alles grün')

asyncio.run(main())
