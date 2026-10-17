# [CLAUDE] UI-Test: Offline-Postausgang (17.10.2026) – Fotos einer offline gespeicherten Abfahrtskontrolle am Folgeauftrag, während des
# Sendens neu gespeicherte Meldung bleibt, nach 503 erneut gesendet, Umgebung bleibt. Frischer Dev-Server nötig (CFP_URL, Standard 8787).
import asyncio, base64, os, sys, json
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body, env]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (env) h['x-cfp-env'] = env;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fjcWfAAAAAElFTkSuQmCC')
import tempfile
FOTO = os.path.join(tempfile.gettempdir(), 'cfp-postausgang-foto.png')
open(FOTO, 'wb').write(PNG)
VIN = 'VIN:WDB96340310777001'
res = {}

async def login(br, viewEnv=None):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); q = await ctx.new_page()
    errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
    await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'pb.inhaber', 'password': PW}, None])
    if viewEnv: await q.evaluate(f"localStorage.setItem('cfp_env','{viewEnv}')")
    return ctx, q, errs

async def offline(q):
    async def h(route): await route.abort()
    await q.route('**/api/**', h); return h

async def outbox_len(q):
    return await q.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('cfp_outbox_')).reduce((n, k) => n + JSON.parse(localStorage.getItem(k)).length, 0)")

async def fill_report(q, text):
    await q.goto(B + '/#/'); await q.wait_for_timeout(200); await q.goto(B + '/#/new'); await q.wait_for_selector('#d')
    await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d', text)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); a = await br.new_page(); await a.goto(B)
        api = lambda m, pa, b=None, env=None: a.evaluate(JS, [m, pa, b, env])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pb.inhaber', 'display_name': 'PB Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'pb.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'PB-OB 1', 'vin': VIN[4:], 'site': 'Dortmund'})
        cases = lambda env=None: api('GET', '/api/cases?f=all', None, env)

        # ---- 1. Abfahrtskontrolle offline mit Mangel + Foto: Foto erreicht den Folgeauftrag nie ----
        ctx, q, errs = await login(br)
        await q.goto(B + '/#/check'); await q.wait_for_selector('.checkitem')
        await q.select_option('#v', VIN)
        await q.evaluate("""() => { const rows = [...document.querySelectorAll('.checkitem')];
          rows.forEach((r, i) => r.querySelector(`input[value=${i === 0 ? 'mangel' : 'ok'}]`).click()); }""")
        await q.locator('.checkitem').first.locator('input[name$="__note"]').fill('Blinker links defekt')
        await q.set_input_files('#ph', FOTO)
        h = await offline(q); await q.click('#sb'); await q.wait_for_selector('.panel.alert')
        print('1) Postausgang nach Offline-Kontrolle:', await outbox_len(q))
        await q.unroute('**/api/**', h)
        uploads = []
        q.on('response', lambda r: uploads.append(f"{r.request.method} {r.url.split('8789')[-1]} -> {r.status}") if '/files' in r.url else None)
        await q.evaluate("window.dispatchEvent(new Event('online'))"); await q.wait_for_timeout(2500)
        fu = [c for c in (await cases())['d']['cases'] if c['vehicle_id'] == VIN and c.get('origin') == 'kontrolle']
        files = (await api('GET', f"/api/cases/{fu[0]['id']}"))['d'].get('files', []) if fu else None
        print('   Upload-Aufrufe:', uploads)
        print('   Folgeauftrag:', fu[0]['case_no'] if fu else None, '| Dateien am Folgeauftrag:', len(files) if files is not None else None, '(erwartet 1)')
        print('   Postausgang danach:', await outbox_len(q), '| IndexedDB-Fotos gelöscht:', await q.evaluate("""() => new Promise(r => { const o = indexedDB.open('cfp_outbox', 1); o.onsuccess = () => { const c = o.result.transaction('photos').objectStore('photos').count(); c.onsuccess = () => r(c.result === 0); }; })"""))
        res['1'] = (len(files) if files is not None else -1) == 0
        await ctx.close()

        # ---- 2. Neue Offline-Meldung während eines laufenden Sendevorgangs geht verloren ----
        ctx, q, errs = await login(br)
        await fill_report(q, 'Meldung A – im Funkloch erfasst')
        h = await offline(q); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', h)
        async def slow_or_fail(route):
            body = route.request.post_data or ''
            if route.request.method == 'POST' and 'Meldung A' in body: await asyncio.sleep(3); await route.continue_()
            elif route.request.method == 'POST': await route.abort()   # Netz wieder weg für Meldung B
            else: await route.continue_()
        await q.route('**/api/cases', slow_or_fail)
        await q.evaluate("window.dispatchEvent(new Event('online'))")   # Postausgang startet, POST A hängt 3 s
        await q.wait_for_timeout(300)
        await fill_report(q, 'Meldung B – Bremse quietscht stark')
        await q.click('#sb'); await q.wait_for_selector('.panel.alert')
        print('2) Postausgang direkt nach Speichern von B:', await outbox_len(q))
        await q.wait_for_timeout(4000)
        n = await outbox_len(q)
        descs = [c['description'] for c in (await cases())['d']['cases']]
        print('   nach Ende des Sendevorgangs: Postausgang', n, '| A am Server:', any('Meldung A' in d for d in descs), '| B am Server:', any('Meldung B' in d for d in descs), '(erwartet: B im Postausgang)')
        res['2'] = n == 0 and not any('Meldung B' in d for d in descs)
        await ctx.close()

        # ---- 3. Server-/Gateway-Fehler (503) beim Nachsenden: Meldung wird endgültig verworfen ----
        ctx, q, errs = await login(br)
        await fill_report(q, 'Meldung C – Spiegel abgebrochen')
        h = await offline(q); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', h)
        async def unavailable(route):
            if route.request.method == 'POST': await route.fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'unavailable', 'message': 'Dienst kurz nicht verfügbar'}))
            else: await route.continue_()
        await q.route('**/api/cases', unavailable)
        await q.evaluate("window.dispatchEvent(new Event('online'))"); await q.wait_for_timeout(1500)
        await q.unroute('**/api/cases', unavailable)
        await q.goto(B + '/#/'); await q.wait_for_timeout(1500)   # weitere Seitenaufrufe → flushOutbox
        n = await outbox_len(q); descs = [c['description'] for c in (await cases())['d']['cases']]
        print('3) nach 503 und wieder funktionierendem Server: Postausgang', n, '| C am Server:', any('Meldung C' in d for d in descs), '(erwartet: C später gesendet)')
        res['3'] = n == 0 and not any('Meldung C' in d for d in descs)
        await ctx.close()

        # ---- 4. Inhaber: offline in „Test“ erfasst, nach Umgebungswechsel in „Betrieb“ angelegt ----
        ctx, q, errs = await login(br, viewEnv='test')
        await fill_report(q, 'Meldung D – Schulung in der Testumgebung')
        h = await offline(q); await q.click('#sb'); await q.wait_for_selector('.panel.alert'); await q.unroute('**/api/**', h)
        await q.goto(B + '/#/more'); await q.wait_for_selector('#envsel')
        await q.select_option('#envsel', 'production'); await q.wait_for_timeout(2000)
        inT = any('Meldung D' in c['description'] for c in (await cases('test'))['d']['cases'])
        inP = [c['case_no'] for c in (await cases('production'))['d']['cases'] if 'Meldung D' in c['description']]
        print('4) Meldung D in Test:', inT, '| in Betrieb:', inP, '(erwartet: nur Test)')
        res['4'] = bool(inP) and not inT
        await ctx.close(); await br.close()
    print('Fehler (True = Fehler):', res)
    bad = [k for k, v in res.items() if v]
    print('FEHLER: ' + ', '.join(bad) if bad else 'Postausgang: alles grün')
    raise SystemExit(1 if bad else 0)

asyncio.run(main())
