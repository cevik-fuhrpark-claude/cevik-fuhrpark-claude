# [CLAUDE] UI-Test (01.11.2026, Backlog 807, Blickwinkel „Fahrer im Ausland, Roaming teuer – Fotos später“): Meldung mit „Fotos erst später senden“.
# Auswahl erscheint erst mit gewählten Fotos; Meldung geht sofort, Fotos bleiben auf dem Gerät (kein Upload), Vorgang zeigt „N Fotos folgen“,
# Startseite den Hinweis mit „Fotos jetzt senden“ (sendet) bzw. „Fotos nicht senden“ (verwirft, UK). DE 390 / UK 820 / EN 1366 px, Fahrerkonto.
import asyncio, os, struct, zlib
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""

def png(seed):  # kleines gültiges PNG (8×8, Farbe je Foto verschieden)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes([seed * 40 % 256, 90, 160]) * 8 for _ in range(8))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fs.inhaber', 'display_name': 'FS Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'fs.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        env = (await api('GET', '/api/me'))['d']['active_environment']
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            vin = f'WDB9634031080700{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'FS-ZZ 80{i}', 'vin': vin, 'site': 'Dortmund'})
            u = await api('POST', '/api/users', {'username': f'fs.fahrer807.{lang}', 'display_name': f'FS Fahrer 807 {lang}', 'role': 'driver', 'environment': env})
            await api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id'], 'evidence': 'Plan'})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            uploads = []; q.on('request', lambda r: uploads.append(r.url) if r.method == 'POST' and '/files' in r.url else None)
            await q.goto(B)
            a = await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
            await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            _r(f'ok: {lang} Fahrer angemeldet' if a['s'] == 200 else f'FEHLER: Einladung {a}')
            await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#ph', state='attached', timeout=20000)
            _r(f'ok: {lang} Auswahl ohne Fotos verborgen' if not await q.locator('#phlater_w').is_visible() else f'FEHLER: {lang} Auswahl ohne Fotos sichtbar')
            await q.fill('#d', 'Spiegel rechts gebrochen, Parkplatz bei Poznań')
            await q.set_input_files('#ph', [{'name': f'f{k}.png', 'mimeType': 'image/png', 'buffer': png(k)} for k in range(2)])
            await q.wait_for_selector('#phlater_w', state='visible', timeout=5000)
            await q.check('#phlater')
            if OUT: await q.locator('#phlater_w').scroll_into_view_if_needed(); await q.screenshot(path=f'{OUT}/fotos-spaeter-form-{lang}-{w}.png')
            await q.click('#sb')
            await q.wait_for_selector('[data-photoslater]', timeout=20000)
            cid = q.url.split('#/cases/')[-1]
            txt = await q.locator('[data-photoslater]').inner_text()
            _r(f'ok: {lang} Vorgang: „{txt[:70]}…“' if '2' in txt and '0' in txt else f'FEHLER: {lang} Ankündigung {txt}')
            _r(f'ok: {lang} Knopf „jetzt senden“ am Vorgang' if await q.locator('[data-photoslater] [data-obx-release]').count() == 1 else f'FEHLER: {lang} Knopf am Vorgang fehlt')
            await q.wait_for_timeout(1500)
            _r(f'ok: {lang} kein Foto-Upload' if not uploads else f'FEHLER: {lang} Fotos trotzdem hochgeladen {uploads}')
            fl = (await api('GET', f'/api/cases/{cid}'))['d']
            _r(f'ok: {lang} Leitung sieht 2 angekündigt, 0 eingegangen' if fl['photos_later'] == {'announced': 2, 'received': 0} and not fl['files'] else f'FEHLER: {lang} Leitung {fl.get("photos_later")}')
            await q.goto(B + '/#/'); await q.wait_for_selector('[data-outboxheld]', timeout=20000)
            ht = await q.locator('[data-outboxheld]').inner_text()
            _r(f'ok: {lang} Startseite: „{ht[:60]}…“' if '2' in ht and fl['case']['case_no'] in ht else f'FEHLER: {lang} Startseiten-Hinweis {ht}')
            if OUT: await q.locator('[data-outboxheld]').screenshot(path=f'{OUT}/fotos-spaeter-start-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if lang == 'uk':
                q.once('dialog', lambda d: d.accept())
                await q.click('[data-obx-held-del]')
                await q.wait_for_selector('[data-outboxheld]', state='detached', timeout=10000)
                await q.wait_for_timeout(1000)
                n = len((await api('GET', f'/api/cases/{cid}'))['d']['files'])
                _r(f'ok: {lang} verworfen: Hinweis weg, keine Fotos gesendet' if n == 0 and not uploads else f'FEHLER: {lang} verwerfen ({n})')
                left = await q.evaluate("() => Object.keys(localStorage).filter((k) => k.startsWith('cfp_outbox_')).map((k) => JSON.parse(localStorage.getItem(k) || '[]').length).reduce((a, b) => a + b, 0)")
                _r(f'ok: {lang} Postausgang leer' if left == 0 else f'FEHLER: {lang} Postausgang {left}')
            else:
                await q.click('#outbox_held [data-obx-release]')
                await q.wait_for_selector('[data-outboxheld]', state='detached', timeout=20000)
                for _ in range(40):  # Hochladen läuft nach dem Ausblenden des Hinweises weiter
                    fl = (await api('GET', f'/api/cases/{cid}'))['d']
                    if len(fl['files']) >= 2: break
                    await q.wait_for_timeout(500)
                await q.wait_for_selector('#outbox_area', state='detached', timeout=20000)
                _r(f'ok: {lang} jetzt gesendet: 2 Fotos am Vorgang' if len(fl['files']) == 2 and fl['photos_later']['received'] == 2 else f'FEHLER: {lang} gesendet {len(fl["files"])}')
                await q.goto(B + f'/#/cases/{cid}'); await q.wait_for_selector('.thumbs', state='attached', timeout=20000)
                _r(f'ok: {lang} Vorgang ohne Ankündigung (alle da)' if await q.locator('[data-photoslater]').count() == 0 else f'FEHLER: {lang} Ankündigung bleibt')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Fotos später senden: alles grün')

asyncio.run(main())
