# [CLAUDE] UI-Test (29.10.2026, Backlog 615/616, Blickwinkel „Jahreskosten für den Steuerberater“): Kostenbericht mit Knopf „CSV je Fahrzeug“
# (Download liefert Kopf + Summenzeile), Hinweis auf Verträge ruhender Fahrzeuge („nicht gerechnet“).
# Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CSV = """async (path) => { const r = await fetch(path, { headers: { 'x-cfp': '1' } }); return { s: r.status, t: await r.text() }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
Y = datetime.date.today().year
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'jk.inhaber', 'display_name': 'JK Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'jk.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    pid = os.getpid(); vin = f'WMAJK{pid % 100000:05d}0000000'[:17]; VID = 'VIN:' + vin
    check(api('POST', '/api/vehicles', {'plate': f'JK-RU {pid % 1000}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, 'Fahrzeug')
    c = api('POST', f'/api/vehicles/{VID}/contracts', {'kind': 'versicherung', 'partner': 'Test-Versicherung', 'evidence': 'Police', 'start_date': f'{Y - 1}-01-01', 'monthly_rate_net': 150})
    check(c['s'] == 201, f'Vertrag {c["s"]}')
    check(api('POST', f'/api/vehicles/{VID}/evaluation', {'excluded': True, 'reason': 'Test ruhend'})['s'] == 200, 'ruhend')
    r = a.evaluate(CSV, f'/api/reports/costs?from={Y}-01&to={Y}-{datetime.date.today().month:02d}&format=csv&part=vehicles')
    check(r['s'] == 200 and r['t'].lstrip('﻿').startswith('Kennzeichen;') and 'Außer Betrieb seit' in r['t'], f'CSV je Fahrzeug {r["s"]}')
    for lang, w in [('uk', 390), ('de', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx = br.new_context(viewport={'width': w, 'height': 1000}, accept_downloads=True); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'jk.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/costs'); q.wait_for_selector('#csvv')
        check(q.locator('[data-ccdormant]').count() == 1, f'{lang}: Hinweis Verträge ruhender Fahrzeuge: {q.locator("[data-ccdormant]").all_inner_texts()[:1]}')
        with q.expect_download() as dl: q.click('#csvv')
        check('kosten-je-fahrzeug' in dl.value.suggested_filename, f'{lang}: Download {dl.value.suggested_filename}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahreskosten-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:', len(fails)) if fails else print('OK')
raise SystemExit(1 if fails else 0)
