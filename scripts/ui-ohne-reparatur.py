# [CLAUDE] UI-Test (Backlog 211, Teilagent „Totalschaden“): Leitung beendet einen Werkstattauftrag „Ohne Reparatur beenden“ –
# Knopf sichtbar, Hinweis und Restarbeiten-Zahl im Formular, Grund Pflicht, danach Status „abgelehnt“ und Eintrag im Verlauf;
# anschließend Fahrzeug außer Betrieb nehmen möglich. DE 390 / UK 820 / EN 1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN = {'de': 'Ohne Reparatur beenden', 'uk': 'Завершити без ремонту', 'en': 'End without repair'}
LEFT = {'de': 'Offene Restarbeiten bleiben unerledigt: 1', 'uk': 'Незавершені залишкові роботи залишаються: 1', 'en': 'Open remaining tasks stay unfinished: 1'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'or.inhaber', 'display_name': 'OR Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'or.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']; pid = os.getpid()
    for i, (lang, w) in enumerate([('de', 390), ('uk', 820), ('en', 1366)]):
        vin = f'WDB9634031077{i:04d}'; VID = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'OR-T {i+1}', 'vin': vin, 'site': 'Dortmund'})
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': 'Unfall Front', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'or-{pid}-{i}'})['d']['id']
        def cmd(action, payload={}, note=None):
            v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
            return api('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'or-{pid}-{i}-{action}', 'expected_version': v, 'note': note, 'payload': payload})
        check(cmd('approve_repair', {'workshop_site': site}, 'begutachten')['s'] == 200, f'{lang}: Auftrag freigegeben')
        check(cmd('add_open_item', {'description': 'Lackierung', 'safety_relevant': False})['s'] == 200, f'{lang}: Restarbeit')
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'or.inhaber', 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=withdraw_order]', timeout=15000)
        check(q.locator('[data-act=withdraw_order]').inner_text().strip() == BTN[lang], f'{lang}/{w}: Knopf „{BTN[lang]}“')
        q.click('[data-act=withdraw_order]'); q.wait_for_selector('#wdhint')
        check(LEFT[lang] in q.inner_text('#actform'), f'{lang}/{w}: Restarbeiten-Hinweis')
        check(q.locator('#af [name=note][required]').count() == 1, f'{lang}/{w}: Grund Pflicht')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#actform').screenshot(path=f'{SHOTS}/ohne_reparatur_{lang}_{w}.png')
        q.fill('#af [name=note]', 'Totalschaden laut Gutachten'); q.click('#af button.btn'); q.wait_for_timeout(1500)
        d = api('GET', f'/api/cases/{cid}')['d']
        check(d['case']['status'] == 'abgelehnt', f'{lang}/{w}: Status abgelehnt ({d["case"]["status"]})')
        check(any(e['action'] == 'withdraw_order' for e in d['events']), f'{lang}/{w}: Verlauf')
        check(BTN[lang] in q.inner_text('body'), f'{lang}/{w}: Verlauf zeigt die Aktion')
        r = api('POST', f'/api/vehicles/{VID}/active', {'active': False, 'reason': 'Totalschaden'})
        check(r['s'] == 200, f'{lang}/{w}: außer Betrieb nehmen möglich ({r["s"]})')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
