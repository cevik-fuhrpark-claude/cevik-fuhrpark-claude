# [CLAUDE] UI-Test (28.10.2026, Backlog 495–497, Blickwinkel „Vorgang als Auftrag für eine Fremdwerkstatt drucken“): Vorgang zeigt der Leitung
# FIN/Hersteller/Anhänger (Bildschirm und Druck), Navigationslinks „Fahrzeugakte ›“ fehlen im Druck; Fahrer sieht keine FIN.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'da.inhaber', 'display_name': 'DA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['da.inhaber', 'qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340314{pid:03d}{i + 10:03d}'
        check(api('POST', '/api/vehicles', {'plate': f'DA-Z {pid}{i}', 'vin': vin, 'site': 'Dortmund', 'manufacturer': 'MAN', 'model': 'TGX 18.510', 'trailer_plate': f'DA-H {pid}{i}'})['s'] == 201, f'{lang}: Fahrzeug')
        du = f'da.fahrer{pid}{i}'; r = api('POST', '/api/users', {'username': du, 'display_name': du.upper(), 'role': 'driver', 'environment': envname, 'language': lang})
        c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}])
        cid = p0.evaluate(JS, ['POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'Spiegel rechts lose DA {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())}])['d']['id']
        p0.goto(B + f'/#/cases/{cid}'); p0.wait_for_selector('h1', timeout=15000); p0.wait_for_timeout(800)
        check(p0.locator('[data-cvin]').count() == 0, f'{lang}: Fahrer ohne FIN'); c0.close()
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-cvin]', timeout=15000)
        kv = q.inner_text('[data-cvin]'); body = q.inner_text('main')
        check(kv.strip() == vin and 'MAN TGX 18.510' in body and f'DA-H {pid}{i}' in body, f'{lang} {w}px: FIN, Hersteller/Modell, Anhänger')
        check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
        q.emulate_media(media='print'); q.evaluate("dispatchEvent(new Event('beforeprint'))"); q.wait_for_timeout(300)
        check(q.locator('[data-cvin]').is_visible(), f'{lang} {w}px: FIN im Druck')
        vis = q.evaluate("() => [...document.querySelectorAll('main a')].filter((a) => a.textContent.includes('›') && a.offsetParent !== null).map((a) => a.textContent.trim())")
        check(not vis, f'{lang} {w}px: keine „›“-Navigationslinks im Druck {vis[:3]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/druck_auftrag_{lang}_{w}.png', full_page=True)
        q.emulate_media(media='screen'); q.evaluate("dispatchEvent(new Event('afterprint'))")
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
