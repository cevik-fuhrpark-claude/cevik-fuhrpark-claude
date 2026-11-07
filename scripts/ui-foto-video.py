# [CLAUDE] UI-Test Backlog 1129 (Blickwinkel „Fahrer will ein Video bzw. eine Tonaufnahme vom Geräusch anhängen“): Wählt der Fahrer in „Melden“
# ein Video zusammen mit einem Foto, nennt ein Hinweis das Video (nicht gesendet), gesendet wird nur das Foto; nur ein Video → keine Auswahl
# „Fotos später senden“. Abfahrtskontrolle: Tonaufnahme mit Hinweis. Am Vorgang: Video mit eigenem Hinweis abgelehnt (nicht „Dateityp“).
# DE 390 / UK 820 / EN 1366 px, Fahrerkonto. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import asyncio, os, struct, zlib
fails = []
def _r(ok, m):
    print(('ok: ' if ok else 'FEHLER: ') + m)
    if not ok: fails.append(m)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
MEDIA = {'de': 'Videos und Tonaufnahmen', 'uk': 'Відео та аудіозаписи', 'en': 'videos or audio recordings'}
TYPE = {'de': 'Dateityp nicht erlaubt', 'uk': 'Тип файлу не дозволено', 'en': 'File type not allowed'}

def png(seed):
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes([seed * 40 % 256, 90, 160]) * 8 for _ in range(8))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
VIDEO = {'name': 'geraeusch_achse.mp4', 'mimeType': 'video/mp4', 'buffer': b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 200}
AUDIO = {'name': 'klopfen.m4a', 'mimeType': 'audio/mp4', 'buffer': b'\x00\x00\x00\x18ftypM4A ' + b'\x00' * 200}
async def media_state(q):
    return await q.evaluate("()=>{const d=document.querySelector('[data-photomedia]');return d?{h:d.hidden,t:d.textContent}:null}")

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fv.inhaber', 'display_name': 'FV Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r((await api('POST', '/api/login', {'username': 'fv.inhaber', 'password': PW}))['s'] == 200, 'Inhaber angemeldet')
        env = (await api('GET', '/api/me'))['d']['active_environment']
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            vin = f'WDB9634031129000{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'FV-ZZ 11{i}', 'vin': vin, 'site': 'Dortmund'})
            u = await api('POST', '/api/users', {'username': f'fv.fahrer.{lang}', 'display_name': f'FV Fahrer {lang}', 'role': 'driver', 'environment': env})
            await api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id'], 'evidence': 'Plan'})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            uploads = []; q.on('request', lambda r: uploads.append(r.headers.get('x-filename', '')) if r.method == 'POST' and '/files' in r.url else None)
            await q.goto(B)
            a = await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
            await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            _r(a['s'] == 200, f'{lang} Fahrer angemeldet')
            # Melden: nur Video → Hinweis, keine Auswahl „Fotos später“
            await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#ph', state='attached', timeout=20000)
            await q.set_input_files('#ph', [VIDEO])
            await q.wait_for_function("()=>{const d=document.querySelector('[data-photomedia]');return d&&!d.hidden}", timeout=5000)
            st = await media_state(q)
            _r(MEDIA[lang] in st['t'] and 'geraeusch_achse.mp4' in st['t'], f'{lang} Melden: Hinweis nennt das Video ({st["t"][:60]}…)')
            _r(not await q.locator('#phlater_w').is_visible(), f'{lang} Melden: nur Video → keine Auswahl „Fotos später“')
            # Video + Foto → Hinweis bleibt, „Fotos später“ für das Foto, gesendet wird nur das Foto
            await q.fill('#d', 'Klopfgeräusch hinten links bei Bodenwellen')
            await q.set_input_files('#ph', [VIDEO, {'name': 'achse.png', 'mimeType': 'image/png', 'buffer': png(1)}])
            await q.wait_for_selector('#phlater_w', state='visible', timeout=5000)
            st = await media_state(q); _r(not st['h'] and 'achse.png' not in st['t'], f'{lang} Melden: Hinweis nur mit dem Video')
            if OUT: await q.locator('[data-photomedia]').scroll_into_view_if_needed(); await q.screenshot(path=f'{OUT}/foto-video-melden-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(sw <= 0, f'{lang} kein waagerechtes Scrollen ({sw})')
            await q.click('#sb')
            await q.wait_for_url('**/#/cases/*', timeout=30000); await q.wait_for_timeout(2500)
            cid = q.url.split('#/cases/')[-1]
            fl = (await api('GET', f'/api/cases/{cid}'))['d']
            names = [f.get('filename') for f in (fl.get('files') or [])]
            _r(names == ['achse.png'], f'{lang} Vorgang: nur das Foto angehängt ({names})')
            _r(all('mp4' not in x for x in uploads), f'{lang} Video nicht gesendet ({uploads})')
            # Am Vorgang: Video wird mit eigenem Hinweis abgelehnt
            await q.reload(); await q.wait_for_selector('#file', state='attached', timeout=20000)
            await q.set_input_files('#file', [VIDEO])
            await q.wait_for_function(f"()=>[...document.querySelectorAll('#live,.toast,[role=alert],[role=status]')].some(e=>e.textContent.includes({MEDIA[lang]!r}))", timeout=15000)
            txt = await q.evaluate("()=>[...document.querySelectorAll('#live,.toast,[role=alert],[role=status]')].map(e=>e.textContent).join(' ')")
            _r(TYPE[lang] not in txt, f'{lang} Vorgang: eigener Hinweis statt „Dateityp“')
            if OUT: await q.screenshot(path=f'{OUT}/foto-video-vorgang-{lang}-{w}.png')
            n = len((await api('GET', f'/api/cases/{cid}'))['d'].get('files') or [])
            _r(n == 1, f'{lang} Vorgang: weiterhin 1 Datei ({n})')
            # Abfahrtskontrolle: Tonaufnahme
            await q.goto(B + f'/#/check/{vid}'); await q.reload(); await q.wait_for_selector('#ph', state='attached', timeout=20000)
            await q.set_input_files('#ph', [AUDIO])
            await q.wait_for_function("()=>{const d=document.querySelector('[data-photomedia]');return d&&!d.hidden}", timeout=5000)
            st = await media_state(q); _r('klopfen.m4a' in st['t'], f'{lang} Abfahrtskontrolle: Hinweis nennt die Tonaufnahme')
            if OUT: await q.locator('[data-photomedia]').scroll_into_view_if_needed(); await q.screenshot(path=f'{OUT}/foto-video-kontrolle-{lang}-{w}.png')
            await q.set_input_files('#ph', [{'name': 'ok.png', 'mimeType': 'image/png', 'buffer': png(2)}]); await q.wait_for_timeout(500)
            _r((await media_state(q))['h'], f'{lang} Abfahrtskontrolle: nur Foto → Hinweis weg')
            _r(not errs, f'{lang} keine Skriptfehler {errs[:1]}')
            await ctx.close()
        await br.close()
    print('FEHLER: ' + ' | '.join(fails) if fails else 'ALLES GRÜN'); raise SystemExit(1 if fails else 0)
asyncio.run(main())
