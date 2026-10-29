# [CLAUDE] UI-Test (29.10.2026, Backlog 596) – schnellerer Start: Start-Module per modulepreload, /api/me schon aus boot.js:
# 1. Angemeldet, Neustart: genau eine Anfrage /api/me und /api/meta (Vorabrufe werden übernommen, Backlog 598), Startseite in der Kontosprache (UK), alle
#    statischen Module und das Sprachpaket kommen ohne Doppel-Download.
# 2. Nicht angemeldet: Vorabruf liefert 401 → Anmeldeseite; Anmeldung über das Formular → Startseite mit dem richtigen Namen
#    (der alte 401-Vorabruf wird nicht noch einmal benutzt).
# 3. Start auf #/login bzw. Einladungslink: kein Vorabruf (keine Anfrage /api/me).
# 4. Funkloch beim Start (/api/me scheitert): Offline-Start mit dem gespeicherten Konto statt Anmeldeseite.
# 5. Erste API-Anfrage ist eine andere als /api/me: Vorabruf wird verworfen, nie später als veraltete Antwort genutzt.
# Handy 390 px; Bildschirmfotos optional (CFP_SHOTS).
import asyncio, os
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
        ctx = await br.new_context(viewport={'width': 390, 'height': 844}, locale='de-DE', service_workers='block'); q = await ctx.new_page(); await q.goto(B + '/#/login')
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'va.inhaber', 'display_name': 'VA Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'va.inhaber', 'password': PW})
        await api('PATCH', '/api/me', {'language': 'uk'})

        # index.html: Start-Module vorab angefordert
        pre = await q.evaluate("() => [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => new URL(l.href).pathname)")
        need = ['/i18n-core.js', '/ics-texts.js', '/csv.js', '/check-labels.js']
        _r(f'ok: modulepreload für {len(pre)} Module' if all(n in pre for n in need) else f'FEHLER: modulepreload fehlt: {pre}')

        # 1. angemeldet neu starten
        reqs = []
        q.on('request', lambda r: reqs.append(r.url.replace(B, '')))
        await q.goto(B + '/#/'); await q.wait_for_selector('nav', timeout=15000); await q.wait_for_timeout(800); reqs.clear(); await q.reload(); await q.wait_for_selector('nav', timeout=15000); await q.wait_for_timeout(800)
        me = [r for r in reqs if r.split('?')[0] == '/api/me']
        _r('ok: angemeldet – genau eine Anfrage /api/me (Vorabruf übernommen)' if len(me) == 1 else f'FEHLER: /api/me {len(me)}× angefragt: {reqs}')
        meta = [r for r in reqs if r.split('?')[0] == '/api/meta']
        _r('ok: angemeldet – genau eine Anfrage /api/meta (Vorabruf übernommen)' if len(meta) == 1 else f'FEHLER: /api/meta {len(meta)}× angefragt: {reqs}')
        _r('ok: /api/me und /api/meta gleich aus boot.js angefordert (vor version.json aus app-main.js)' if reqs.index('/api/me') < reqs.index('/api/meta') < reqs.index('/version.json') else f'FEHLER: Reihenfolge {reqs}')
        _r('ok: Vorabrufe nach Gebrauch verworfen' if await q.evaluate("() => window.__cfpPre") is None else 'FEHLER: Vorabruf-Liste bleibt stehen')
        js = [r.split('?')[0] for r in reqs if r.split('?')[0].endswith('.js')]
        dup = sorted({r for r in js if js.count(r) > 1})
        _r('ok: keine Datei doppelt geladen' if not dup else f'FEHLER: doppelt geladen: {dup}')
        _r('ok: nur das Sprachpaket der Kontosprache geladen' if '/i18n-uk.js' in js and '/i18n-de.js' not in js else f'FEHLER: i18n-uk.js fehlt: {js}')
        main = await q.inner_text('#app')
        _r('ok: Startseite in der Kontosprache (UK)' if 'Вийти' in main or 'Ще' in main or 'Головна' in main else f'FEHLER: Startseite nicht ukrainisch: {main[:200]!r}')
        _r('ok: keine Anmeldeseite' if await q.locator('input[type=password]').count() == 0 else 'FEHLER: Anmeldeseite trotz Sitzung')
        if OUT: await q.screenshot(path=f'{OUT}/vorabruf-start-uk-390.png')

        # 4. Funkloch beim Start: Offline-Start mit gespeichertem Konto
        async def abort(route): await route.abort()
        await q.route('**/api/me', abort)
        await q.reload(); await q.wait_for_timeout(2500)
        has_pw = await q.locator('input[type=password]').count()
        nav = await q.locator('nav').count()
        _r('ok: Funkloch beim Start – Offline-Start mit gespeichertem Konto' if not has_pw and nav else f'FEHLER: Offline-Start: Passwortfeld {has_pw}, nav {nav}: {(await q.inner_text("#app"))[:200]!r}')
        await q.unroute('**/api/me', abort)

        # 3. Start auf #/login: kein Vorabruf
        ctx2 = await br.new_context(viewport={'width': 390, 'height': 844}, locale='de-DE', service_workers='block'); q2 = await ctx2.new_page()
        r2 = []; q2.on('request', lambda r: r2.append(r.url.replace(B, '')))
        await q2.goto(B + '/#/login'); await q2.wait_for_selector('input[type=password]', timeout=15000); await q2.wait_for_timeout(800)
        _r('ok: #/login ohne Vorabruf' if not [r for r in r2 if r.startswith('/api/me')] else f'FEHLER: Vorabruf auf #/login: {r2}')
        r2.clear(); await q2.goto(B + '/#/invite/abc'); await q2.reload(); await q2.wait_for_timeout(1500)
        _r('ok: Einladungslink ohne Vorabruf' if not [r for r in r2 if r.startswith('/api/me')] else f'FEHLER: Vorabruf auf Einladung: {r2}')

        # 2. nicht angemeldet: Vorabruf 401 → Anmeldeseite, danach Anmeldung über das Formular
        await q2.close(); q2 = await ctx2.new_page(); q2.on('pageerror', lambda e: errs.append(str(e)))  # neue Seite: kein Hash-Wechsel des alten Dokuments fragt dazwischen
        r2 = []; q2.on('request', lambda r: r2.append(r.url.replace(B, '')))
        await q2.goto(B + '/#/cases'); await q2.wait_for_selector('input[type=password]', timeout=15000); await q2.wait_for_timeout(500)
        _r('ok: nicht angemeldet – Anmeldeseite (eine Anfrage /api/me)' if len([r for r in r2 if r.split('?')[0] == '/api/me']) == 1 else f'FEHLER: {r2}')
        await q2.fill('#u', 'va.inhaber'); await q2.fill('input[type=password]', PW); await q2.click('#f button.btn.block')
        await q2.wait_for_selector('nav', timeout=15000); await q2.wait_for_timeout(800)
        t2 = await q2.inner_text('#app')
        _r('ok: nach Anmeldung Startseite (kein veralteter 401-Vorabruf)' if await q2.locator('input[type=password]').count() == 0 else f'FEHLER: nach Anmeldung wieder Anmeldeseite: {t2[:200]!r}')
        if OUT: await q2.screenshot(path=f'{OUT}/vorabruf-nach-anmeldung-390.png')

        # 5. erste API-Anfrage ist nicht /api/me → Vorabruf verworfen
        left = await q2.evaluate("() => window.__cfpPre")
        _r('ok: Vorabruf nach Gebrauch verworfen' if left is None else f'FEHLER: Vorabruf noch vorhanden: {left!r}')
        await q2.evaluate("""() => { const r = () => Promise.resolve(new Response('{"error":"x"}', { status: 401, headers: { 'content-type': 'application/json' } })); window.__cfpPre = [['/api/me', r()], ['/api/meta', r()]]; }""")
        # ein Hintergrund-/Aktionsaufruf (nicht /api/me) muss den Vorabruf verwerfen, ohne ihn zu benutzen
        await q2.goto(B + '/#/cases'); await q2.wait_for_timeout(1500)
        left = await q2.evaluate("() => window.__cfpPre")
        still = await q2.locator('input[type=password]').count()
        _r('ok: fremde erste Anfrage verwirft den Vorabruf (keine Abmeldung durch alte Antwort)' if left is None and not still else f'FEHLER: Vorabruf {left!r}, Anmeldeseite {still}')

        _r('ok: keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler: {errs}')
        await br.close()

asyncio.run(main())
