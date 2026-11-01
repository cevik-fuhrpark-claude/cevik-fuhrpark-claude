# [CLAUDE] UI-Test (01.11.2026, Backlog 806, Blickwinkel „Handy steht auf ukrainischer Zeit“): Uhrzeit-Eingaben gelten als deutsche Zeit.
# Gerät auf Kyjiw (UK, +1:00) bzw. New York (EN, −5:00/−6:00 je nach Zeitumstellung): Hinweis mit Unterschied und deutscher Uhrzeit am Schadenzeitpunkt (Meldung)
# und an der Push-Ruhezeit; Gerät auf Berlin (DE): kein Hinweis. DE 390 / UK 820 / EN 1366 px, Fahrerkonto.
import asyncio, os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tz.inhaber', 'display_name': 'TZ Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        env = (await api('GET', '/api/me'))['d']['active_environment']
        def expect(tz):  # Unterschied zur deutschen Zeit jetzt (Zeitumstellungen beider Zonen berücksichtigt)
            n = datetime.now(timezone.utc); d = int((n.astimezone(ZoneInfo(tz)).utcoffset() - n.astimezone(ZoneInfo('Europe/Berlin')).utcoffset()).total_seconds() // 60)
            return None if d == 0 else f"{'+' if d > 0 else '−'}{abs(d) // 60}:{abs(d) % 60:02d}"
        for i, (lang, w, h, tz) in enumerate([('de', 390, 844, 'Europe/Berlin'), ('uk', 820, 1180, 'Europe/Kyiv'), ('en', 1366, 900, 'America/New_York')]):
            diff = expect(tz)
            vin = f'WDB9634031080600{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-ZZ 80{i}', 'vin': vin, 'site': 'Dortmund'})
            u = await api('POST', '/api/users', {'username': f'tz.fahrer806.{lang}', 'display_name': f'TZ Fahrer 806 {lang}', 'role': 'driver', 'environment': env})
            await api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id'], 'evidence': 'Plan'})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block', timezone_id=tz)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B)
            a = await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
            await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            _r(f'ok: {lang} Fahrer angemeldet ({tz})' if a['s'] == 200 else f'FEHLER: Einladung {a}')
            await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#occt', state='attached', timeout=20000)
            n = await q.locator('[data-tzdiff]').count()
            if diff is None:
                _r(f'ok: {lang} Gerät auf deutscher Zeit: kein Hinweis' if n == 0 else f'FEHLER: {lang} Hinweis trotz deutscher Zeit')
            else:
                txt = (await q.locator('[data-tzdiff]').first.inner_text()) if n else ''
                _r(f'ok: {lang} Meldung: Hinweis „{txt[:70]}…“' if n == 1 and diff in txt else f'FEHLER: {lang} Hinweis fehlt/falsch ({n}) {txt}')
                vis = await q.locator('[data-tzdiff]').first.is_visible()
                _r(f'ok: {lang} Hinweis sichtbar' if vis else f'FEHLER: {lang} Hinweis unsichtbar')
            if OUT:
                await q.locator('[data-occ]').scroll_into_view_if_needed(); await q.screenshot(path=f'{OUT}/zeitzone-meldung-{lang}-{w}.png', full_page=False)
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            await q.goto(B + '/#/inbox'); await q.wait_for_selector('#np', state='attached', timeout=20000)
            await q.evaluate("() => { const d = document.querySelector('#np'); if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            try: await q.wait_for_selector('#qfrom', state='attached', timeout=15000)
            except Exception: _r(f'FEHLER: {lang} Ruhezeit-Formular nicht gefunden')
            n2 = await q.locator('#qf [data-tzdiff]').count()
            _r(f'ok: {lang} Push-Ruhezeit: Hinweis {"vorhanden" if n2 else "nicht nötig"}' if (n2 == 1) == (diff is not None) else f'FEHLER: {lang} Ruhezeit-Hinweis {n2}')
            if OUT and diff: await q.locator('#qf').screenshot(path=f'{OUT}/zeitzone-ruhezeit-{lang}-{w}.png')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Zeitzonen-Hinweis: alles grün')

asyncio.run(main())
