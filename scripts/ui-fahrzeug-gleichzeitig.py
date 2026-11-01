# [CLAUDE] UI-Test (01.11.2026, Backlog 810, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig dasselbe Fahrzeug“):
# Leitung A hat „Stammdaten bearbeiten“ offen, Leitung B ändert inzwischen den Standort. A trägt das Modell ein und speichert.
# Vorher: „Inzwischen von jemand anderem geändert – bitte neu laden.“, Neuladen verwarf die Eingabe. Jetzt: Akte lädt neu, Modell von A
# steht im Formular, Standort von B ist markiert; zweites Speichern übernimmt beide. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, random
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
RUN = f'{random.randint(0, 99):02d}'  # erneuter Lauf gegen denselben Server: eigene Fahrzeuge
OTHER = {'de': 'Von der anderen Person geändert', 'uk': 'Змінено іншою особою', 'en': 'Changed by the other person'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tz.inhaber', 'display_name': 'TZ Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            await api('PATCH', '/api/me', {'language': lang})
            vin = f'WDB963403110{RUN}G0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-F{RUN} 81{i}', 'vin': vin, 'site': 'Dortmund'})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/vehicles/' + vid); await q.reload()
            fsel = '#evf'
            await q.wait_for_selector(fsel, state='attached', timeout=20000)
            up = await q.input_value(fsel + ' [name=expected_updated_at]')
            rb = await api('POST', '/api/vehicles', {'vin': vin, 'plate': f'TZ-F{RUN} 81{i}', 'site': 'Bochum', 'keep_active': True, 'expected_updated_at': up})
            _r(f'ok: {lang} Leitung B gespeichert' if rb['s'] == 201 else f'FEHLER: B {rb}')
            # Leitung A ändert die Rate auf dem alten Stand
            await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
            await q.fill(fsel + ' [name=model]', f'TGX {lang}')
            await q.click(fsel + ' button.btn')
            await q.wait_for_selector(fsel + ' [data-ctlost]', timeout=20000)
            txt = await q.inner_text(fsel + ' [data-ctlost]')
            _r(f'ok: {lang} Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis {txt}')
            mo = await q.input_value(fsel + ' [name=model]'); site = await q.input_value(fsel + ' [name=site]')
            _r(f'ok: {lang} eigenes Modell behalten, Standort von B übernommen' if mo == f'TGX {lang}' and site == 'Bochum' else f'FEHLER: {lang} Formular {mo} {site}')
            mark = await q.evaluate("() => document.querySelector('#evf [name=site]').classList.contains('ct-other') && !document.querySelector('#evf [name=model]').classList.contains('ct-other')")
            _r(f'ok: {lang} nur Standort markiert' if mark else f'FEHLER: {lang} Markierung')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT:
                await q.evaluate(f"() => document.querySelector('{fsel} [data-ctlost]').scrollIntoView({{ block: 'center' }})"); await q.screenshot(path=f'{OUT}/fahrzeug-gleichzeitig-{lang}-{w}.png')
            await q.click(fsel + ' button.btn')
            row = None
            for _ in range(40):
                await q.wait_for_timeout(250)
                row = (await api('GET', f'/api/vehicles/{vid}'))['d']; row = row.get('vehicle', row)
                if row.get('model') == f'TGX {lang}': break
            _r(f'ok: {lang} zweites Speichern: Modell und Standort erhalten' if row.get('model') == f'TGX {lang}' and row.get('site') == 'Bochum' else f'FEHLER: {lang} gespeichert {row}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
