# [CLAUDE] UI-Test (01.11.2026, Backlog 805d, Blickwinkel „Funkloch“): Bußgeldvorgang „Angaben ändern“ und „Fahrer bestätigen“ ohne
# Antwort. Vorher kein Zeitlimit – der Knopf blieb ohne Ende gesperrt; ein zweiter Versuch meldete „Vorgang wurde zwischenzeitlich
# geändert“ (eigene, verlorene Speicherung). Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“, Knopf frei; erneut speichern
# meldet „War bereits gespeichert“, keine zweite Version, kein zweiter Verlaufseintrag. DE 390 / UK 820 / EN 1366 px.
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
            f = await api('POST', '/api/fines', {'kind': 'anhoerung', 'authority': f'Bußgeldstelle UI {lang}', 'reference': f'AZ-805d-{lang}', 'offense_type': 'parken',
                'offense_at': '2026-10-20T08:30', 'plate_in_letter': f'TZ-UI 83{i}', 'amount_eur': 30})
            _r(f'ok: {lang} Bußgeldvorgang angelegt' if f['s'] == 201 else f'FEHLER: Anlage {f}')
            fid = f['d']['id']
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])

            async def lost_retry(name, sel, fill):
                hold = asyncio.Event(); seen = []
                async def lost_answer(route):
                    if route.request.method != 'POST': await route.continue_(); return
                    resp = await route.fetch(); seen.append(resp.status)
                    await hold.wait()
                    try: await route.fulfill(response=resp)
                    except Exception: pass
                await q.evaluate(f"() => {{ const d = document.querySelector('{sel}').closest('details'); if (d) d.open = true; }}")
                await fill()
                glob = '**/api/fines/*/commands'
                await q.route(glob, lost_answer)
                btn = q.locator(sel + ' button').last
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(32):
                    await q.wait_for_timeout(250)
                    if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {w}px {name}: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px {name} hängt ohne Ende')
                _r(f'ok: {lang} {name} kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: {name} Server-Antwort {seen}')
                _r(f'ok: {lang} {name}: Knopf frei' if not await btn.is_disabled() else f'FEHLER: {name} Knopf gesperrt')
                if OUT: await q.screenshot(path=f'{OUT}/bussgeld-befehl-funkloch-{name}-{lang}-{w}.png')
                sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
                hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
                v1 = (await api('GET', f'/api/fines/{fid}'))['d']
                await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
                await btn.click()
                ok = False
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
                _r(f'ok: {lang} {name} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} {name} ohne Hinweis „bereits gespeichert“')
                v2 = (await api('GET', f'/api/fines/{fid}'))['d']
                _r(f'ok: {lang} {name}: keine zweite Version/kein zweiter Verlaufseintrag' if v2['fine']['version'] == v1['fine']['version'] and len(v2['events']) == len(v1['events'])
                   else f"FEHLER: {name} Version {v1['fine']['version']}→{v2['fine']['version']}, Einträge {len(v1['events'])}→{len(v2['events'])}")
                await q.wait_for_timeout(500)

            await q.goto(B + '/#/fines/' + fid); await q.reload(); await q.wait_for_selector('#uf', state='attached', timeout=20000)
            async def fill_uf(): await q.fill('#uf [name=amount_eur]', '45')
            await lost_retry('aendern', '#uf', fill_uf)
            await q.wait_for_selector('#cf', state='attached', timeout=20000)
            async def fill_cf():
                if await q.locator('#cf [name=driver_name_note]').count():
                    await q.evaluate("() => { const s = document.querySelector('#cf [name=driver_id]'); if (s) s.value = ''; }")
                    await q.fill('#cf [name=driver_name_note]', f'Fahrer laut Tourenplan {lang}')
                await q.select_option('#cf [name=basis]', 'tourenplan')
                await q.fill('#cf [name=evidence]', f'Tourenplan KW 43 {lang}')
            await lost_retry('fahrer', '#cf', fill_cf)
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Bußgeld-Befehle im Funkloch: alles grün')

asyncio.run(main())
