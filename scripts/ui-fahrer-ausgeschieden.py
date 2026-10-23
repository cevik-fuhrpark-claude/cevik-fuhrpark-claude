# [CLAUDE] UI-Test (23.10.2026, Backlog 190 „Fahrer verlässt das Unternehmen“): Fahrerakte unter „Stammdaten ändern“ auf inaktiv setzen,
# verknüpftes App-Konto bleibt aktiv → Hinweis „App-Konto … weiter aktiv … Benutzer deaktivieren“ statt nur „✓“.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT = {'de': 'weiter aktiv', 'uk': 'залишається активним', 'en': 'still active'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'fa.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid()
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        u = api('POST', '/api/users', {'username': f'fa.{lang}{pid}', 'display_name': f'Fahrer {lang}', 'role': 'driver', 'environment': env})
        c0 = br.new_context(); x = c0.new_page(); x.goto(B); x.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        uid = [x for x in api('GET', '/api/users')['d']['users'] if x['username'] == f'fa.{lang}{pid}'][0]['id']
        dr = api('POST', '/api/drivers', {'display_name': f'Fahrer {lang}', 'personnel_no': f'FA-{lang}-{pid}', 'user_id': uid})
        check(dr['s'] == 201, f'{lang}: Fahrerakte angelegt ({dr["s"]})')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'fa.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/drivers/' + dr['d']['id']); q.reload(); q.wait_for_selector('#edf', state='attached', timeout=15000)
        q.evaluate("document.querySelector('#edf').closest('details').open = true")
        q.uncheck('#edf [name=active]'); q.click('#edf button.btn'); q.wait_for_timeout(1200)
        toasts = q.evaluate("[...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ')")
        check(HINT[lang] in toasts and f'Fahrer {lang}' in toasts, f'{lang}/{w}: Hinweis Konto weiter aktiv ({toasts[:140]})')
        check(q.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrer-ausgeschieden-{lang}-{w}.png')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
