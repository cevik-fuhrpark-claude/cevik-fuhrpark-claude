# [CLAUDE] UI-Test (29.10.2026, Backlog 597) – Hilfe-Schritte als eigenes Sprachpaket:
# 1. Start lädt kein Hilfe-Paket; Hilfe öffnen lädt i18n-<sprache>-hilfe.js, alle Abschnitte mit Schritten, keine Rohschlüssel (DE/UK).
# 2. Suche findet Hilfe-Abschnitte (Paket wird dort nachgeladen).
# 3. Hilfe-Paket lädt nicht (Netzfehler, EN): Fehlerseite statt Rohschlüsseln; nächster Aufruf lädt erneut und zeigt die Hilfe.
# Handy 390 px ohne Querscrollen.
import asyncio, os, re
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, locale='de-DE', service_workers='block'); q = await ctx.new_page(); await q.goto(B)
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        reqs = []; q.on('request', lambda r: reqs.append(r.url) if '-hilfe.js' in r.url else None)
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hp.inhaber', 'display_name': 'HP Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'hp.inhaber', 'password': PW})
        for lang, cyr in [('de', False), ('uk', True)]:
            await api('PATCH', '/api/me', {'language': lang})
            reqs.clear()
            await q.goto(B + '/#/'); await q.reload(); await q.wait_for_selector('#main h1', timeout=15000); await q.wait_for_timeout(800)
            _r(f'ok: {lang} Start ohne Hilfe-Paket' if not reqs else f'FEHLER: {lang} Start lädt {reqs}')
            await q.goto(B + '/#/help'); await q.wait_for_selector('section.helpsec li', timeout=15000)
            n_sec = await q.locator('section.helpsec').count(); n_empty = await q.locator('section.helpsec:not(:has(li))').count()
            txt = await q.inner_text('#main')
            ok = any(f'i18n-{lang}-hilfe.js' in u for u in reqs) and n_sec > 3 and n_empty == 0 and not re.search(r'help_[a-z0-9_]+_s', txt) and (not cyr or re.search('[а-яіїє]', txt))
            _r(f'ok: {lang} Hilfe mit {n_sec} Abschnitten aus dem Hilfe-Paket' if ok else f'FEHLER: {lang} Hilfe {n_sec}/{n_empty} {reqs} {txt[:200]!r}')
            if OUT: await q.screenshot(path=f'{OUT}/hilfe-paket-{lang}-390.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} 390 px ohne Querscrollen' if sw <= 0 else f'FEHLER: {lang} Querscrollen {sw}')
        # Suche (frische Seite, Paket noch nicht geladen): Hilfe-Treffer erscheinen
        await api('PATCH', '/api/me', {'language': 'de'})
        await q.goto(B + '/#/'); await q.reload(); await q.wait_for_selector('#main h1', timeout=15000)
        word = await q.evaluate("() => import('/i18n-de-hilfe.js').then((m) => (m.S.help_report_s || '').split(/[\\s|,.;:()]+/).find((w) => w.length > 8))")
        await q.goto(B + '/#/search'); await q.wait_for_selector('#gq'); await q.fill('#gq', word); await q.wait_for_selector('#ghelp a.row', timeout=15000)
        _r(f'ok: Suche „{word}“ findet Hilfe-Abschnitte ({await q.locator("#ghelp a.row").count()})')
        # Netzfehler beim Hilfe-Paket (EN): Fehlerseite, danach neuer Versuch
        await api('PATCH', '/api/me', {'language': 'en'})
        async def fail(route): await route.abort()
        await q.route('**/i18n-en-hilfe.js*', fail)
        await q.goto(B + '/#/'); await q.reload(); await q.wait_for_selector('#main h1', timeout=15000)
        await q.goto(B + '/#/help'); await q.wait_for_selector('#errh', timeout=15000)
        txt = await q.inner_text('#main')
        _r('ok: Ladefehler als Fehlerseite ohne Rohschlüssel' if not re.search(r'help_[a-z0-9_]+_s', txt) else f'FEHLER: Rohschlüssel {txt[:200]!r}')
        if OUT: await q.screenshot(path=f'{OUT}/hilfe-paket-fehler-en-390.png')
        await q.unroute('**/i18n-en-hilfe.js*')
        await q.goto(B + '/#/'); await q.wait_for_selector('#main h1'); await q.goto(B + '/#/help'); await q.wait_for_selector('section.helpsec li', timeout=15000)
        _r('ok: erneuter Versuch zeigt die Hilfe (EN)')
        _r('ok: keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
        await br.close()
    print('Hilfe-Paket: alles grün')

asyncio.run(main())
