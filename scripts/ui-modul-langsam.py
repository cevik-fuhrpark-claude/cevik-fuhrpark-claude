# [CLAUDE] UI-Test (03.11.2026, Backlog 953) – Funkloch/langsames Netz: Nachgeladene Hilfsfunktionen (keine Ansichten), z. B. die
# Zwei-Faktor-Einrichtung in „Mehr“ (loadTotp, Gruppe konto), dürfen die Seite beim langsamen Laden des Moduls nicht durch
# „Lädt…“ ersetzen – sonst bleibt „Mehr“ leer, weil #tfabox fehlt. Ansichten (view*) zeigen den Ladehinweis weiterhin.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ml.inhaber', 'display_name': 'ML Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'ml.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid(); un = 'ml.fleet%d' % pid
    u = api('POST', '/api/users', {'username': un, 'display_name': un, 'role': 'fleet', 'environment': env})
    for w, lang in [(390, 'de'), (820, 'uk'), (1366, 'en')]:
        c = br.new_context(viewport={'width': w, 'height': 900}); pg = c.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        # Modul „konto“ 1,5 s verzögert (langsames Netz); Service Worker umgehen
        def slow(route):
            pg.wait_for_timeout(1500); route.continue_()
        c.route('**/app-konto.js*', slow)
        pg.goto(B)
        if w == 390: pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        pg.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); pg.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        pg.goto(B + '/#/more'); pg.wait_for_selector('#tfa', state='attached')
        pg.locator('#tfa > summary').click(); pg.wait_for_timeout(700)
        check(pg.locator('#tfa').count() == 1 and pg.locator('#lo').count() == 1, '%d px/%s: „Mehr“ bleibt während des Ladens sichtbar' % (w, lang))
        pg.wait_for_selector('#tfabox button', timeout=10000)
        check(pg.locator('#tfabox button').count() >= 1, '%d px/%s: Zwei-Faktor-Bereich nach dem Laden gefüllt' % (w, lang))
        pg.screenshot(path=os.environ.get('CFP_SHOT_DIR', '/tmp') + '/modul-langsam-%d.png' % w)
        check(not errs, '%d px/%s: keine Skriptfehler %s' % (w, lang, errs))
        c.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
