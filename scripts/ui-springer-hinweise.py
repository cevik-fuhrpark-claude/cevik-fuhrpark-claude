# [CLAUDE] UI-Test (28.10.2026, Backlog 481/482, Blickwinkel „Springer holt den Lkw eines kranken Kollegen“):
# Fahrer der Zugmaschine öffnet Abfahrtskontrolle (#/check/<id>, wie über den QR-Aufkleber) und Meldeformular (#/new/<id>) →
# Hinweise für Fahrer (Lkw + Anhänger) und der bekannte Mangel des gekoppelten Aufliegers sind sichtbar; abgelaufener Hinweis nicht.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sh.inhaber', 'display_name': 'SH Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['sh.inhaber', 'dg.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        T = f'VIN:WDB96340311{pid:03d}{i + 10:03d}'; H = f'VIN:WDB96340311{pid:03d}{i + 20:03d}'; tp = f'SH-Z {pid}{i}'; hp = f'SH-H {pid}{i}'
        check(api('POST', '/api/vehicles', {'plate': tp, 'vin': T[4:], 'site': 'Dortmund', 'trailer_plate': hp})['s'] == 201, f'{lang}: Zugmaschine')
        check(api('POST', '/api/vehicles', {'plate': hp, 'vin': H[4:], 'site': 'Dortmund', 'kind': 'anhaenger'})['s'] == 201, f'{lang}: Auflieger')
        api('POST', '/api/cases', {'vehicle_id': H, 'description': f'Rückleuchte Auflieger UI-Springer {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        check(api('POST', f'/api/vehicles/{T}/notes', {'text': f'Steht auf Autohof A2, Schlüssel an der Kasse {i}', 'for_driver': True})['s'] == 201, f'{lang}: Hinweis Lkw')
        check(api('POST', f'/api/vehicles/{H}/notes', {'text': f'Hecktür klemmt {i}', 'for_driver': True})['s'] == 201, f'{lang}: Hinweis Auflieger')
        u = f'sh.fahrer{pid}{i}'
        r = api('POST', '/api/users', {'username': u, 'display_name': u.upper(), 'role': 'driver', 'environment': envname})
        uid = r['d'].get('id') or r['d'].get('user', {}).get('id')
        c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
        api('POST', f'/api/vehicles/{T}/drivers', {'user_id': uid, 'end_previous': False})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS, ['POST', '/api/login', {'username': u, 'password': PW}])['s'] == 200, f'{lang}: Fahrer angemeldet')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        for route, name in [(f'/#/check/{T}', 'Abfahrtskontrolle'), (f'/#/new/{T}', 'Melden')]:
            q.goto(B + route); q.reload(); q.wait_for_selector('#known', state='attached', timeout=15000)
            try: q.wait_for_selector('#known .vnotes-drv', timeout=8000)
            except Exception: pass
            kn = q.inner_text('#known')
            check(f'Autohof A2, Schlüssel an der Kasse {i}' in kn and f'{hp}: Hecktür klemmt {i}' in kn, f'{lang} {w}px {name}: Hinweise für Fahrer')
            check(q.locator('#known [data-coupled]').count() == 1 and f'UI-Springer {i}' in q.inner_text('#known [data-coupled]'), f'{lang} {w}px {name}: Mangel des gekoppelten Aufliegers')
            check(q.evaluate(noscroll), f'{lang} {w}px {name}: ohne Querscrollen')
            if SHOTS: q.locator('#known').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/springer_{name[:5].lower()}_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
