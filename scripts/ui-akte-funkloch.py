# [CLAUDE] UI-Test (01.11.2026, Backlog 804, Blickwinkel „Funkloch“): Anlageformulare der Fahrzeug- und Fahrerakte ohne Antwort.
# Vorher hatten Prüftermin anlegen, Vertrag erfassen, Nachweis in der Fahrerakte und Führerscheinkontrolle kein Zeitlimit – blieb die Antwort
# aus (Anfrage kam an, Antwort nicht), blieb „Speichern“ ohne Ende gesperrt; ein zweiter Versuch legte Prüftermin „Sonstiges“ bzw. den
# Nachweis doppelt an. Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei, Eingaben bleiben;
# erneut speichern meldet „War bereits gespeichert“ und legt nichts doppelt an. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, datetime
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
FAST = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout;
  window.setTimeout = (f, ms, ...a) => st(f, (ms === 60000 && /app-main\\.js/.test(new Error().stack || '')) ? 1500 : ms, ...a); })();"""
NOCONN = {'de': 'Keine Verbindung', 'uk': 'Немає з’єднання', 'en': 'No connection'}
SAVED = {'de': 'War bereits gespeichert', 'uk': 'Уже було збережено', 'en': 'Already saved'}
VIN = 'WDB96340310804002'; VID = 'VIN:' + VIN
TODAY = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).date().isoformat()

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ak.inhaber', 'display_name': 'AK Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'ak.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        await api('POST', '/api/vehicles', {'plate': 'AK-UI 804', 'vin': VIN, 'site': 'Dortmund'})
        for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
            await api('PATCH', '/api/me', {'language': lang})
            drv = await api('POST', '/api/drivers', {'display_name': f'Funkloch Fahrer {lang}'})
            DID = drv['d']['id']
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'ak.inhaber', 'password': PW}])

            async def lost_retry(name, sel, glob, fill):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method not in ('POST', 'PUT'): await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.evaluate("s => { const d = document.querySelector(s).closest('details'); if (d) d.open = true; }", sel)
                await fill()
                await q.route(glob, lost_answer)
                btn = q.locator(sel + ' button').last
                await btn.click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: {name} Server-Antwort {seen}')
                _r(f'ok: {lang} {name}: Knopf frei' if not await btn.is_disabled() else f'FEHLER: {name} Knopf gesperrt')
                if OUT: await q.screenshot(path=f'{OUT}/akte-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                await q.evaluate("() => document.querySelectorAll('.toast, #toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“')

            # Fahrzeugakte: Prüftermin „Sonstiges“ und Vertrag
            await q.goto(B + '/#/vehicles/' + VID); await q.reload(); await q.wait_for_selector('#mf', state='attached', timeout=20000)
            title = f'Ladekran {lang}'
            async def fill_mf():
                await q.select_option('#mf [name=kind]', 'Sonstiges'); await q.fill('#mf [name=title]', title)
                await q.fill('#mf [name=next_due_date]', TODAY[:4] + '-12-31'); await q.fill('#mf [name=evidence]', 'Plakette')
            await lost_retry('pruef', '#mf', '**/maintenance', fill_mf)
            d = (await api('GET', f'/api/vehicles/{VID}'))['d']
            n = sum(1 for r in d['maintenance'] if r.get('title') == title)
            _r(f'ok: {lang} genau ein Prüftermin' if n == 1 else f'FEHLER: {n} Prüftermine')
            await q.wait_for_selector('#ctf', state='attached', timeout=15000)
            partner = f'Funkloch-Leasing {lang}'
            async def fill_ct():
                await q.select_option('#ctf [name=kind]', 'leasing'); await q.fill('#ctf [name=partner]', partner); await q.fill('#ctf [name=contract_no]', 'FL-' + lang)
                await q.fill('#ctf [name=start_date]', TODAY); await q.fill('#ctf [name=evidence]', 'Vertrag')
            await lost_retry('vertrag', '#ctf', '**/contracts', fill_ct)
            d = (await api('GET', f'/api/vehicles/{VID}'))['d']
            n = sum(1 for c in d['contracts'] if c.get('partner') == partner)
            _r(f'ok: {lang} genau ein Vertrag' if n == 1 else f'FEHLER: {n} Verträge')
            # Fahrerakte: Nachweis (Unterweisung) und Führerscheinkontrolle
            await q.goto(B + '/#/drivers/' + DID); await q.wait_for_selector('#ddf', state='attached', timeout=20000)
            dt = f'Ladungssicherung {lang}'
            async def fill_dd():
                await q.select_option('#ddf [name=kind]', 'unterweisung'); await q.fill('#ddf [name=title]', dt)
                await q.fill('#ddf [name=issued_on]', TODAY); await q.fill('#ddf [name=evidence]', 'Teilnehmerliste')
            await lost_retry('nachweis', '#ddf', '**/documents', fill_dd)
            import json
            n = json.dumps((await api('GET', f'/api/drivers/{DID}'))['d'], ensure_ascii=False).count(dt)
            _r(f'ok: {lang} genau ein Nachweis' if n == 1 else f'FEHLER: {n} Nachweise')
            await q.wait_for_selector('#lcf', state='attached', timeout=15000)
            async def fill_lc():
                await q.select_option('#lcf [name=result]', 'in_ordnung')
            await lost_retry('kontrolle', '#lcf', '**/license-checks', fill_lc)
            dd = (await api('GET', f'/api/drivers/{DID}'))['d']
            lcs = [x for x in (dd.get('license_checks') or []) if not x.get('cancelled_at')]
            _r(f'ok: {lang} genau eine Führerscheinkontrolle' if len(lcs) == 1 else f'FEHLER: {len(lcs)} Kontrollen ({list(dd.keys())[:20]})')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Fahrzeug-/Fahrerakte im Funkloch: alles grün')

asyncio.run(main())
