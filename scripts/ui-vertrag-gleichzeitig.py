# [CLAUDE] UI-Test (01.11.2026, Backlog 808, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig denselben Vertrag am Handy“):
# Leitung A hat den Vertrag offen, Leitung B speichert inzwischen eine Bemerkung. A ändert die Monatsrate und speichert.
# Vorher: Meldung „Vertrag wurde zwischenzeitlich geändert. Bitte neu laden.“, jeder weitere Versuch scheiterte am alten Stand,
# Neuladen verwarf die Eingabe. Jetzt: Ansicht lädt neu, Rate von A steht im frischen Formular, Bemerkung von B ist markiert;
# zweites Speichern übernimmt beide Änderungen. DE 390 / UK 820 / EN 1366 px.
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
            vin = f'WDB963403108{RUN}G0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-G{RUN} 80{i}', 'vin': vin, 'site': 'Dortmund'})
            ct = await api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'leasing', 'partner': f'Leasing 808 {RUN} {lang}', 'evidence': f'LV {lang}', 'monthly_rate_net': '1000'})
            _r(f'ok: {lang} Vertrag angelegt' if ct['s'] == 201 else f'FEHLER: Vorbereitung {ct}')
            cid = ct['d']['id']
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/vehicles/' + vid); await q.reload()
            fsel = f'form[data-ctedit="{cid}"]'
            await q.wait_for_selector(fsel, state='attached', timeout=20000)
            # Leitung B (anderes Gerät) speichert inzwischen eine Bemerkung
            cur = (await api('GET', f'/api/vehicles/{vid}'))['d']['contracts'][0]
            rb = await api('PATCH', f'/api/contracts/{cid}', {'kind': 'leasing', 'partner': f'Leasing 808 {RUN} {lang}', 'evidence': f'LV {lang}', 'monthly_rate_net': '1000', 'note': f'Rückgabe vorbereiten {lang}', 'expected_updated_at': cur['updated_at']})
            _r(f'ok: {lang} Leitung B gespeichert' if rb['s'] == 200 else f'FEHLER: B {rb}')
            # Leitung A ändert die Rate auf dem alten Stand
            await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
            await q.fill(fsel + ' [name=monthly_rate_net]', '1100')
            await q.click(fsel + ' button.btn')
            await q.wait_for_selector(fsel + ' [data-ctlost]', timeout=20000)
            txt = await q.inner_text(fsel + ' [data-ctlost]')
            _r(f'ok: {lang} Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis {txt}')
            rate = await q.input_value(fsel + ' [name=monthly_rate_net]'); note = await q.input_value(fsel + ' [name=note]')
            _r(f'ok: {lang} eigene Rate behalten, Bemerkung von B übernommen' if rate == '1100' and note == f'Rückgabe vorbereiten {lang}' else f'FEHLER: {lang} Formular Rate={rate} Bemerkung={note}')
            mark = await q.evaluate(f"() => document.querySelector('{fsel} [name=note]').classList.contains('ct-other') && !document.querySelector('{fsel} [name=monthly_rate_net]').classList.contains('ct-other')")
            _r(f'ok: {lang} nur Bemerkung markiert' if mark else f'FEHLER: {lang} Markierung')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT:
                await q.evaluate(f"() => document.querySelector('{fsel} [data-ctlost]').scrollIntoView({{ block: 'center' }})"); await q.screenshot(path=f'{OUT}/vertrag-gleichzeitig-{lang}-{w}.png')
            await q.click(fsel + ' button.btn')
            row = None
            for _ in range(40):
                await q.wait_for_timeout(250)
                row = (await api('GET', f'/api/vehicles/{vid}'))['d']['contracts'][0]
                if row['monthly_rate_net'] == 1100: break
            _r(f'ok: {lang} zweites Speichern: Rate und Bemerkung erhalten' if row['monthly_rate_net'] == 1100 and row['note'] == f'Rückgabe vorbereiten {lang}' else f'FEHLER: {lang} gespeichert {row}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
