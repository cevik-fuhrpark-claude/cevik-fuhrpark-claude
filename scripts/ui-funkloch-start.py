# [CLAUDE] UI-Test (31.10.2026, Backlog 800, Blickwinkel „Fahrer im Funkloch – Handy zeigt Netz, aber keine Antwort“): App-Start ohne Antwort.
# Vorher hatten Anmeldestatus (/api/me, auch der Vorabruf aus boot.js), Stammdaten und die Fahrzeugauswahl kein Zeitlimit: zeigte das Handy
# Netz an, kam aber keine Antwort (Funkloch, überlastete Zelle), blieb die App ohne Ende bei „Lädt…“ – obwohl ein Offline-Start mit
# Postausgang möglich gewesen wäre (das Ereignis „online“ kommt in diesem Fall nie). Jetzt: Zeitlimit → Offline-Start mit dem zuletzt
# gespeicherten Konto, Meldung landet im Postausgang; antwortet der Server wieder, merkt das die Hintergrundprüfung (30 s) und sendet nach.
# Fristen im Test verkürzt (15 s → 1,5 s, 8 s → 0,8 s, 60 s → 2 s, Prüfung 30 s → 2 s; nur Aufrufe aus app-main.js, AbortSignal.timeout entfernt).
# Meldung DE/UK/EN 390 px und DE 1366 px; zusätzlich ohne gespeichertes Konto → Anmeldeseite statt „Lädt…“. Gegen den alten Stand rot.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310800001'; PLATE = 'FS-ZL 800'
FAST = """(() => { try { AbortSignal.timeout = undefined; } catch {}
  const M = { 15000: 1500, 8000: 800, 60000: 2000, 30000: 2000 };
  const fromApp = () => /app-main\\.js/.test(new Error().stack || '');
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = (f, ms, ...a) => st(f, (M[ms] && fromApp()) ? M[ms] : ms, ...a);
  window.setInterval = (f, ms, ...a) => si(f, (ms === 30000 && fromApp()) ? 2000 : ms, ...a); })();"""
SAVED = {'de': 'auf diesem Gerät gespeichert', 'uk': 'збережено на цьому пристрої', 'en': 'stored on this device'}
H1 = {'de': 'Schaden melden', 'uk': 'Повідомити', 'en': 'Report'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fl.inhaber', 'display_name': 'FL Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fl.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': PLATE, 'vin': VIN, 'site': 'Dortmund'})
        for lang, w, cached in [('de', 390, True), ('uk', 390, True), ('en', 390, True), ('de', 1366, True), ('de', 390, False)]:
            await api('PATCH', '/api/me', {'language': lang})
            ctx = await br.new_context(viewport={'width': w, 'height': 844 if w < 500 else 900}, service_workers='block'); await ctx.add_init_script(FAST)
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'fl.inhaber', 'password': PW}])
            await q.goto(B + '/#/new'); await q.reload(); await q.wait_for_selector('#d', timeout=15000)  # Konto + Fahrzeuge auf dem Gerät
            if not cached: await q.evaluate("localStorage.removeItem('cfp_offline_session')")
            hold = asyncio.Event(); hung = []
            async def no_answer(route):  # Funkloch: Anfrage geht raus, Antwort bleibt aus
                hung.append(route.request.method + ' ' + route.request.url.split('/api/')[1][:30])
                await hold.wait()
                try: await route.continue_()
                except Exception: pass
            await q.route('**/api/**', no_answer)
            await q.reload()
            if not cached:
                for _ in range(40):
                    await q.wait_for_timeout(250)
                    if '#/login' in q.url and await q.locator('input[type=password]').count(): break
                ok = '#/login' in q.url and await q.locator('input[type=password]').count() > 0
                _r(f'ok: ohne gespeichertes Konto nach dem Zeitlimit Anmeldeseite ({w}px)' if ok else f'FEHLER: ohne gespeichertes Konto hängt der Start: {(await q.inner_text("#app"))[:120]!r}')
                hold.set(); await q.unroute('**/api/**'); await ctx.close(); continue
            shown = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if await q.locator('#d').count() and await q.locator('.vehpick label').count(): shown = True; break
            _r(f'ok: {lang} {w}px Offline-Start nach dem Zeitlimit – Meldeformular mit Fahrzeugen' if shown else f'FEHLER: {lang} {w}px Start hängt: {(await q.inner_text("#app"))[:120]!r} ({hung})')
            _r(f'ok: {lang} Anmeldestatus wurde angefragt ({hung[:3]})' if any('GET me' in x for x in hung) else f'FEHLER: keine Anfrage /api/me {hung}')
            h1 = await q.inner_text('#main h1')
            _r(f'ok: {lang} Überschrift {h1!r}' if H1[lang].lower()[:6] in h1.lower() else f'FEHLER: Überschrift {h1!r}')
            mark = f'FUNKSTART-{lang}-{w}'
            await q.fill('#vq', PLATE); await q.locator('.vehpick label:not([hidden])').filter(has_text=PLATE).first.click()
            await q.fill('#d', f'Rücklicht links defekt {mark}')
            await q.click('#sb')
            ok = False
            for _ in range(40):
                await q.wait_for_timeout(250)
                if await q.locator('.panel.alert').count() and SAVED[lang].lower() in (await q.inner_text('#main')).lower(): ok = True; break
            _r(f'ok: {lang} {w}px Meldung im Postausgang gespeichert' if ok else f'FEHLER: {lang} Meldung nicht im Postausgang: {(await q.inner_text("#main"))[:160]!r}')
            if OUT: await q.screenshot(path=f'{OUT}/funkloch-start-{lang}-{w}.png')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            hold.set(); await q.unroute('**/api/**')  # Server antwortet wieder – Gerät meldete die ganze Zeit „online“
            ob = -1
            for _ in range(60):
                await q.wait_for_timeout(250)
                ob = await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v)).length")
                if ob == 0: break
            _r(f'ok: {lang} Hintergrundprüfung erkennt den Server, Postausgang nachgesendet' if ob == 0 else f'FEHLER: Postausgang nach Netzrückkehr noch {ob}')
            cs = (await api('GET', '/api/cases?f=all'))['d']['cases']
            n = len([c for c in cs if mark in c['description']])
            _r(f'ok: {lang} genau eine Meldung' if n == 1 else f'FEHLER: {n} Meldungen')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: Skriptfehler {errs[:3]}')
            await ctx.close()
        await br.close()
    print('Funkloch beim App-Start: alles grün')

asyncio.run(main())
