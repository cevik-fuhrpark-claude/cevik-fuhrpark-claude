# [CLAUDE] UI-Test (23.10.2026, Backlog 187): Aktionsformular eines Vorgangs nach Netzabbruch gesichert.
# (1) „Arbeitszeit“ ohne Netz (Anfrage kommt an, Antwort geht verloren) → Meldung; anderen Vorgang öffnen und zurück → Formular mit Stunden/
#     Tätigkeit wieder offen, Hinweis „wiederhergestellt“; erneut speichern → „bereits gespeichert“, genau eine Buchung, Entwurf gelöscht.
# (2) „Teil erfassen“ ohne Netz, Seite neu laden → Formular wieder offen; „Entwurf verwerfen“ schließt es, nach Neuladen bleibt es zu.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SAVED = {'de': 'gesichert', 'uk': 'збережено в цьому вікні', 'en': 'kept in this window'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def lost_response(route):
    route.fetch(); route.abort('internetdisconnected')  # Anfrage erreicht den Server, Antwort geht verloren
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ae.inhaber', 'display_name': 'AE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'ae.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    vin = 'WDB96340310187001'; VID = 'VIN:' + vin; pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'AE-NT 7', 'vin': vin, 'site': 'Dortmund'})
    u = api('POST', '/api/users', {'username': 'ae.ws', 'display_name': 'AE Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    def mkcase(txt, tag):
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': txt, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'ae-{pid}-{tag}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'aea-{pid}-{tag}', 'expected_version': v, 'note': 'prüfen', 'payload': {'workshop_site': site}})
        return cid
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        cid = mkcase(f'Bremse {lang}', lang); other = mkcase(f'Licht {lang}', lang + 'b')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.on('dialog', lambda d: d.accept())
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'ae.ws', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act]', timeout=15000)
        for _ in range(3):
            if q.locator('[data-act=record_work]').count(): break
            act = 'acknowledge' if q.locator('[data-act=acknowledge]').count() else 'start_repair'
            q.click(f'[data-act={act}]'); q.wait_for_timeout(300)
            if q.locator('#af button.btn').count(): q.click('#af button.btn')
            q.wait_for_timeout(800)
        # (1) Arbeitszeit, Antwort verloren
        q.click('[data-act=record_work]'); q.wait_for_selector('#af')
        q.fill('#af [name=hours]', '2,25'); q.fill('#af [name=description]', 'Bremssattel gängig gemacht'); q.fill('#af [name=note]', 'Halle 1')
        q.route('**/commands', lost_response)
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        toasts = q.evaluate("[...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ')")
        check(SAVED[lang] in toasts, f'{lang}/{w}: Meldung „Eingaben gesichert“ ({toasts})')
        q.unroute('**/commands')
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 1, f'{lang}/{w}: erste Sendung ist angekommen')
        q.goto(B + '/#/cases/' + other); q.wait_for_selector('[data-act]', timeout=15000)
        check(q.locator('#af').count() == 0, f'{lang}/{w}: anderer Vorgang ohne fremdes Formular')
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('#af', timeout=15000); q.wait_for_timeout(300)
        st = q.evaluate("""() => ({ h: document.querySelector('#af [name=hours]')?.value, d: document.querySelector('#af [name=description]')?.value, n: document.querySelector('#af [name=note]')?.value, box: !!document.querySelector('#adraft') })""")
        check(st == {'h': '2,25', 'd': 'Bremssattel gängig gemacht', 'n': 'Halle 1', 'box': True}, f'{lang}/{w}: Arbeitszeit-Formular wiederhergestellt ({st})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ae_work_{lang}_{w}.png')
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 1, f'{lang}/{w}: erneutes Speichern bucht nicht doppelt')
        q.reload(); q.wait_for_selector('[data-act]', timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#af').count() == 0, f'{lang}/{w}: Entwurf nach Erfolg gelöscht')
        # (2) Teil erfassen, Neuladen, verwerfen
        q.click('[data-act=add_part]'); q.wait_for_selector('#af [name=name]')
        q.fill('#af [name=name]', 'Bremsscheibe vorne'); q.fill('#af [name=quantity]', '2')
        q.route('**/commands', lambda r: r.abort('internetdisconnected'))
        q.click('#af button.btn'); q.wait_for_timeout(1200); q.unroute('**/commands')
        q.reload(); q.wait_for_selector('#af [name=name]', timeout=15000); q.wait_for_timeout(500)
        check(q.input_value('#af [name=name]') == 'Bremsscheibe vorne' and q.input_value('#af [name=quantity]') == '2' and q.locator('#adraft').count() == 1, f'{lang}/{w}: Teil nach Neuladen wiederhergestellt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ae_part_{lang}_{w}.png')
        q.click('#adx'); q.wait_for_timeout(300)
        check(q.locator('#af').count() == 0, f'{lang}/{w}: „Entwurf verwerfen“ schließt das Formular')
        q.reload(); q.wait_for_selector('[data-act]', timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#af').count() == 0 and len(api('GET', f'/api/cases/{cid}')['d']['parts']) == 0, f'{lang}/{w}: verworfen bleibt verworfen, kein Teil gebucht')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
