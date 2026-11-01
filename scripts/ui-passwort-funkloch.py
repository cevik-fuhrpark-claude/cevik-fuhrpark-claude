# [CLAUDE] UI-Test (01.11.2026, Backlog 805k, Blickwinkel „Funkloch“): Passwort ändern ohne Antwort.
# Vorher kein Zeitlimit (Knopf ohne Ende gesperrt); ein zweiter Versuch meldete „Altes Passwort falsch“ und zählte als Fehlversuch.
# Jetzt: nach dem Zeitlimit (60 s → 1,5 s) „Keine Verbindung“; derselbe zweite Versuch meldet „War bereits gespeichert“, das neue Passwort gilt.
# DE 390 / UK 820 / EN 1366 px (je eigenes Konto der Fuhrparkleitung).
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
FAST = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const st = window.setTimeout;
  window.setTimeout = (f, ms, ...a) => st(f, ((ms === 60000 || ms === 120000) && /app-(main|verwaltung)\\.js/.test(new Error().stack || '')) ? (ms === 60000 ? 1500 : 2500) : ms, ...a); })();"""
NOCONN = {'de': 'Keine Verbindung', 'uk': 'Немає з’єднання', 'en': 'No connection'}
SAVED = {'de': 'War bereits gespeichert', 'uk': 'Уже було збережено', 'en': 'Already saved'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tz.inhaber', 'display_name': 'TZ Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        env = (await api('GET', '/api/me'))['d']['active_environment']
        for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
            un = f'tz.pw805k.{lang}'; npw = f'Neues-Passwort-805k-{lang}'
            u = await api('POST', '/api/users', {'username': un, 'display_name': f'TZ Leitung {lang}', 'role': 'fleet', 'environment': env})
            _r(f'ok: {lang} Konto angelegt' if u['s'] == 201 else f'FEHLER: Konto {u}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B)
            a = await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
            await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            _r(f'ok: {lang} angemeldet' if a['s'] == 200 else f'FEHLER: Einladung {a}')
            await q.goto(B + '/#/more'); await q.reload(); await q.wait_for_selector('#pw', state='attached', timeout=20000)
            async def submit():
                await q.evaluate("() => { const d = document.querySelector('#pw').closest('details'); if (d) d.open = true; }")
                await q.fill('#pw [name=old_password]', PW); await q.fill('#pw [name=new_password]', npw)
                rep = await q.query_selector('#pw [name=new_password2]')
                if rep: await q.fill('#pw [name=new_password2]', npw)
                await q.click('#pw button.btn')
            hold = asyncio.Event(); seen = []
            async def lost_answer(route):
                resp = await route.fetch(); seen.append(resp.status)
                await hold.wait()
                try: await route.fulfill(response=resp)
                except Exception: pass
            await q.route('**/api/me/password', lost_answer)
            await submit()
            ok = False
            for _ in range(32):
                await q.wait_for_timeout(250)
                if NOCONN[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            _r(f'ok: {lang} {w}px nach dem Zeitlimit „{NOCONN[lang]}“' if ok else f'FEHLER: {lang} {w}px hängt ohne Ende')
            _r(f'ok: {lang} Änderung kam am Server an ({seen})' if seen and seen[0] == 200 else f'FEHLER: Server-Antwort {seen}')
            if OUT: await q.screenshot(path=f'{OUT}/passwort-funkloch-{lang}-{w}.png')
            hold.set(); await q.wait_for_timeout(300); await q.unroute('**/api/me/password')
            await q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
            await submit()
            ok = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if SAVED[lang].lower() in (await q.inner_text('body')).lower(): ok = True; break
            if OUT: await q.screenshot(path=f'{OUT}/passwort-funkloch-erneut-{lang}-{w}.png')
            _r(f'ok: {lang} erneut: „{SAVED[lang]}“' if ok else f'FEHLER: {lang} ohne Hinweis: {(await q.inner_text("body"))[-300:]}')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            chk = await (await br.new_context()).new_page(); await chk.goto(B)
            lg = await chk.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': npw}])
            _r(f'ok: {lang} neues Passwort gilt' if lg['s'] == 200 else f'FEHLER: Anmeldung mit neuem Passwort {lg}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Passwort ändern im Funkloch: alles grün')

asyncio.run(main())
