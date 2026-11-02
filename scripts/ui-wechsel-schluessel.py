# [CLAUDE] UI-Test (02.11.2026, Backlog 876, Blickwinkel „Werkstatt Bayern übernimmt einen Auftrag aus Dortmund“):
# „Werkstatt wechseln“ kündigt das Zurücksetzen von Schlüssel/Fahrzeugschein an; nach dem Wechsel zeigt der Vorgang keinen alten Stand mehr,
# der Verlauf nennt ihn. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
pdate = (datetime.datetime.now(ZoneInfo('Europe/Berlin')).date() + datetime.timedelta(days=3)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ws.inhaber', 'display_name': 'WS Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['vt.inhaber', 'ws.inhaber', 'pm.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    def cmd(cid, action, payload, note=None):
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        b = {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': v, 'payload': payload}
        if note: b['note'] = note
        return api('POST', f'/api/cases/{cid}/commands', b)['s']
    T = a.evaluate("async () => { const m = await import('/i18n.js'); return m.STRINGS; }")
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340315{pid:03d}{i + 40:03d}'; plate = f'WS-AB {pid}{i}'; V = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        c = api('POST', '/api/cases', {'vehicle_id': V, 'description': f'Kupplung rutscht (Test Werkstattwechsel {i})', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = c['d']['id']; check(cmd(cid, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Kupplung prüfen') == 200, f'{lang}: freigegeben')
        check(cmd(cid, 'set_handover', {'keys': 'da', 'papers': 'fehlt'}) == 200, f'{lang}: Schlüssel da, Schein fehlt')
        fl = f'ws.fleet{pid}{i}'
        u = api('POST', '/api/users', {'username': fl, 'display_name': fl.upper(), 'role': 'fleet', 'environment': envname, 'language': lang})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': fl, 'password': PW}])
        q.goto(B + '/#/cases/' + cid); q.wait_for_selector('button[data-act="reassign_workshop"]', timeout=15000)
        check(q.locator('#handover').count() == 1, f'{lang}: Schlüssel/Schein vor dem Wechsel sichtbar')
        q.click('button[data-act="reassign_workshop"]'); q.wait_for_selector('#actform select[name=workshop_site]', timeout=5000)
        hint = q.locator('#actform [data-rwsho]')
        check(hint.count() == 1 and T[lang]['ho_da'] in hint.inner_text() and T[lang]['ho_fehlt'] in hint.inner_text(), f'{lang}: Hinweis „wird zurückgesetzt“ mit altem Stand')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Werkstatt wechseln)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wechsel-schluessel-form-{lang}-{w}.png', full_page=True)
        q.select_option('#actform select[name=workshop_site]', 'MUENCHEN'); q.fill('#actform textarea[name=note]', 'Vertretung')
        q.click('#actform button.btn:not(.secondary)')
        q.wait_for_selector('[data-ev-horeset]', timeout=15000)
        check(q.locator('#handover').count() == 0, f'{lang}: kein alter Stand mehr im Vorgang')
        ev = q.locator('[data-ev-horeset]').inner_text()
        check(T[lang]['ho_da'] in ev and T[lang]['ho_fehlt'] in ev, f'{lang}: Verlauf nennt den alten Stand ({ev})')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Vorgang)')
        if SHOTS: q.locator('[data-ev-horeset]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wechsel-schluessel-verlauf-{lang}-{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
if fails: print('FEHLER:', len(fails)); raise SystemExit(1)
print('alle UI-Prüfungen bestanden')
