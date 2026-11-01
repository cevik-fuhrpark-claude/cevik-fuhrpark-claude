# [CLAUDE] UI-Test (01.11.2026, Backlog 805e, Blickwinkel „Funkloch“): Fahrerakte, Fahrzeug und Benutzer anlegen ohne Antwort.
# Vorher kein Zeitlimit – der Knopf blieb ohne Ende gesperrt; ein zweiter Versuch legte eine zweite Fahrerakte an (gleiche Namen sind
# erlaubt) bzw. meldete „FIN besteht bereits“/„Benutzername vergeben“. Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“,
# Knopf frei; erneut speichern meldet „War bereits gespeichert“ (Fahrerakte/Fahrzeug öffnen sich), nie doppelt. DE 390 / UK 820 / EN 1366 px.
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
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])

            async def lost_retry(name, sel, glob, fill, after=None):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != 'POST': await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.evaluate(f"() => {{ const d = document.querySelector('{sel}').closest('details'); if (d) d.open = true; }}")
                await fill()
                await q.route(glob, lost_answer)
                btn = q.locator(sel + ' button').last
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: {name} Server-Antwort {seen}')
                _r(f'ok: {lang} {name}: Knopf frei' if not await btn.is_disabled() else f'FEHLER: {name} Knopf gesperrt')
                if OUT: await q.screenshot(path=f'{OUT}/anlegen-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“')
                if OUT: await q.screenshot(path=f'{OUT}/anlegen-funkloch-{name}-erneut-{lang}-{w}.png')

            # Fahrerakte
            await q.goto(B + '/#/drivers'); await q.reload(); await q.wait_for_selector('#ndf', state='attached', timeout=20000)
            dname = f'Fahrer Funkloch {lang}'
            async def fill_d(): await q.fill('#ndf [name=display_name]', dname)
            await lost_retry('fahrerakte', '#ndf', '**/api/drivers', fill_d)
            await q.wait_for_url('**/#/drivers/*', timeout=10000)
            n = sum(1 for x in (await api('GET', '/api/drivers'))['d']['drivers'] if x['display_name'] == dname)
            _r(f'ok: {lang} genau eine Fahrerakte, Akte geöffnet' if n == 1 else f'FEHLER: {n} Fahrerakten')
            # Fahrzeug
            await q.goto(B + '/#/vehicles'); await q.wait_for_selector('#nvf', state='attached', timeout=20000)
            vin = f'WDB96340310805F0{i}'
            async def fill_v():
                await q.fill('#nvf [name=vin]', vin); await q.fill('#nvf [name=plate]', f'TZ-FL 80{i}')
            await lost_retry('fahrzeug', '#nvf', '**/api/vehicles', fill_v)
            await q.wait_for_url('**/#/vehicles/VIN*', timeout=10000)
            _r(f'ok: {lang} Fahrzeugakte geöffnet' if vin in q.url else f'FEHLER: Adresse {q.url}')
            # Benutzer
            await q.goto(B + '/#/users'); await q.wait_for_selector('#nf', state='attached', timeout=20000)
            uname = f'tz.funkloch.{lang}'
            async def fill_u():
                await q.fill('#nf [name=display_name]', f'Funkloch {lang}'); await q.fill('#nf [name=username]', uname); await q.select_option('#nf [name=role]', 'dispatch')
            await lost_retry('benutzer', '#nf', '**/api/users', fill_u)
            us = (await api('GET', '/api/users'))['d']
            us = us.get('users', us) if isinstance(us, dict) else us
            n = sum(1 for x in us if x.get('username') == uname)
            _r(f'ok: {lang} genau ein Benutzer' if n == 1 else f'FEHLER: {n} Benutzer')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Anlegen im Funkloch: alles grün')

asyncio.run(main())
