# [CLAUDE] UI-Test (28.10.2026, Backlog 478/479, Blickwinkel „geteiltes Werkstatt-Tablet“): Arbeitszeit im Funkloch nicht gespeichert →
# Entwurf gesichert; Abmelden fragt „nicht gespeicherte Eingabe geht verloren“ (Abbrechen: bleibt angemeldet, Entwurf bleibt; Bestätigen:
# abgemeldet, Entwurf gelöscht); angezeigte Mitteilungen der Person werden geschlossen. Tablet 820 (DE), Handy 390 (UK), PC 1366 (EN).
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ae.inhaber', 'display_name': 'AE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'ae.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    vin = 'WDB96340310654479'; VID = 'VIN:' + vin; pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'AE-WS 1', 'vin': vin, 'site': 'Dortmund'})
    u = api('POST', '/api/users', {'username': 'ae.ws', 'display_name': 'AE Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Bremse quietscht {lang}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'ae-{pid}-{lang}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'aea-{pid}-{lang}', 'expected_version': v, 'note': 'prüfen', 'payload': {'workshop_site': site}})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}, permissions=['notifications']); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'ae.ws', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=record_work]', timeout=15000)
        q.click('[data-act=record_work]'); q.wait_for_selector('#af')
        q.fill('#af [name=hours]', '1,5'); q.fill('#af [name=description]', 'Bremsbeläge gewechselt')
        q.route('**/commands', lambda r: r.abort('failed'))
        q.click('#af button.btn'); q.wait_for_timeout(1200); q.unroute('**/commands')
        check(q.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), f'{lang}/{w}: Entwurf nach Funkloch gesichert')
        # Mitteilung der Person (wie eine Push-Nachricht) anzeigen
        sw = q.evaluate("async () => { try { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((_, j) => setTimeout(() => j('t'), 5000))]); await r.showNotification('S-2026-0001 · AE-WS 1', { tag: 'ae' }); return (await r.getNotifications()).length; } catch (e) { return -1; } }")
        q.goto(B + '/#/more'); q.wait_for_selector('#lo', timeout=15000)
        msgs = []
        q.once('dialog', lambda d: (msgs.append(d.message), d.dismiss()))
        q.click('#lo'); q.wait_for_timeout(800)
        exp = {'de': 'nicht gespeicherte Eingabe', 'uk': 'незбережене введення', 'en': 'unsaved entry'}[lang]
        check(bool(msgs) and exp in msgs[0], f'{lang}/{w}: Rückfrage vor dem Abmelden {msgs[:1]}')
        check(q.locator('#lo').count() == 1 and q.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_act_'))"), f'{lang}/{w}: Abbrechen → angemeldet, Entwurf bleibt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/abmelden_entwurf_{lang}_{w}.png', full_page=True)
        q.once('dialog', lambda d: d.accept())
        q.click('#lo'); q.wait_for_timeout(1500)
        check('#/login' in q.url, f'{lang}/{w}: nach Bestätigen abgemeldet')
        check(not q.evaluate("Object.keys(sessionStorage).some(k => k.startsWith('cfp_fd_'))"), f'{lang}/{w}: Entwurf gelöscht')
        if sw >= 1:
            left = q.evaluate("async () => (await (await navigator.serviceWorker.ready).getNotifications()).length")
            check(left == 0, f'{lang}/{w}: Mitteilungen der Person geschlossen ({sw} → {left})')
        else: print(f'  – {lang}/{w}: Mitteilung im Testbrowser nicht anzeigbar ({sw}), Schließen nur per Quelltext-Test geprüft')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{lang}/{w}: kein Querscrollen')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
