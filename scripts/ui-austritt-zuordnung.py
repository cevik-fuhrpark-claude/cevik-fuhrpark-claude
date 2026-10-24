# [CLAUDE] UI-Test (24.10.2026, Backlog 248 „Fahrer verlässt das Unternehmen“): Benutzer deaktivieren, dem ein Fahrzeug zugeordnet ist →
# Meldung nennt das Kennzeichen („Fahrzeugzuordnung beendet: …“), Fahrzeugakte zeigt danach keinen Fahrer mehr.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT = {'de': 'Fahrzeugzuordnung beendet', 'uk': 'Призначення до транспорту завершено', 'en': 'Vehicle assignment ended'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'az.inhaber', 'display_name': 'AZ Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'az.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid()
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB9634031024{pid % 1000:03d}{i}'[:17].ljust(17, '0'); VID = 'VIN:' + vin; plate = f'AZ-AT 24{i}'
        check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        u = api('POST', '/api/users', {'username': f'az.{lang}{pid}', 'display_name': f'Austritt {lang}', 'role': 'driver', 'environment': env})
        uid = u['d']['id']
        check(api('POST', f'/api/vehicles/{VID}/drivers', {'user_id': uid})['s'] == 201, f'{lang}: zugeordnet')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'az.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.on('dialog', lambda d: d.accept())
        q.goto(B + '/#/users'); q.wait_for_selector(f'[data-act="{uid}"]')
        q.click(f'[data-act="{uid}"]'); q.wait_for_selector(f'[data-act="{uid}"][data-on="1"]')
        txt = ' '.join(q.locator('.toast').all_inner_texts())
        check(HINT[lang] in txt and plate in txt, f'{lang}: Meldung nennt Fahrzeug: {txt[:160]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/austritt-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        vd = api('GET', f'/api/vehicles/{VID}')['d']
        dl = vd.get('drivers') or []; cur = [d for d in dl if not d.get('valid_to')]
        check(len(dl) == 1 and not cur, f'{lang}: Fahrzeugakte – Zuordnung beendet (Verlauf bleibt)')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
