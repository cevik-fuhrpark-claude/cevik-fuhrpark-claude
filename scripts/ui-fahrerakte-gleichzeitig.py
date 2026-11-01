# [CLAUDE] UI-Test (01.11.2026, Backlog 809, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig dieselbe Fahrerakte“):
# Leitung A hat die Fahrerakte offen, Leitung B setzt inzwischen den Standort. A ändert die Personalnummer und speichert.
# Vorher: „Fahrerakte wurde zwischenzeitlich geändert. Bitte neu laden.“, Neuladen verwarf die Eingabe. Jetzt: Ansicht lädt neu,
# Personalnummer von A steht im Formular, Standort von B ist markiert; zweites Speichern übernimmt beide. DE 390 / UK 820 / EN 1366 px.
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
            dr = await api('POST', '/api/drivers', {'display_name': f'Fahrer 809 {RUN} {lang}', 'personnel_no': f'P-809-{RUN}-{lang}'})
            _r(f'ok: {lang} Fahrerakte angelegt' if dr['s'] == 201 else f'FEHLER: Vorbereitung {dr}')
            did = dr['d']['id']
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/drivers/' + did); await q.reload()
            fsel = '#edf'
            await q.wait_for_selector(fsel, state='attached', timeout=20000)
            cur = (await api('GET', f'/api/drivers/{did}'))['d']
            cur = cur.get('driver', cur)
            rb = await api('PATCH', f'/api/drivers/{did}', {'site': 'DORTMUND', 'expected_updated_at': cur['updated_at']})
            _r(f'ok: {lang} Leitung B gespeichert' if rb['s'] == 200 else f'FEHLER: B {rb}')
            await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
            await q.fill(fsel + ' [name=personnel_no]', f'P-809-{RUN}-{lang}-neu')
            await q.click(fsel + ' button.btn')
            await q.wait_for_selector(fsel + ' [data-ctlost]', timeout=20000)
            txt = await q.inner_text(fsel + ' [data-ctlost]')
            _r(f'ok: {lang} Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis {txt}')
            pn = await q.input_value(fsel + ' [name=personnel_no]'); site = await q.input_value(fsel + ' [name=site]')
            _r(f'ok: {lang} eigene Personalnummer behalten, Standort von B übernommen' if pn == f'P-809-{RUN}-{lang}-neu' and site == 'DORTMUND' else f'FEHLER: {lang} Formular {pn} {site}')
            mark = await q.evaluate("() => document.querySelector('#edf [name=site]').classList.contains('ct-other') && !document.querySelector('#edf [name=personnel_no]').classList.contains('ct-other')")
            _r(f'ok: {lang} nur Standort markiert' if mark else f'FEHLER: {lang} Markierung')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT:
                await q.evaluate(f"() => document.querySelector('{fsel} [data-ctlost]').scrollIntoView({{ block: 'center' }})"); await q.screenshot(path=f'{OUT}/fahrerakte-gleichzeitig-{lang}-{w}.png')
            await q.click(fsel + ' button.btn')
            row = None
            for _ in range(40):
                await q.wait_for_timeout(250)
                row = (await api('GET', f'/api/drivers/{did}'))['d']; row = row.get('driver', row)
                if row.get('personnel_no') == f'P-809-{RUN}-{lang}-neu': break
            _r(f'ok: {lang} zweites Speichern: Personalnummer und Standort erhalten' if row.get('personnel_no') == f'P-809-{RUN}-{lang}-neu' and row.get('site') == 'DORTMUND' else f'FEHLER: {lang} gespeichert {row}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
