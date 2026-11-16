# [CLAUDE] UI-Test (16.11.2026, Backlog 1542, Blickwinkel „Fahrer speichert sein Passwort im Passwortmanager des Handys“, WCAG 1.3.5):
# Einladung (neues Passwort), „Passwort ändern“ und Zwei-Faktor-Formulare nennen dem Passwortmanager den Benutzernamen über ein
# verstecktes Feld autocomplete="username" (nicht sichtbar, nicht fokussierbar, geht nicht in die Anfrage). „Passwort ändern“:
# Beschriftungen per for/id verknüpft. DE 390 / UK 820 / EN 1366 px.
import asyncio, json, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
CHK = """(sel) => { const f = document.querySelector(sel); if (!f) return null; const u = f.querySelector('input[autocomplete="username"]');
  if (!u) return { missing: true }; const r = u.getBoundingClientRect();
  return { value: u.value, name: u.getAttribute('name'), visible: !!(r.width || r.height), tab: u.tabIndex, aria: u.getAttribute('aria-hidden'),
    pw: [...f.querySelectorAll('input[type=password]')].map((x) => x.autocomplete) }; }"""

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
            un = f'tz.pwm1542.{lang}'
            u = await api('POST', '/api/users', {'username': un, 'display_name': f'TZ Fahrer {lang}', 'role': 'driver', 'environment': env, 'language': lang})
            _r(f'ok: {lang} Konto angelegt' if u['s'] == 201 else f'FEHLER: Konto {u}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            await q.goto(B + '/#/invite/' + u['d']['invite_token']); await q.wait_for_selector('#f #p', timeout=20000)
            c = await q.evaluate(CHK, '#f')
            _r(f'ok: {lang} {w}px Einladung nennt {un} versteckt' if c and c.get('value') == un and not c['visible'] and c['name'] is None and c['tab'] == -1 and c['aria'] == 'true' and c['pw'] == ['new-password'] else f'FEHLER: Einladung {c}')
            if OUT: await q.screenshot(path=f'{OUT}/passwortmanager-einladung-{lang}-{w}.png')
            await q.fill('#p', PW)
            async with q.expect_response(lambda r: '/api/invite/accept' in r.url, timeout=20000) as ra: await q.click('#f button.btn.block')
            _r(f'ok: {lang} Passwort über die Einladung gesetzt' if (await ra.value).status == 200 else 'FEHLER: Einladung annehmen')
            await q.wait_for_timeout(800)
            await q.goto(B + '/#/more'); await q.reload(); await q.wait_for_selector('#pw', state='attached', timeout=20000)
            await q.evaluate("() => { const d = document.querySelector('#pw').closest('details'); if (d) d.open = true; }")
            c = await q.evaluate(CHK, '#pw')
            _r(f'ok: {lang} Passwort ändern nennt {un}, Zwecke {c["pw"]}' if c and c.get('value') == un and not c['visible'] and c['name'] is None and c['pw'] == ['current-password', 'new-password'] else f'FEHLER: Passwort ändern {c}')
            await q.click('label[for=pwold]'); f1 = await q.evaluate('document.activeElement && document.activeElement.id')
            await q.click('label[for=pwnew]'); f2 = await q.evaluate('document.activeElement && document.activeElement.id')
            _r(f'ok: {lang} Beschriftungen verknüpft' if (f1, f2) == ('pwold', 'pwnew') else f'FEHLER: Beschriftung → {f1}/{f2}')
            # Tab vom alten zum neuen Passwort springt nicht ins versteckte Feld
            await q.focus('#pwold'); await q.keyboard.press('Tab'); f3 = await q.evaluate('document.activeElement && document.activeElement.id')
            _r(f'ok: {lang} Tab-Reihenfolge' if f3 == 'pwnew' else f'FEHLER: Tab → {f3}')
            sent = []
            async def spy(route):
                sent.append(json.loads(route.request.post_data or '{}')); await route.continue_()
            await q.route('**/api/me/password', spy)
            npw = f'Neues-Passwort-1542-{lang}'
            await q.fill('#pwold', PW); await q.fill('#pwnew', npw); await q.click('#pw button.btn'); await q.wait_for_timeout(1500)
            _r(f'ok: {lang} Anfrage ohne Benutzernamen ({sorted(sent[0])})' if sent and sorted(sent[0]) == ['new_password', 'old_password'] else f'FEHLER: Anfrage {sent}')
            await q.evaluate("() => { const d = document.querySelector('#tfa'); if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); } }")
            try: await q.wait_for_selector('#tfs', state='attached', timeout=10000)
            except Exception: pass
            c = await q.evaluate(CHK, '#tfs')
            _r(f'ok: {lang} Zwei-Faktor-Einrichtung nennt {un}' if c and c.get('value') == un and not c['visible'] else f'FEHLER: 2FA {c}')
            if OUT: await q.screenshot(path=f'{OUT}/passwortmanager-konto-{lang}-{w}.png', full_page=True)
            _r(f'ok: {lang} ohne Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
