# [CLAUDE] UI-Test (29.10.2026, Backlog 620, Blickwinkel „HU-Prüfer auf dem Hof“): HU-Formular der Fahrzeugakte mit geplantem Termin als
# vorbelegtem Datum, Häkchen „SP am selben Tag (gleicher Bericht)“ mit eigenem SP-Ergebnis und optionalem Prüfbericht (PDF) –
# ein Absenden speichert HU, SP und Dokument „Prüfbericht“. Handy 390 px (UK), Tablet 820 px (DE), PC 1366 px (EN); kein Querscrollen.
import os, datetime, tempfile
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
pdf = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False); pdf.write(b'%PDF-1.4\n% Pruefbericht HU SP ' + str(os.getpid()).encode() + b'\n%%EOF'); pdf.close()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hz.inhaber', 'display_name': 'HZ Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'hz.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    day = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    for i, (lang, w) in enumerate([('uk', 390), ('de', 820), ('en', 1366)]):
        print('—', lang, w)
        pid = (os.getpid() * 3 + i) % 1000; vin = f'WMAHZ{pid:03d}000000000'[:17]; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'HZ-L {pid}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Lkw')
        check(api('POST', f'/api/vehicles/{VID}/spec', {'zgm_class': 'ueber_12', 'first_registration': '2018-04-01', 'spec_source': 'Test'})['s'] == 200, f'{lang}: zGM')
        check(api('POST', f'/api/vehicles/{VID}/husp/HU/plan', {'planned_date': day})['s'] == 200, f'{lang}: HU-Termin gestern geplant')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'hz.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + f'/#/vehicles/{VID}'); q.wait_for_selector('form[data-hskind="HU"]', state='attached')
        f = q.locator('form[data-hskind="HU"]')
        q.evaluate("() => { const d = document.querySelector('form[data-hskind=\"HU\"]').closest('details'); d.open = true; }")
        check(f.locator('[name=done_date]').input_value() == day, f'{lang}: Datum aus geplantem Termin')
        check(f.locator('[data-hsfromplan]').count() == 1, f'{lang}: Hinweis „aus Termin“')
        check(f.locator('[data-hsspbox]').is_hidden(), f'{lang}: SP-Ergebnis erst nach Häkchen')
        f.locator('[name=evidence]').fill('TÜV 2001'); f.locator('[name=result]').select_option('ohne_maengel')
        f.locator('[data-hsspsame]').check(); check(f.locator('[data-hsspbox]').is_visible(), f'{lang}: SP-Ergebnis sichtbar')
        f.locator('[name=sp_result]').select_option('erhebliche_maengel')
        f.locator('[name=report_file]').set_input_files(pdf.name)
        if SHOTS: q.screenshot(path=f'{SHOTS}/husp-zusammen-{lang}-{w}.png', full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth') <= w, f'{lang}: kein Querscrollen')
        f.locator('button.btn').first.click()
        ok = True
        try: q.wait_for_function("() => [...document.querySelectorAll('#app .row')].some((r) => r.textContent.includes('TÜV 2001'))", timeout=15000)
        except Exception as ex: ok = False; print('   ', ex)
        d = api('GET', f'/api/vehicles/{VID}')['d']
        hist = d.get('maintenance_history') or []
        check(any(h['kind'] == 'HU' and h['done_date'] == day and h.get('result') == 'ohne_maengel' for h in hist), f'{lang}: HU gespeichert')
        check(any(h['kind'] == 'SP' and h['done_date'] == day and h.get('result') == 'erhebliche_maengel' and h['evidence'] == 'TÜV 2001' for h in hist), f'{lang}: SP mit eigenem Ergebnis')
        docs = d.get('documents') or []
        check(ok and any(x.get('doc_kind') == 'pruefbericht' and 'TÜV 2001' in (x.get('doc_note') or '') for x in docs), f'{lang}: Prüfbericht abgelegt {[(x.get("doc_kind"), x.get("doc_note")) for x in docs]}')
        check(d['hu_sp']['sp']['status'] == 'ungeklaert', f'{lang}: SP „Frist ungeklärt“ (Backlog 617)')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}])
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('UI HU+SP zusammen: ' + ('grün' if not fails else f'{len(fails)} Fehler'))
raise SystemExit(1 if fails else 0)
