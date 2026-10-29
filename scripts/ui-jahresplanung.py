# [CLAUDE] UI-Test (29.10.2026, Backlog 610–613, Blickwinkel „Jahresplanung 2027“): Fahrerliste „Fristen bis“ mit Schnellwahl
# „bis Ende nächsten Jahres“ (nur Fahrer mit Frist bis dahin, früheste zuerst, Datum in der Zeile), Prüftermine mit „Fällig bis“
# nach Monat gruppiert, SP „Frist ungeklärt“ (Erstzulassung fehlt) als Zeile mit Grund, Verträge mit Jahres-Schnellwahl.
# Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
Y1 = datetime.date.today().year + 1
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'jp.inhaber', 'display_name': 'JP Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'jp.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    pid = os.getpid()
    # Fahrer: einer mit Frist im nächsten Jahr, einer danach
    d1 = api('POST', '/api/drivers', {'display_name': f'JP Früh {pid}'})['d']['id']
    d2 = api('POST', '/api/drivers', {'display_name': f'JP Später {pid}'})['d']['id']
    check(api('POST', f'/api/drivers/{d1}/documents', {'kind': 'code95', 'valid_until': f'{Y1}-03-31', 'evidence': 'Original gesehen'})['s'] == 201, 'Code 95 nächstes Jahr')
    check(api('POST', f'/api/drivers/{d2}/documents', {'kind': 'code95', 'valid_until': f'{Y1 + 2}-03-31', 'evidence': 'Original gesehen'})['s'] == 201, 'Code 95 übernächstes Jahr')
    # Lkw > 12 t ohne Erstzulassung mit HU → SP „Frist ungeklärt“ ohne Datum
    vin = f'WMAJP{pid % 100000:05d}0000000'[:17]; VID = 'VIN:' + vin; plate = f'JP-SP {pid % 1000}'
    check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})['s'] == 201, 'Fahrzeug')
    check(api('POST', f'/api/vehicles/{VID}/spec', {'zgm_class': 'ueber_12', 'spec_source': 'Test'})['s'] == 200, 'zGM')
    hu = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()
    check(api('POST', f'/api/vehicles/{VID}/maintenance', {'kind': 'HU', 'last_done_date': hu, 'evidence': 'HU-Bericht'})['s'] == 201, 'HU')
    for lang, w in [('uk', 390), ('de', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'jp.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/drivers'); q.wait_for_selector('#ddueyear')
        q.click('#ddueyear'); q.wait_for_selector('[data-ddue]')
        rows = q.locator('#app .list a.row').all_inner_texts()
        check(any(f'JP Früh {pid}' in r and (f'31.03.{Y1}' in r or f'31/03/{Y1}' in r) for r in rows) and not any(f'JP Später {pid}' in r for r in rows), f'{lang}: Fahrerliste bis Ende {Y1}: {[r[:60] for r in rows][:3]}')
        check(q.input_value('#ddueby') == f'{Y1}-12-31', f'{lang}: Stichtag im Feld')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahresplanung-fahrer-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Fahrer kein Querscrollen')
        q.click('#dueclr'); q.wait_for_selector('[data-ddue]', state='detached')
        check(any(f'JP Später {pid}' in r for r in q.locator('#app .list a.row').all_inner_texts()), f'{lang}: alle Fahrer nach Zurücksetzen')
        q.goto(B + '/#/maintenance'); q.wait_for_selector('#mdueyear'); q.click('#mdueyear'); q.wait_for_selector('[data-mdueby]')
        check(q.locator('h3.mgrp').count() >= 1, f'{lang}: Monatsgruppen ({q.locator("h3.mgrp").count()})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahresplanung-pruef-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Prüftermine kein Querscrollen')
        q.click('[data-mf="ungeklaert"]'); q.wait_for_selector('[data-mf="ungeklaert"].btn:not(.secondary)')
        un = q.locator('#app .list a.row').all_inner_texts()
        check(any(plate in r for r in un), f'{lang}: SP ungeklärt in Reiter: {[r[:80] for r in un if plate in r][:1]}')
        q.click('[data-mf="due"]')
        q.goto(B + '/#/contracts'); q.wait_for_selector('#ctyear'); q.click('#ctyear'); q.wait_for_selector('#ctendsby[value="%d-12-31"]' % Y1)
        check(True, f'{lang}: Verträge bis Ende {Y1}')
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Verträge kein Querscrollen')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:', len(fails)) if fails else print('OK')
raise SystemExit(1 if fails else 0)
