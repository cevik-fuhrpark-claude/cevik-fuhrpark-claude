# [CLAUDE] UI-Test (05.11.2026, Backlog 1018) – Blickwinkel „Vorgangs-Link per Messenger weitergeleitet“:
# (1) Inhaber hat die Ansicht auf „Test“, bekommt den Link eines Betriebsvorgangs → Fehlerseite nennt die andere Umgebung und bietet
#     „Zu „Betrieb“ wechseln und öffnen“ → Vorgang erscheint, Umgebungsauswahl steht auf Betrieb.
# (2) Werkstatt des anderen Standorts öffnet denselben Link (kalt, mit Anmeldung) → „Vorgang nicht gefunden“ + Hinweis, warum ein
#     zugeschickter Link nicht aufgeht; KEIN Umschaltknopf, keine Umgebungsangabe (keine Existenz-Offenlegung).
# (3) Backlog 1019: Fahrer öffnet einen zugeschickten Fahrzeugakten-Link (#/vehicles/VIN:…) → Fahrerseite des Fahrzeugs (#/v/VIN:…) statt
#     „Fahrzeugakten sind für Fahrer nicht freigegeben“.
# DE 390 px, UK 820 px, EN 1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SW = {'de': 'wechseln und öffnen', 'uk': 'і відкрити', 'en': 'and open'}
HINT = {'de': 'Wurde dir der Link geschickt?', 'uk': 'Вам надіслали це посилання?', 'en': 'Was this link sent to you?'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lw.inhaber', 'display_name': 'LW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['lw.inhaber', 'pa.inhaber', 'le.inhaber', 'inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, f'Anmeldung Inhaber ({owner})')
    pid = os.getpid(); wun = f'lw.wsmuc{pid}'
    u = api('POST', '/api/users', {'username': wun, 'display_name': 'LW WS München', 'role': 'workshop', 'environment': 'production', 'workshop_site': 'MUENCHEN'})
    c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    dun = f'lw.fahrer{pid}'
    u = api('POST', '/api/users', {'username': dun, 'display_name': 'LW Fahrer', 'role': 'driver', 'environment': 'production'})
    c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    vin = f'WDB9634033{pid % 1000000:06d}1'
    api('POST', '/api/vehicles', {'plate': f'LW-T {pid % 9000}', 'vin': vin, 'site': 'Dortmund'})
    r = a.evaluate("""async ([vin, pid]) => { const x = await fetch('/api/cases', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cfp': '1', 'x-cfp-env': 'production' },
      body: JSON.stringify({ vehicle_id: 'VIN:' + vin, description: 'LW Link-Probe ' + pid, priority: 'mittel', driveability: 'fahrbereit', workshop_site: 'DORTMUND', request_key: 'lw-' + pid }) }); return { s: x.status, d: await x.json() }; }""", [vin, pid])
    check(r['s'] == 201, f'Betriebsvorgang angelegt ({r["s"]})'); cid = r['d'].get('id')
    for lang, w in [('de', 390), ('uk', 820), ('en', 1366)]:
        print('—', lang, w)
        # (1) Inhaber, Ansicht Test
        ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.evaluate("localStorage.setItem('cfp_env', 'test')")
        q.goto(B + f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#errh', timeout=15000); q.wait_for_timeout(300)
        txt = q.inner_text('#app')
        check(q.locator('#rlenv').count() == 1 and SW[lang] in q.inner_text('#rlenv'), f'{lang} {w}px: Umschaltknopf für den Inhaber')
        check('{' not in txt, f'{lang} {w}px: keine offenen Platzhalter')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang} {w}px: ohne Querscrollen (Fehlerseite)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/link_env_{lang}_{w}.png')
        q.click('#rlenv')
        try: q.wait_for_function(f"() => document.body.innerText.includes('LW Link-Probe {pid}')", timeout=15000)
        except Exception: pass
        check(f'LW Link-Probe {pid}' in q.inner_text('#app'), f'{lang} {w}px: Vorgang nach dem Umschalten sichtbar')
        check(q.evaluate("localStorage.getItem('cfp_env')") == 'production', f'{lang} {w}px: Ansicht steht auf Betrieb')
        if SHOTS: q.screenshot(path=f'{SHOTS}/link_env_offen_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
        # (2) Werkstatt anderer Standort, Link kalt geöffnet
        ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wun, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate(JS, ['POST', '/api/logout', None])
        q.goto(B + f'/#/cases/{cid}'); q.wait_for_selector('#u', timeout=15000)
        q.fill('#u', wun); q.fill('#p', PW); q.press('#p', 'Enter'); q.wait_for_selector('#errh', timeout=15000); q.wait_for_timeout(300)
        txt = q.inner_text('#app')
        check(HINT[lang] in txt, f'{lang} {w}px: Hinweis zum zugeschickten Link')
        check(q.locator('#rlenv').count() == 0 and f'LW Link-Probe' not in txt, f'{lang} {w}px: kein Umschaltknopf, kein Inhalt')
        check(q.locator('#rlhome').count() == 1, f'{lang} {w}px: „Zur Übersicht“')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/link_ws_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
        # (3) Fahrer, Fahrzeugakten-Link kalt geöffnet
        ctx = br.new_context(viewport={'width': w, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': dun, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate(JS, ['POST', '/api/logout', None])
        q.goto(B + f'/#/vehicles/VIN:{vin}'); q.wait_for_selector('#u', timeout=15000)
        q.fill('#u', dun); q.fill('#p', PW); q.press('#p', 'Enter')
        try: q.wait_for_function(f"() => location.hash === '#/v/VIN:{vin}' && document.querySelector('#main h1, main h1')", timeout=15000)
        except Exception: pass
        q.wait_for_timeout(500); txt = q.inner_text('#app')
        check(q.evaluate('location.hash') == f'#/v/VIN:{vin}', f'{lang} {w}px: Fahrer landet auf der Fahrerseite ({q.evaluate("location.hash")})')
        check(q.locator('#errh').count() == 0 and f'LW-T {pid % 9000}' in txt, f'{lang} {w}px: Fahrzeug sichtbar, keine Fehlerseite')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang} {w}px: ohne Querscrollen (Fahrer)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/link_fahrer_{lang}_{w}.png')
        # auch bei laufender App (Unterseite der Akte)
        q.evaluate(f"location.hash = '#/vehicles/VIN:{vin}/timeline'"); q.wait_for_timeout(1500)
        check(q.evaluate('location.hash') == f'#/v/VIN:{vin}' and q.locator('#errh').count() == 0, f'{lang} {w}px: Unterseite der Akte → Fahrerseite ({q.evaluate("location.hash")})')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + '; '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
