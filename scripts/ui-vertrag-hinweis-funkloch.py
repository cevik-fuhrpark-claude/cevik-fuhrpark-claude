# [CLAUDE] UI-Test (01.11.2026, Backlog 805g, Blickwinkel „Funkloch“): Vertrag beenden und Hinweis zum Fahrzeug archivieren ohne Antwort.
# Vorher kein Zeitlimit (Knopf ohne Ende gesperrt); ein zweiter Versuch meldete „Vertrag ist bereits beendet“ bzw. „Hinweis nicht gefunden“.
# Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“; erneut beenden meldet „War bereits gespeichert“, erneut archivieren gelingt
# ohne Fehlermeldung. DE 390 / UK 820 / EN 1366 px.
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
            vin = f'WDB96340310805H0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-VB 80{i}', 'vin': vin, 'site': 'Dortmund'})
            ct = await api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'miete', 'partner': f'Miete {lang}', 'evidence': f'MV {lang}'})
            nt = await api('POST', f'/api/vehicles/{vid}/notes', {'text': f'Hinweis Funkloch {lang}'})
            _r(f'ok: {lang} Vertrag/Hinweis angelegt' if ct['s'] == 201 and nt['s'] == 201 else f'FEHLER: Vorbereitung {ct} {nt}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/vehicles/' + vid); await q.reload(); await q.wait_for_selector(f'[data-ctend="{ct["d"]["id"]}"]', state='attached', timeout=20000)

            async def lost(glob, click, name):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != 'POST': await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.route(glob, lost_answer)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: {name} Server-Antwort {seen}')
                if OUT: await q.screenshot(path=f'{OUT}/vertrag-hinweis-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await click()

            fsel = f'[data-ctend="{ct["d"]["id"]}"]'
            await q.evaluate(f"() => document.querySelector('{fsel}').closest('details').open = true")
            await q.fill(fsel + ' [name=end_note]', f'Rückgabe {lang}')
            await lost('**/end', lambda: q.click(fsel + ' button'), 'vertrag')
            ok = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} vertrag erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} vertrag ohne Hinweis „bereits gespeichert“')
            c = [x for x in (await api('GET', f'/api/vehicles/{vid}'))['d']['contracts'] if x['id'] == ct['d']['id']][0]
            _r(f'ok: {lang} Vertrag beendet ({c.get("ended_on")})' if c.get('ended_on') else 'FEHLER: Vertrag nicht beendet')
            await q.wait_for_selector(f'[data-arch="{nt["d"]["id"]}"]', state='attached', timeout=20000)
            await lost('**/archive', lambda: q.click(f'[data-arch="{nt["d"]["id"]}"]'), 'hinweis')
            await q.wait_for_timeout(1500)
            tb = (await q.inner_text('body')).lower()
            bad = any(x in tb for x in ['nicht gefunden', 'не знайдено', 'not found'])
            _r(f'ok: {lang} hinweis erneut archiviert ohne Fehlermeldung' if not bad and not await q.locator(f'[data-arch="{nt["d"]["id"]}"]').count() else f'FEHLER: {lang} hinweis: {tb[:200]}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Vertrag/Hinweis im Funkloch: alles grün')

asyncio.run(main())
