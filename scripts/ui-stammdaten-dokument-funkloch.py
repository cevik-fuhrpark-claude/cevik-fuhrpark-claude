# [CLAUDE] UI-Test (01.11.2026, Backlog 805c, Blickwinkel „Funkloch“): Fahrzeug-Stammdaten (Gesamtmasse/Erstzulassung) und
# Dokument-Upload der Fahrzeugakte ohne Antwort. Vorher kein Zeitlimit – der Knopf blieb ohne Ende gesperrt; ein zweiter Versuch der
# Stammdaten meldete „Inzwischen von jemand anderem geändert“ (eigene, verlorene Speicherung), das Dokument „bereits vorhanden“.
# Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS 60 s → 1,5 s, PHOTO_TIMEOUT_MS 120 s → 2,5 s) „Keine Verbindung“, Knopf frei; erneut
# speichern mit denselben Eingaben meldet „War bereits gespeichert“ und legt nichts doppelt an. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, json
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
FAST = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout;
  window.setTimeout = (f, ms, ...a) => st(f, ((ms === 60000 || ms === 120000) && /app-main\\.js/.test(new Error().stack || '')) ? (ms === 60000 ? 1500 : 2500) : ms, ...a); })();"""
NOCONN = {'de': 'Keine Verbindung', 'uk': 'Немає з’єднання', 'en': 'No connection'}
SAVED = {'de': 'War bereits gespeichert', 'uk': 'Уже було збережено', 'en': 'Already saved'}
PDF = b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'

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
            vin = f'WDB9634031080520{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-UI 82{i}', 'vin': vin, 'site': 'Dortmund'})
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])

            async def lost_retry(name, sel, glob, fill, wait_s=8):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != 'POST': await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.evaluate(f"() => document.querySelector('{sel}').closest('details').open = true")
                await fill()
                await q.route(glob, lost_answer)
                btn = q.locator(sel + ' button').last
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(wait_s * 4):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: {name} Server-Antwort {seen}')
                _r(f'ok: {lang} {name}: Knopf frei' if not await btn.is_disabled() else f'FEHLER: {name} Knopf gesperrt')
                if OUT: await q.screenshot(path=f'{OUT}/stammdaten-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“ ({(await q.inner_text(".toast")) if await q.locator(".toast").count() else ""})')

            await q.goto(B + '/#/vehicles/' + vid); await q.reload(); await q.wait_for_selector('#specf', state='attached', timeout=20000)
            async def fill_spec():
                await q.fill('#specf [name=zgm_kg]', '18000'); await q.fill('#specf [name=spec_source]', f'Fahrzeugschein {lang}')
            await lost_retry('stammdaten', '#specf', '**/spec', fill_spec)
            v = (await api('GET', f'/api/vehicles/{vid}'))['d']['vehicle']
            _r(f'ok: {lang} Stammdaten gespeichert (18000 kg)' if v.get('zgm_kg') == 18000 else f'FEHLER: Stammdaten {v.get("zgm_kg")}')
            await q.wait_for_selector('#docf', state='attached', timeout=20000)
            async def fill_doc():
                await q.fill('#docf [name=note]', f'Zulassung {lang}')
                await q.set_input_files('#docf [name=file]', files=[{'name': f'zb1-{lang}.pdf', 'mimeType': 'application/pdf', 'buffer': PDF + lang.encode()}])
            await lost_retry('dokument', '#docf', '**/documents*', fill_doc, wait_s=12)
            docs = (await api('GET', f'/api/vehicles/{vid}'))['d'].get('documents') or []
            n = sum(1 for x in docs if f'zb1-{lang}' in json.dumps(x))
            _r(f'ok: {lang} genau ein Dokument' if n == 1 else f'FEHLER: {n} Dokumente')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Stammdaten/Dokument im Funkloch: alles grün')

asyncio.run(main())
