# [CLAUDE] UI-Test (31.10.2026, Backlog 798, Blickwinkel „Fahrer im Funkloch“): Meldung/Abfahrtskontrolle ohne Antwort.
# Im Funkloch kann eine Anfrage ohne Fehler hängen bleiben (keine Antwort, kein Abbruch). Vorher hatte nur der Foto-Upload ein Zeitlimit –
# beim Senden einer Meldung oder Abfahrtskontrolle blieb der Knopf ohne Ende gesperrt, nichts kam in den Postausgang.
# Nachstellung: die Anfrage erreicht den Server (Meldung wird angelegt), die Antwort kommt aber nicht an. Frist im Test 2 s statt 60 s
# (setTimeout-Rückfall, AbortSignal.timeout entfernt). Erwartet: „im Postausgang gespeichert“, Eingaben nicht verloren; Netz wieder da →
# Postausgang sendet erneut mit demselben request_key, der Server meldet „duplicate“ → genau EINE Meldung bzw. Kontrolle.
# Meldung DE/UK/EN 390 px, Abfahrtskontrolle DE 390 px und EN 1366 px. Gegen den alten Stand rot (Knopf hängt).
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310798001'; PLATE = 'FL-ZL 8'
OLD = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms === 60000 ? 2000 : ms, ...a); })();"""
SAVED = {'de': 'auf diesem Gerät gespeichert', 'uk': 'збережено на цьому пристрої', 'en': 'stored on this device'}

async def wait_alert(q, secs=10):
    for _ in range(secs * 4):
        await q.wait_for_timeout(250)
        if await q.locator('.panel.alert').count(): return True
    return False

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fl.inhaber', 'display_name': 'FL Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fl.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': PLATE, 'vin': VIN, 'site': 'Dortmund'})
        runs = [('case', 'de', 390), ('case', 'uk', 390), ('case', 'en', 390), ('check', 'de', 390), ('check', 'en', 1366)]
        for kind, lang, w in runs:
            await api('PATCH', '/api/me', {'language': lang})
            ctx = await br.new_context(viewport={'width': w, 'height': 844 if w < 500 else 900}, service_workers='block'); await ctx.add_init_script(OLD)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'fl.inhaber', 'password': PW}])
            mark = f'FUNKLOCH-{kind}-{lang}-{w}'
            path = '/api/cases' if kind == 'case' else '/api/inspections'
            before = len((await api('GET', '/api/cases?f=all'))['d']['cases']); insp0 = None
            if kind == 'check':
                await q.goto(B + '/#/check'); await q.reload(); await q.wait_for_selector('.checkitem', timeout=15000)
                await q.select_option('#v', f'VIN:{VIN}')
                row = 0 if w < 500 else 1  # je Lauf ein anderer Prüfpunkt (gleicher Mangel würde nur als Wiederholung vermerkt)
                await q.evaluate("""(row) => { const rows = [...document.querySelectorAll('.checkitem')];
                  rows.forEach((r, i) => r.querySelector(`input[value=${i === row ? 'mangel' : 'ok'}]`).click()); }""", row)
                await q.locator('.checkitem').nth(row).locator('input[name$="__note"]').fill(mark)
            else:
                await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#d', timeout=15000)
                await q.fill('#vq', PLATE); await q.locator('.vehpick label:not([hidden])').filter(has_text=PLATE).first.click()
                await q.fill('#d', f'Spiegel rechts abgebrochen {mark}')
            hang = asyncio.Event(); seen = []
            async def lost_answer(route):  # Anfrage kommt an, Antwort geht im Funkloch verloren
                if route.request.method != 'POST': await route.continue_(); return
                resp = await route.fetch(); seen.append(resp.status)
                await hang.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            await q.route('**' + path, lost_answer)
            await q.click('#sb')
            ok_alert = await wait_alert(q)
            txt = await q.inner_text('#main')
            _r(f'ok: {kind} {lang} {w}px nach dem Zeitlimit im Postausgang gespeichert' if ok_alert and SAVED[lang].lower() in txt.lower() else f'FEHLER: {kind} {lang} {w}px Senden hängt ohne Ende: {txt[:160]!r}')
            _r(f'ok: {kind} {lang} erste Anfrage kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: Server-Antwort {seen}')
            if OUT: await q.screenshot(path=f'{OUT}/funkloch-{kind}-{lang}-{w}.png')
            hang.set(); await q.wait_for_timeout(300); await q.unroute('**' + path)
            await q.goto(B + '/#/'); await q.wait_for_timeout(500); await q.reload(); await q.wait_for_timeout(3500)  # Netz wieder da
            ob = await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v)).length")
            _r(f'ok: {kind} {lang} Postausgang nach dem Nachsenden leer' if ob == 0 else f'FEHLER: Postausgang {ob}')
            cs = (await api('GET', '/api/cases?f=all'))['d']['cases']
            if kind == 'case':
                n = len([c for c in cs if mark in c['description']])
                _r(f'ok: {kind} {lang} genau eine Meldung (duplicate erkannt)' if n == 1 else f'FEHLER: {n} Meldungen')
            else:
                n = len(cs) - before
                _r(f'ok: {kind} {lang} genau ein Folgeauftrag aus der Kontrolle (duplicate erkannt)' if n == 1 else f'FEHLER: {n} neue Vorgänge')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Funkloch – Senden mit Zeitlimit: alles grün')

asyncio.run(main())
