# [CLAUDE] UI-Test (01.11.2026, Backlog 805f, Blickwinkel „Funkloch“): Werkstattplan „Termin setzen“ ohne Antwort. Vorher kein
# Zeitlimit (Knopf ohne Ende gesperrt) und je Klick eine neue Befehlskennung – ein zweiter Versuch meldete „zwischenzeitlich geändert“
# und lud den Plan neu. Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“, Knopf frei; erneut setzen schickt dieselbe Kennung
# → „War bereits gespeichert“, keine zweite Version. DE 390 / UK 820 / EN 1366 px.
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
        ws_site = (await api('GET', '/api/meta'))['d']['workshops'][0]['code']
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            await api('PATCH', '/api/me', {'language': lang})
            vin = f'WDB96340310805G0{i}'; vid = 'VIN:' + vin
            await api('POST', '/api/vehicles', {'plate': f'TZ-WP 80{i}', 'vin': vin, 'site': 'Dortmund'})
            c = await api('POST', '/api/cases', {'vehicle_id': vid, 'description': f'Werkstattplan Funkloch {lang}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': f'wp-805f-{lang}'})
            cid = c['d']['id']
            async def apicmd(action, payload=None, note=None):
                v = (await api('GET', f'/api/cases/{cid}'))['d']['case']['version']
                return await api('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'ui-{action}-{cid}', 'expected_version': v, 'note': note, 'payload': payload or {}})
            a1 = await apicmd('approve_repair', {'workshop_site': ws_site}, 'Funkloch-Test'); a2 = await apicmd('acknowledge')
            _r(f'ok: {lang} Auftrag übernommen' if a1['s'] == 200 and a2['s'] == 200 else f'FEHLER: Vorbereitung {a1} {a2}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            await q.goto(B + '/#/plan'); await q.reload(); await q.wait_for_selector(f'#pd-{cid}', state='attached', timeout=20000)
            await q.click(f'[data-psug="{cid}"]'); day = await q.input_value(f'#pd-{cid}')
            _r(f'ok: {lang} Vorschlag {day}' if day else 'FEHLER: kein Vorschlag')
            v0 = (await api('GET', f'/api/cases/{cid}'))['d']['case']['version']
            hold = asyncio.Event(); seen = []
            async def lost_answer(route):
                if route.request.method != 'POST': await route.continue_(); return
                resp = await route.fetch(); seen.append(resp.status)
                await hold.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            glob = f'**/api/cases/{cid}/commands'
            await q.route(glob, lost_answer)
            btn = q.locator(f'[data-pset="{cid}"]')
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await btn.click()
            ok = False
            for _ in range(32):
                await q.wait_for_timeout(250)
                if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} {w}px Termin setzen: nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px Termin setzen hängt ohne Ende')
            _r(f'ok: {lang} kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {lang} Knopf frei' if not await btn.is_disabled() else 'FEHLER: Knopf gesperrt')
            if OUT: await q.screenshot(path=f'{OUT}/werkstattplan-funkloch-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.wait_for_timeout(300); await q.unroute(glob)
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await btn.click()
            ok = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} ohne Hinweis „bereits gespeichert“')
            cs = (await api('GET', f'/api/cases/{cid}'))['d']['case']
            _r(f'ok: {lang} Termin {cs.get("planned_date")} gespeichert, genau eine neue Version' if cs.get('planned_date') == day and cs['version'] == v0 + 1 else f'FEHLER: {cs.get("planned_date")} Version {v0}→{cs["version"]}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Werkstattplan im Funkloch: alles grün')

asyncio.run(main())
