# [CLAUDE] UI-Test (29.10.2026, Backlog 624, Blickwinkel „Versichererwechsel zum 01.01.“): Mehr → Verträge → „Mehrere Verträge beenden oder
# Vertragsende eintragen“ – Art „Versicherung“ filtern, alle auswählen, Vertragsende künftig eintragen (Ergebnis mit nicht übernommenem Vertrag),
# danach beenden mit Grund. Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
d = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vs.inhaber', 'display_name': 'VS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'vs.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    for i, (lang, w) in enumerate([('uk', 390), ('de', 820), ('en', 1366)]):
        print('—', lang, w)
        pid = (os.getpid() * 3 + i) % 1000; ids = []
        for j in range(2):
            vin = f'WMAV{j}{pid:03d}000000000'[:17]
            check(api('POST', '/api/vehicles', {'plate': f'VS-{j} {pid}', 'vin': vin, 'site': f'Sammel{pid}'})['s'] == 201, f'{lang}: Lkw {j}')
            r = api('POST', f'/api/vehicles/VIN:{vin}/contracts', {'kind': 'versicherung', 'partner': f'Alt-{pid} AG', 'contract_no': f'A-{j}', 'start_date': '2025-01-01', 'evidence': 'Police', **({'end_date': d(300)} if j == 1 else {})})
            check(r['s'] == 201, f'{lang}: Vertrag {j}'); ids.append(r['d']['id'])
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'vs.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/contracts'); q.wait_for_selector('#ctk')
        q.select_option('#ctk', 'versicherung'); q.wait_for_selector('#ctbf', state='attached')
        if q.locator('#ctsite').count(): q.select_option('#ctsite', label=f'Sammel{pid}') if f'Sammel{pid}' in q.inner_text('#ctsite') else None
        q.wait_for_timeout(500)
        q.evaluate("() => { document.querySelector('#ctbatch').open = true; }")
        for cid in ids: q.check(f'#ctbf input[name=ctbid][value="{cid}"]')
        check(q.locator('[data-ctbm="end_date"]').is_visible() and q.locator('[data-ctbm="end"]').is_hidden(), f'{lang}: Modus Vertragsende sichtbar')
        q.fill('#ctbdate', d(60))
        if SHOTS: q.screenshot(path=f'{SHOTS}/vsammel-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        q.click('#ctbgo'); q.wait_for_selector('[data-ctbres]', timeout=15000)
        res = q.inner_text('[data-ctbres]')
        check(f'VS-1 {pid}' in res and f'VS-0 {pid}' not in res, f'{lang}: Ergebnis nennt nur den nicht übernommenen ({res[:120]!r})')
        c0 = api('GET', '/api/contracts?filter=alle')['d']['contracts']
        check(next(x for x in c0 if x['id'] == ids[0])['end_date'] == d(60), f'{lang}: Ende eingetragen')
        # beenden mit Grund
        q.evaluate("() => { document.querySelector('#ctbatch').open = true; }")
        q.check('#ctbf input[name=mode][value=end]'); check(q.locator('[data-ctbm="end"]').is_visible(), f'{lang}: Modus Beenden')
        for cid in ids:
            if q.locator(f'#ctbf input[name=ctbid][value="{cid}"]').count(): q.check(f'#ctbf input[name=ctbid][value="{cid}"]')
        q.fill('#ctbnote', 'Versichererwechsel (Test)')
        q.once('dialog', lambda dl: dl.accept()); q.click('#ctbgo'); q.wait_for_selector('[data-ctbres]', timeout=15000)
        c1 = api('GET', '/api/contracts?filter=alle')['d']['contracts']
        check(all(next(x for x in c1 if x['id'] == cid).get('ended_on') for cid in ids), f'{lang}: beide beendet')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('UI Verträge gesammelt: ' + ('grün' if not fails else f'{len(fails)} Fehler'))
raise SystemExit(1 if fails else 0)
