# [CLAUDE] UI-Test (29.10.2026, Backlog 621–623, Blickwinkel „Versichererwechsel zum 01.01.“): Versicherungsfall – Vertragsauswahl mit Laufzeit,
# am Schadentag gültiger Vertrag vorausgewählt (Hinweis), Warnung beim Speichern mit nicht gültigem Vertrag; Vertragsimport-Vorschau nennt
# „läuft parallel“; Datenqualität zeigt „Lücke im erfassten Versicherungsschutz“. Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN).
import os, datetime, tempfile
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'vw.inhaber', 'display_name': 'VW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'vw.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    pid = os.getpid() % 1000; vin = f'WMAVW{pid:03d}000000000'[:17]; VID = 'VIN:' + vin; plate = f'VW-L {pid}'
    check(api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'})['s'] == 201, 'Lkw')
    mk = lambda b: api('POST', f'/api/vehicles/{VID}/contracts', {'kind': 'versicherung', 'evidence': 'Police', **b})
    check(mk({'partner': 'Alt-Versicherung AG', 'contract_no': 'A-1', 'start_date': '2025-01-01', 'end_date': d(-10)})['s'] == 201, 'Altvertrag')
    check(mk({'partner': 'Neu-Versicherung SE', 'contract_no': 'N-1', 'start_date': d(-8)})['s'] == 201, 'Neuvertrag ab Lücke')
    c = api('POST', '/api/cases', {'vehicle_id': VID, 'description': 'Unfall Heck (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'vw-{pid}'})['d']['id']
    csv = f'Kennzeichen;Vertragsart;Vertragspartner;Vertragsnummer;Beginn;Nachweis\n{plate};Versicherung;Dritte Versicherung;D-1;{d(30)};Police D-1\n'
    f = tempfile.NamedTemporaryFile(suffix='.csv', delete=False); f.write(csv.encode('utf-8')); f.close()
    for lang, w in [('uk', 390), ('de', 820), ('en', 1366)]:
        print('—', lang, w)
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'vw.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + f'/#/cases/{c}'); q.wait_for_selector('#clf', state='attached')
        opts = q.eval_on_selector_all('#clf [name=contract_id] option', 'os => os.map((o) => o.textContent)')
        check(any('Neu-Versicherung SE' in o and '–' in o for o in opts) and any('Alt-Versicherung AG' in o and '–' in o for o in opts), f'{lang}: Laufzeit in der Auswahl {opts}')
        sel = q.eval_on_selector('#clf [name=contract_id]', 's => s.options[s.selectedIndex].textContent')
        check('Neu-Versicherung SE' in sel and q.locator('[data-claimprek]').count() == 1, f'{lang}: gültiger Vertrag vorausgewählt ({sel})')
        q.locator('#clf').evaluate('f => f.closest("details").open = true')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vwechsel-fall-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Vorgang kein Querscrollen')
        q.goto(B + '/#/contracts'); q.wait_for_selector('#ctimp', state='attached')
        q.evaluate("() => { const d = document.querySelector('#ctimp').closest('details'); if (d) d.open = true; }")
        q.set_input_files('#ctimp', f.name); q.wait_for_selector('#ctimpr [data-ctpar]', timeout=15000)
        check('Alt-Versicherung' in q.inner_text('#ctimpr [data-ctpar]') or 'Neu-Versicherung' in q.inner_text('#ctimpr [data-ctpar]'), f'{lang}: Vorschau „läuft parallel“')
        check(q.locator('[data-ctparhint]').count() == 1, f'{lang}: Hinweis unter der Vorschau')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vwechsel-import-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Verträge kein Querscrollen')
        q.goto(B + '/#/quality'); q.wait_for_selector('#app h2, #app .panel')
        q.wait_for_timeout(1500)
        txt = q.inner_text('#app')
        check(plate in txt and ('Lücke' in txt or 'Gap' in txt or 'Розрив' in txt), f'{lang}: Datenqualität nennt die Lücke')
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: Datenqualität kein Querscrollen')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Warnung beim Speichern (einmal, DE): alten Vertrag wählen
    ctx = br.new_context(viewport={'width': 820, 'height': 1000}); q = ctx.new_page(); q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'vw.inhaber', 'password': PW}])
    q.goto(B + f'/#/cases/{c}'); q.wait_for_selector('#clf', state='attached'); q.locator('#clf').evaluate('f => f.closest("details").open = true')
    q.select_option('#clf [name=contract_id]', label=[o for o in q.eval_on_selector_all('#clf [name=contract_id] option', 'os => os.map((o) => o.textContent)') if 'Alt-Versicherung' in o][0])
    q.fill('#clf [name=reported_on]', d(0)); q.fill('#clf [name=evidence]', 'Schadenmeldung')
    q.fill('#clf [name=insurer]', '')
    q.locator('#clf button.btn').first.click(); q.wait_for_selector('.toast', timeout=10000); q.wait_for_timeout(500)
    tx = ' '.join(q.locator('.toast').all_inner_texts())
    check('galt am Schadentag' in tx, f'Warnung beim Speichern: {tx[:120]}')
    ctx.close(); br.close()
print('UI Versichererwechsel: ' + ('grün' if not fails else f'{len(fails)} Fehler'))
raise SystemExit(1 if fails else 0)
