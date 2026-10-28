# [CLAUDE] UI-Test (28.10.2026, Backlog 492–494, Blickwinkel „QR-Aufkleber auf dem Hof scannen“): Scan-Seite zeigt „Meldung offen“
# (Leitung: Link zur Akte); Lesezugriff scannt ein außer Betrieb genommenes Fahrzeug → Fahrzeugakte statt „bitte auswählen“;
# Sitzung bei offener App beendet → nach erneuter Anmeldung wieder die Scan-Seite des Fahrzeugs. DE 390, UK 820, EN 1366; kein Querscrollen.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'qr.inhaber', 'display_name': 'QR Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        V = f'VIN:WDB96340313{pid:03d}{i + 10:03d}'; X = f'VIN:WDB96340313{pid:03d}{i + 20:03d}'
        api('POST', '/api/vehicles', {'plate': f'QR-A {pid}{i}', 'vin': V[4:], 'site': 'Dortmund'})
        api('POST', '/api/vehicles', {'plate': f'QR-X {pid}{i}', 'vin': X[4:], 'site': 'Dortmund'})
        api('POST', '/api/cases', {'vehicle_id': V, 'description': f'Spiegel QR {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        check(api('POST', f'/api/vehicles/{X}/active', {'active': False, 'reason': 'verkauft'})['s'] == 200, f'{lang}: außer Betrieb')
        vu = f'qr.lesen{pid}{i}'; r = api('POST', '/api/users', {'username': vu, 'display_name': vu.upper(), 'role': 'viewer', 'environment': envname, 'language': lang})
        c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
        # Leitung: Scan-Seite mit offener Meldung
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + f'/#/v/{V}'); q.reload(); q.wait_for_selector('[data-scanav]', timeout=15000); TT = q.evaluate(TR)
        check(q.inner_text('[data-scanav]').strip() == TT['av_meldung_offen'] and q.locator('[data-scanav] a').count() == 1, f'{lang} {w}px: Scan zeigt „{TT["av_meldung_offen"]}“ mit Link zur Akte')
        check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Scan)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/qr_scan_{lang}_{w}.png')
        # Sitzung am Server beenden, dann erneut scannen → Anmeldung → wieder Scan-Seite
        q.goto(B + '/#/'); q.wait_for_timeout(500); q.evaluate(JS, ['POST', '/api/logout', None]); q.evaluate(f"location.hash = '#/v/{V}'")
        q.wait_for_selector('#u', timeout=15000)
        q.fill('#u', owner); q.fill('#p', PW); q.press('#p', 'Enter')
        try: q.wait_for_selector('[data-scanav]', timeout=15000)
        except Exception: pass
        check(q.locator('[data-scanav]').count() == 1, f'{lang} {w}px: nach Anmeldung wieder Scan-Seite ({q.evaluate("location.hash")})')
        check(not errs, f'{lang}: ohne Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
        # Lesezugriff: außer Betrieb → Akte
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': vu, 'password': PW}])
        q.goto(B + f'/#/v/{X}'); q.reload()
        try: q.wait_for_function(f"() => location.hash.startsWith('#/vehicles/')", timeout=15000)
        except Exception: pass
        check(q.evaluate('location.hash').replace('%3A', ':') == f'#/vehicles/{X}', f'{lang} {w}px: Lesezugriff landet in der Akte ({q.evaluate("location.hash")})')
        q.wait_for_timeout(800); check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Akte)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/qr_ausser_betrieb_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler (Lesezugriff) {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
