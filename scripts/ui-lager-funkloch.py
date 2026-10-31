# [CLAUDE] UI-Test (31.10.2026, Backlog 802, Blickwinkel „Werkstatt-Lager im Funkloch der Halle“): Lagerbuchung ohne Antwort.
# Vorher hatten Buchung (Artikelakte), Umlagerung, Wareneingang und Inventur-Prüfung kein Zeitlimit – ohne Antwort blieb der Knopf ohne Ende
# gesperrt. Jetzt: nach dem Zeitlimit (SEND_TIMEOUT_MS, im Test 60 s → 1,5 s) „Keine Verbindung“, Knopf frei, Eingaben bleiben; erneut buchen
# schickt denselben request_key → der Server meldet „duplicate“, der Bestand ändert sich genau einmal.
# Nachstellung: Anfrage erreicht den Server (Buchung angelegt), die Antwort geht verloren. Buchung DE 390 / UK 820 / EN 1366 px,
# Wareneingang DE 390 px. Gegen den alten Stand rot (Knopf hängt).
import asyncio, os, uuid
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

async def wait_text(q, txt, secs=8):
    for _ in range(secs * 4):
        await q.wait_for_timeout(250)
        if txt.lower() in (await q.inner_text('body')).lower(): return True
    return False

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lf.inhaber', 'display_name': 'LF Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        owner = None
        for un in ['lf.inhaber', 'fl.inhaber', 'we.inhaber']:
            if (await api('POST', '/api/login', {'username': un, 'password': PW}))['s'] == 200: owner = un; break
        _r('ok: Inhaber angemeldet' if owner else 'FEHLER: keine Inhaber-Anmeldung')
        envname = (await api('GET', '/api/me'))['d']['active_environment']; tag = uuid.uuid4().hex[:4]
        wsu = f'lf.ws.{tag}'
        u = await api('POST', '/api/users', {'username': wsu, 'display_name': 'LF Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
        wctx = await br.new_context(); w0 = await wctx.new_page(); await w0.goto(B)
        await w0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        ws = lambda m, pa, b=None: w0.evaluate(JS, [m, pa, b])
        for kind, lang, w in [('move', 'de', 390), ('move', 'uk', 820), ('move', 'en', 1366), ('receipt', 'de', 390)]:
            n = str(uuid.uuid4().int)[:5]
            iid = (await ws('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Bremsbelag {n}', 'initial_qty': '10'}))['d']['id']
            await ws('PATCH', '/api/me', {'language': lang})
            ctx = await br.new_context(viewport={'width': w, 'height': 844 if w < 500 else 1180 if w < 1000 else 900}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}])
            hold = asyncio.Event(); seen = []
            async def lost_answer(route):
                if route.request.method != 'POST': await route.continue_(); return
                resp = await route.fetch(); seen.append(resp.status)
                await hold.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            if kind == 'move':
                await q.goto(B + f'/#/stock/{iid}'); await q.reload(); await q.wait_for_selector('#mf', timeout=15000)
                await q.select_option('#mf select[name=type]', 'entnahme'); await q.fill('#mf input[name=qty]', '3')
                path = f'**/api/stock/{iid}/movements'; btn = q.locator('#mf button.btn').last
            else:
                await q.goto(B + '/#/stock'); await q.reload(); await q.wait_for_selector('#srcpt', timeout=15000)
                await q.click('#srcpt'); await q.wait_for_selector('#rcf', timeout=10000)
                await q.fill('#rcdoc', f'LS-{n}'); await q.select_option('#rclines .rcl:nth-child(1) select', iid); await q.fill('#rclines .rcl:nth-child(1) .rcq', '5')
                path = '**/api/stock/receipt'; btn = q.locator('#rcbook')
            await q.route(path, lost_answer)
            await btn.click()
            ok = await wait_text(q, NOCONN[lang])
            _r(f'ok: {kind} {lang} {w}px nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {kind} {lang} {w}px Buchung hängt ohne Ende')
            _r(f'ok: {kind} {lang} Anfrage kam am Server an ({seen})' if seen and seen[0] in (200, 201) else f'FEHLER: Server-Antwort {seen}')
            _r(f'ok: {kind} {lang} Knopf wieder frei' if not await btn.is_disabled() else 'FEHLER: Knopf bleibt gesperrt')
            if OUT: await q.screenshot(path=f'{OUT}/lager-funkloch-{kind}-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.wait_for_timeout(300); await q.unroute(path)
            await btn.click()  # Netz wieder da: erneut buchen (gleiche Eingaben → gleicher request_key)
            await q.wait_for_timeout(1500)
            if kind == 'receipt':
                _r(f'ok: {lang} Wareneingang bestätigt' if await q.locator('#rcdone').count() else f'FEHLER: Wareneingang nicht bestätigt')
            d = (await ws('GET', f'/api/stock/{iid}'))['d']
            want = 7 if kind == 'move' else 15
            _r(f'ok: {kind} {lang} Bestand genau einmal geändert ({d["item"]["on_hand"]})' if d['item']['on_hand'] == want else f'FEHLER: Bestand {d["item"]["on_hand"]} statt {want}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Lager im Funkloch: alles grün')

asyncio.run(main())
