# [CLAUDE] UI-Test (23.10.2026, Backlog 188 „Jahresabschluss/Fahrzeugverkauf“):
# (1) Vorgang: Teile und Fremdleistungen zeigen den Erfassungstag („erfasst …“, Hinweis: zählt im Monat der Erfassung).
# (2) Fahrzeugakte → Vertrag ändern: Ratenänderung an einem Vertrag mit Beginn vor dem laufenden Monat fragt nach (rückwirkend);
#     „Abbrechen“ lässt die Rate unverändert, „OK“ speichert. Ohne Ratenänderung keine Rückfrage.
# (3) Backlog 189: Werkstatt bucht Arbeitszeit mit Datum im Vormonat → Rückfrage (Abbrechen = keine Buchung, OK = gebucht);
#     Kostenbericht zeigt beim Vormonat „1 nachträglich erfasst“.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BOOKED = {'de': 'erfasst', 'uk': 'внесено', 'en': 'recorded'}
LATE = {'de': 'nachträglich erfasst', 'uk': 'внесено пізніше', 'en': 'recorded later'}
PAST = {'de': 'vergangenen Monat', 'uk': 'минулий місяць', 'en': 'past month'}
RETRO = {'de': 'alle Monate der Laufzeit', 'uk': 'всіх місяців строку', 'en': 'all months of the term'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ja.inhaber', 'display_name': 'JA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'ja.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    pid = os.getpid()
    u = api('POST', '/api/users', {'username': f'ja.ws{pid}', 'display_name': 'JA Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); w0 = c0.new_page(); w0.goto(B); w0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    w0.evaluate(JS, ['POST', '/api/login', {'username': f'ja.ws{pid}', 'password': PW}])
    wapi = lambda m, pa, b=None: w0.evaluate(JS, [m, pa, b])
    for i, (lang, w) in enumerate([('de', 820), ('uk', 390), ('en', 1366)]):
        print('—', lang, w)
        vin = f'WDB9634031018880{i}'; VID = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'JA-AB 18{i}', 'vin': vin, 'site': 'Dortmund'})
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Bremse {lang}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'ja-{pid}-{lang}'})['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'ja1-{pid}-{lang}', 'expected_version': ver(), 'note': 'prüfen', 'payload': {'workshop_site': site}})
        r = wapi('POST', f'/api/cases/{cid}/commands', {'action': 'start_repair', 'command_id': f'ja2-{pid}-{lang}', 'expected_version': ver(), 'payload': {}})
        check(r['s'] == 200, f'{lang}: Reparatur begonnen ({r["s"]})')
        r = wapi('POST', f'/api/cases/{cid}/commands', {'action': 'add_part', 'command_id': f'ja3-{pid}-{lang}', 'expected_version': ver(), 'payload': {'name': 'Bremsbelagsatz', 'quantity': 1, 'unit_price_net': '120,50'}})
        check(r['s'] == 200, f'{lang}: Teil erfasst ({r["s"]} {r["d"] if r["s"] != 200 else ""})')
        r = api('POST', f'/api/cases/{cid}/commands', {'action': 'add_external_cost', 'command_id': f'ja4-{pid}-{lang}', 'expected_version': ver(), 'payload': {'supplier': 'Elektrik Test', 'invoice_no': f'R-188-{lang}', 'amount_net': 80}})
        check(r['s'] == 200, f'{lang}: Fremdleistung erfasst ({r["s"]})')
        c = api('POST', f'/api/vehicles/{VID}/contracts', {'kind': 'leasing', 'partner': f'Leasing Test {lang}', 'start_date': '2024-01-01', 'end_date': '2029-12-31', 'monthly_rate_net': '1000', 'evidence': 'Vertrag (Test)'})
        check(c['s'] == 201, f'{lang}: Vertrag angelegt ({c["s"]})')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        dialogs = []; answer = {'ok': False}
        def on_dialog(d):
            dialogs.append(d.message); (d.accept() if answer['ok'] else d.dismiss())
        q.on('dialog', on_dialog)
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'ja.inhaber', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act]', timeout=15000); q.wait_for_timeout(400)
        n = q.evaluate("(w) => [...document.querySelectorAll('td span.small.muted[title]')].filter(s => s.innerText.startsWith(w)).length", BOOKED[lang])
        check(n == 2, f'{lang}/{w}: Erfassungstag bei Teil und Fremdleistung ({n})')
        check(q.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahresabschluss-vorgang-{lang}-{w}.png', full_page=True)
        q.goto(B + '/#/vehicles/' + VID); q.wait_for_selector('form[data-ctedit]', state='attached', timeout=15000); q.wait_for_timeout(400)
        q.evaluate("document.querySelector('form[data-ctedit]').closest('details').open = true")
        fm = q.locator('form[data-ctedit]').first
        fm.locator('[name=partner]').fill(f'Leasing Test {lang} GmbH')
        fm.locator('button[type=submit], button.btn').first.click(); q.wait_for_timeout(1200)
        check(len(dialogs) == 0, f'{lang}/{w}: ohne Ratenänderung keine Rückfrage')
        q.wait_for_selector('form[data-ctedit]', state='attached', timeout=15000)
        q.evaluate("document.querySelector('form[data-ctedit]').closest('details').open = true")
        fm = q.locator('form[data-ctedit]').first
        fm.locator('[name=monthly_rate_net]').fill('1200')
        fm.locator('button[type=submit], button.btn').first.click(); q.wait_for_timeout(800)
        check(len(dialogs) == 1 and RETRO[lang] in dialogs[0], f'{lang}/{w}: Rückfrage rückwirkende Rate ({dialogs[:1]})')
        rate = api('GET', f'/api/vehicles/{VID}')['d']
        cts = rate.get('contracts') or []
        check(any(x.get('monthly_rate_net') == 1000 for x in cts), f'{lang}/{w}: Abbrechen lässt Rate unverändert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahresabschluss-vertrag-{lang}-{w}.png', full_page=False)
        answer['ok'] = True
        fm.locator('button[type=submit], button.btn').first.click(); q.wait_for_timeout(1500)
        cts = api('GET', f'/api/vehicles/{VID}')['d'].get('contracts') or []
        check(any(x.get('monthly_rate_net') == 1200 for x in cts), f'{lang}/{w}: OK speichert die neue Rate')
        check(q.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{lang}/{w}: Akte ohne Querscrollen')
        # (3) Arbeitszeit im Vormonat als Werkstatt
        import datetime
        first = datetime.date.today().replace(day=1); pmd = (first - datetime.timedelta(days=1)).replace(day=5).isoformat()
        wctx = br.new_context(viewport={'width': w, 'height': 1000}); wq = wctx.new_page(); wd = []; wans = {'ok': False}
        wq.on('pageerror', lambda e: errs.append(str(e)))
        def on_wd(d):
            wd.append(d.message); (d.accept() if wans['ok'] else d.dismiss())
        wq.on('dialog', on_wd)
        wq.goto(B); wq.evaluate(JS, ['POST', '/api/login', {'username': f'ja.ws{pid}', 'password': PW}]); wq.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); wq.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        wq.goto(B + '/#/cases/' + cid); wq.reload(); wq.wait_for_selector('[data-act=record_work]', timeout=15000)
        wq.click('[data-act=record_work]'); wq.wait_for_selector('#af')
        wq.fill('#af [name=hours]', '1,5'); wq.fill('#af [name=description]', 'Nachtrag Vormonat'); wq.fill('#af [name=work_date]', pmd)
        wq.click('#af button.btn'); wq.wait_for_timeout(800)
        check(len(wd) == 1 and PAST[lang] in wd[0], f'{lang}/{w}: Rückfrage Arbeitsdatum im Vormonat ({wd[:1]})')
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 0, f'{lang}/{w}: Abbrechen bucht nicht')
        wans['ok'] = True; wq.click('#af button.btn'); wq.wait_for_timeout(1500)
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 1, f'{lang}/{w}: OK bucht')
        wctx.close()
        q.goto(B + '/#/costs'); q.wait_for_selector('#cr', timeout=15000); q.wait_for_timeout(500)
        q.evaluate("document.querySelectorAll('.print-summary details').forEach(d => d.open = true)")
        lt = q.evaluate("[...document.querySelectorAll('[data-clate]')].map(x => x.innerText)")
        check(any(LATE[lang] in x for x in lt), f'{lang}/{w}: Kostenbericht kennzeichnet nachträglich erfasste Arbeitszeit ({lt[:2]})')
        check(q.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{lang}/{w}: Kostenbericht ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/jahresabschluss-bericht-{lang}-{w}.png', full_page=True)
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
