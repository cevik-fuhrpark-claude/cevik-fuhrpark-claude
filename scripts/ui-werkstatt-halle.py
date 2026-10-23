# [CLAUDE] UI-Test (23.10.2026, Backlog 186, Teilagent „Werkstatt-Tablet in der Halle“):
# (1) Kontrolle nach Reparatur: Netzabbruch beim Senden → Meldung „nicht gesendet – Eingaben bleiben“; Seitenwechsel und zurück → alle
#     Antworten, km und Bemerkung wieder da, dieselbe Anfragekennung (kam die erste Sendung doch an, entsteht keine zweite Kontrolle).
# (2) Arbeitszeit buchen ohne Netz: Formular bleibt offen, Meldung „Nicht gespeichert …“ in der App-Sprache.
# Tablet 820 px (DE), Handy 390 px (UK), PC 1366 px (EN); kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT = {'de': 'Eingaben bleiben', 'uk': 'введені дані збережено', 'en': 'entries stay saved'}
NOTSAVED = {'de': 'Nicht gespeichert', 'uk': 'Не збережено', 'en': 'Not saved'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wh.inhaber', 'display_name': 'WH Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'wh.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    keys = [i['key'] for i in api('GET', '/api/meta')['d']['checklist']]
    vin = 'WDB96340310654411'; VID = 'VIN:' + vin; pid = os.getpid()
    api('POST', '/api/vehicles', {'plate': 'WH-WS 1', 'vin': vin, 'site': 'Dortmund'})
    u = api('POST', '/api/users', {'username': 'wh.ws', 'display_name': 'WH Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': site})
    c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for lang, w in [('de', 820), ('uk', 390), ('en', 1366)]:
        print('—', lang, w)
        cid = api('POST', '/api/cases', {'vehicle_id': VID, 'description': f'Bremse quietscht {lang}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'wh-{pid}-{lang}'})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': f'wha-{pid}-{lang}', 'expected_version': v, 'note': 'prüfen', 'payload': {'workshop_site': site}})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'wh.ws', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        # (1) Kontrolle nach Reparatur
        q.goto(B + '/#/inspect/' + cid); q.reload(); q.wait_for_selector('#f [name=rk]', state='attached', timeout=15000)
        for k in keys: q.locator(f'input[name="{k}"][value="ok"]').check(force=True)
        q.fill('#km', '234567'); q.fill('#n', 'Halle 2, Bühne 3')
        rk0 = q.evaluate("document.querySelector('#f [name=rk]').value")
        q.route('**/api/inspections', lambda r: r.abort('internetdisconnected'))
        q.click('#f button.btn'); q.wait_for_timeout(1200)
        toasts = q.evaluate("[...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ')")
        check(KEPT[lang] in toasts, f'{lang}/{w}: Meldung „nicht gesendet – Eingaben bleiben“ ({toasts})')
        q.unroute('**/api/inspections')
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('[data-act]', timeout=15000); q.goto(B + '/#/inspect/' + cid); q.wait_for_selector('#f [name=rk]', state='attached', timeout=15000); q.wait_for_timeout(300)
        st = q.evaluate("""(k) => ({ n: document.querySelectorAll('.checkitem input[type=radio]:checked').length, km: document.querySelector('#km').value, note: document.querySelector('#n').value,
          rk: document.querySelector('#f [name=rk]').value, box: !!document.querySelector('#fdraft') })""", keys)
        check(st['n'] == len(keys) and st['km'] == '234567' and st['note'] == 'Halle 2, Bühne 3' and st['box'], f'{lang}/{w}: Kontrolle nach Seitenwechsel wiederhergestellt ({st})')
        check(st['rk'] == rk0, f'{lang}/{w}: dieselbe Anfragekennung')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: Kontrolle ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wh_insp_{lang}_{w}.png')
        # (2) Arbeitszeit ohne Netz
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('[data-act=acknowledge], [data-act=record_work]', timeout=15000)
        if q.locator('[data-act=acknowledge]').count():
            q.click('[data-act=acknowledge]'); q.wait_for_timeout(300)
            if q.locator('#af button.btn').count(): q.click('#af button.btn')
            q.wait_for_selector('[data-act=record_work]', timeout=15000)
        q.click('[data-act=record_work]'); q.wait_for_selector('#af')
        q.fill('#af [name=hours]', '1,5'); q.fill('#af [name=description]', 'Bremsbeläge gewechselt')
        q.evaluate("document.querySelectorAll('.toast').forEach(e => e.remove())")
        q.route('**/commands', lambda r: r.abort('internetdisconnected'))
        q.click('#af button.btn'); q.wait_for_timeout(1200)
        toasts = q.evaluate("[...document.querySelectorAll('.toast')].map(t => t.innerText).join(' | ')")
        check(NOTSAVED[lang] in toasts and q.locator('#af').count() == 1 and q.input_value('#af [name=hours]') == '1,5', f'{lang}/{w}: Arbeitszeit ohne Netz – Formular offen, Meldung ({toasts})')
        q.unroute('**/commands')
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        check(len(api('GET', f'/api/cases/{cid}')['d']['work']) == 1, f'{lang}/{w}: mit Netz einmal gebucht')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
