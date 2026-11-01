# [CLAUDE] UI-Test (01.11.2026, Backlog 811, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig denselben Versicherungsfall“):
# Leitung A hat „Versicherungsfall bearbeiten“ offen, Leitung B trägt inzwischen die Schadennummer ein. A ergänzt den Nachweis und speichert.
# Vorher: Meldung „Versicherungsfall wurde zwischenzeitlich geändert“, Neuladen verwarf die Eingabe. Jetzt: Vorgang lädt neu, Nachweis von A
# steht im Formular, Schadennummer von B ist markiert; zweites Speichern übernimmt beide. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, random, time
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
            vin = f'WDB963403111{RUN}G0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-V{RUN} 81{i}', 'vin': vin, 'site': 'Dortmund'})
            cs = await api('POST', '/api/cases', {'vehicle_id': vid, 'description': f'Spiegel abgefahren 811 {lang}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': f'gl811-{RUN}-{lang}'})
            cid = cs['d']['id'] if cs['s'] == 201 else None
            cl = await api('PUT', f'/api/cases/{cid}/claim', {'insurer': 'Versicherer 811', 'reported_on': time.strftime('%Y-%m-%d'), 'evidence': 'Meldung 811'})
            _r(f'ok: {lang} Vorgang mit Versicherungsfall angelegt' if cs['s'] == 201 and cl['s'] == 200 else f'FEHLER: Vorbereitung {cs} {cl}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/cases/' + cid); await q.reload()
            fsel = '#clf'
            await q.wait_for_selector(fsel, state='attached', timeout=20000)
            up = await q.input_value(fsel + ' [name=expected_updated_at]')
            rb = await api('PUT', f'/api/cases/{cid}/claim', {'insurer': 'Versicherer 811', 'reported_on': time.strftime('%Y-%m-%d'), 'evidence': 'Meldung 811', 'claim_no': f'S-811-{lang}', 'expected_updated_at': up})
            _r(f'ok: {lang} Leitung B gespeichert' if rb['s'] == 200 else f'FEHLER: B {rb}')
            # Leitung A ändert die Rate auf dem alten Stand
            await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
            await q.fill(fsel + ' [name=evidence]', f'Meldung 811 + Gutachten {lang}')
            await q.click(fsel + ' button.btn')
            await q.wait_for_selector(fsel + ' [data-ctlost]', timeout=20000)
            txt = await q.inner_text(fsel + ' [data-ctlost]')
            _r(f'ok: {lang} Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis {txt}')
            ev = await q.input_value(fsel + ' [name=evidence]'); no = await q.input_value(fsel + ' [name=claim_no]')
            _r(f'ok: {lang} eigener Nachweis behalten, Schadennummer von B übernommen' if ev == f'Meldung 811 + Gutachten {lang}' and no == f'S-811-{lang}' else f'FEHLER: {lang} Formular {ev} {no}')
            mark = await q.evaluate("() => document.querySelector('#clf [name=claim_no]').classList.contains('ct-other') && !document.querySelector('#clf [name=evidence]').classList.contains('ct-other')")
            _r(f'ok: {lang} nur Schadennummer markiert' if mark else f'FEHLER: {lang} Markierung')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT:
                await q.evaluate(f"() => document.querySelector('{fsel} [data-ctlost]').scrollIntoView({{ block: 'center' }})"); await q.screenshot(path=f'{OUT}/versicherung-gleichzeitig-{lang}-{w}.png')
            await q.click(fsel + ' button.btn')
            row = None
            for _ in range(40):
                await q.wait_for_timeout(250)
                row = (await api('GET', f'/api/cases/{cid}'))['d'].get('claim') or {}
                if row.get('evidence') == f'Meldung 811 + Gutachten {lang}': break
            _r(f'ok: {lang} zweites Speichern: Nachweis und Schadennummer erhalten' if row.get('evidence') == f'Meldung 811 + Gutachten {lang}' and row.get('claim_no') == f'S-811-{lang}' else f'FEHLER: {lang} gespeichert {row}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
