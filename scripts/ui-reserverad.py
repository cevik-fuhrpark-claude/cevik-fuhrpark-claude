# [CLAUDE] UI-Test (19.10.2026) – Reserverad und Protokollsuche:
# 1. Reserverad unter 1,6 mm: Fahrzeugakte zeigt „Reserverad abgefahren – nicht montieren“ (gelb, nicht rot), Erfassung meldet den Reserverad-Hinweis.
# 2. Reifen über die Flotte: Fahrzeug als „Warnung“ mit Zusatz „Reserverad < 1,6 mm“, kein „Unter Minimum“.
# 3. Protokoll: Suche mit 1 Zeichen nennt, dass nicht gesucht wurde (DE/UK/EN), Handy 390 px ohne Querscrollen.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310888077'
TXT = {'de': ('Reserverad abgefahren', 'Reserverad <', 'Suche ab 2 Zeichen'), 'uk': ('Запасне колесо зношене', 'Запасне колесо <', 'Пошук від 2 символів'), 'en': ('Spare wheel worn', 'Spare wheel <', 'at least 2 characters')}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 1440, 'height': 900}, locale='de-DE'); q = await ctx.new_page(); await q.goto(B)
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'rr.inhaber', 'display_name': 'RR Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'rr.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'RR-SP 1', 'vin': VIN, 'site': 'Dortmund'})
        await api('PATCH', '/api/me', {'language': 'de'})
        # Erfassung über das Formular der Akte
        await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_selector('#tf', state='attached')
        await q.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        f = q.locator('#tf')
        await f.locator('select[name=event_type]').select_option('messung')
        await f.locator('select[name=position]').select_option('Reserve')
        await f.locator('[name=tread_mm]').fill('1,2')
        await f.evaluate('f => f.requestSubmit()'); await q.wait_for_timeout(1500)
        toasts = await q.eval_on_selector_all('.toast', 'es => es.map(e => e.textContent)')
        _r('ok: Reserverad-Hinweis bei der Erfassung' if any('Reserverad: Profiltiefe 1,2 mm' in x for x in toasts) else f'FEHLER: Hinweis fehlt {toasts}')
        await api('POST', f'/api/vehicles/VIN:{VIN}/tires/events', {'event_type': 'messung', 'position': 'VA-L', 'tread_mm': 9})
        for lang, w in [('de', 390), ('uk', 820), ('en', 1440)]:
            await api('PATCH', '/api/me', {'language': lang}); await q.set_viewport_size({'width': w, 'height': 900})
            await q.goto(B + '/#/'); await q.reload(); await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_selector('#tires .chip', state='attached', timeout=15000); await q.wait_for_timeout(300)
            await q.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            chip = q.locator('#tires .chip', has_text=TXT[lang][0])
            cls = await chip.first.get_attribute('class') if await chip.count() else ''
            _r(f'ok: {lang} Akte „{TXT[lang][0]}“ gelb' if 'mittel' in cls else f'FEHLER: {lang} Akte-Status {cls!r}')
            if OUT: await q.locator('#tires').screenshot(path=f'{OUT}/reserve-akte-{lang}-{w}.png')
            await q.goto(B + '/#/tires'); await q.wait_for_timeout(1200)
            row = q.locator('a.row', has_text='RR-SP 1')
            t = await row.first.inner_text() if await row.count() else ''
            c = await row.first.get_attribute('class') if await row.count() else ''
            _r(f'ok: {lang} Flotte mit Zusatz, gelb' if TXT[lang][1] in t and 'p-mittel' in (c or '') else f'FEHLER: {lang} Flotte {t!r} {c!r}')
            if OUT: await q.screenshot(path=f'{OUT}/reserve-flotte-{lang}-{w}.png', full_page=True)
            await q.goto(B + '/#/audit'); await q.wait_for_selector('#aqs')
            await q.fill('#aqs', 'R'); await q.eval_on_selector('#aqf', 'f => f.requestSubmit()'); await q.wait_for_timeout(1200)
            h = await q.locator('#aqmin').inner_text() if await q.locator('#aqmin').count() else ''
            _r(f'ok: {lang} Protokoll 1 Zeichen gemeldet' if TXT[lang][2] in h and any(x in h for x in ('„R“', '«R»', '“R”')) else f'FEHLER: {lang} Protokoll-Hinweis {h!r}')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w} px ohne Querscrollen' if sw <= 0 else f'FEHLER: {lang} {w} px Querscrollen {sw}')
            if OUT: await q.screenshot(path=f'{OUT}/protokoll-{lang}-{w}.png')
            await q.fill('#aqs', 'RR'); await q.eval_on_selector('#aqf', 'f => f.requestSubmit()'); await q.wait_for_timeout(1000)
            _r(f'ok: {lang} Hinweis weg bei 2 Zeichen' if await q.locator('#aqmin').count() == 0 else f'FEHLER: {lang} Hinweis bleibt')
            await q.fill('#aqs', ''); await q.eval_on_selector('#aqf', 'f => f.requestSubmit()'); await q.wait_for_timeout(600)
        await br.close()

asyncio.run(main())
