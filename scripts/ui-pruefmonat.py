# [CLAUDE] UI-Test (28.10.2026, Backlog 504–509, Blickwinkel „Prüftermine für den nächsten Monat vorbereiten“ / „Fahrer mit Handy und Tablet“):
# Prüftermine: „bis Ende nächsten Monats“ nimmt eine Frist nach der Warnfrist auf, Zeile springt ins Formular „Durchführung erfassen“ und nach dem
# Speichern zurück in die Liste. Abfahrtskontrolle: Hinweis „heute bereits erfasst“ für die eigene Kontrolle (zweites Gerät).
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, datetime
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
today = datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
nm = (today.replace(day=1) + datetime.timedelta(days=62)).replace(day=1) - datetime.timedelta(days=1)  # Ende des nächsten Monats
due = nm.isoformat(); after_warn = (nm - today).days > 30  # liegt die Frist hinter der Warnfrist (30 Tage), fehlt sie ohne „fällig bis“
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pm.inhaber', 'display_name': 'PM Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['pm.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    def mkuser(un, role, lang):
        u = api('POST', '/api/users', {'username': un, 'display_name': un.upper(), 'role': role, 'environment': envname, 'language': lang})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        return u['d'].get('id') or u['d'].get('user', {}).get('id')
    keys = [i['key'] for i in api('GET', '/api/meta')['d']['checklist']]
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340313{pid:03d}{i + 20:03d}'; plate = f'PM-AB {pid}{i}'; V = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        r = api('POST', f'/api/vehicles/{V}/maintenance', {'kind': 'UVV', 'next_due_date': due, 'evidence': f'UVV-Protokoll PM {i}'})
        check(r['s'] == 201, f'{lang}: UVV-Termin {due}')
        fl = f'pm.fleet{pid}{i}'; mkuser(fl, 'fleet', lang)
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS, ['POST', '/api/login', {'username': fl, 'password': PW}])['s'] == 200, f'{lang}: Leitung angemeldet')
        q.goto(B + '/#/maintenance'); q.wait_for_selector('#mduenext', timeout=15000)
        row = f'#app .list a.row:has-text("{plate}")'
        if after_warn: check(q.locator(row).count() == 0, f'{lang}: ohne „fällig bis“ nicht in „überfällig + bald fällig“')
        q.click('#mduenext'); q.wait_for_selector('[data-mdueby]', timeout=10000)
        check(q.locator(row).count() == 1, f'{lang}: mit „bis Ende nächsten Monats“ in der Liste')
        href = q.locator(row).first.get_attribute('href') or ''
        check('?done=' in href, f'{lang}: Zeile springt ins Formular ({href})')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Prüftermine)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/pruefmonat-liste-{lang}-{w}.png', full_page=True)
        q.locator(row).first.click(); q.wait_for_selector('form[data-mdone]:not([hidden])', timeout=15000)
        fm = q.locator('form[data-mdone]:not([hidden])').first
        fm.locator('input[name=evidence]').fill(f'UVV-Protokoll erledigt {i}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/pruefmonat-formular-{lang}-{w}.png')
        fm.locator('button.btn').click()
        q.wait_for_function("() => location.hash === '#/maintenance'", timeout=15000)
        q.wait_for_selector('#mduenext', timeout=15000)
        check(True, f'{lang}: nach dem Speichern zurück in den Prüfterminen')
        check(not errs, f'{lang}: Leitung ohne Skriptfehler {errs[:1]}')
        ctx.close()
        # Fahrer: eigene Kontrolle auf „Gerät 1“ (API), Hinweis auf „Gerät 2“
        dr = f'pm.fahrer{pid}{i}'; uid = mkuser(dr, 'driver', lang)
        api('POST', f'/api/vehicles/{V}/drivers', {'user_id': uid, 'end_previous': False})
        c1 = br.new_context(); g1 = c1.new_page(); g1.goto(B); g1.evaluate(JS, ['POST', '/api/login', {'username': dr, 'password': PW}])
        check(g1.evaluate(JS, ['POST', '/api/inspections', {'kind': 'abfahrt', 'vehicle_id': V, 'request_key': f'pm-{pid}-{i}', 'items': [{'key': x, 'result': 'ok'} for x in keys]}])['s'] == 201, f'{lang}: Kontrolle auf Gerät 1')
        c1.close()
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': dr, 'password': PW}])
        q.goto(B + f'/#/check/{V}')
        try: q.wait_for_selector('[data-dctoday]', timeout=15000); ok = True
        except Exception: ok = False
        check(ok, f'{lang}: Abfahrtskontrolle zeigt „heute bereits erfasst“')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Abfahrtskontrolle)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/pruefmonat-kontrolle-{lang}-{w}.png')
        check(not errs, f'{lang}: Fahrer ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
if fails: print('FEHLER:', len(fails)); raise SystemExit(1)
print('alle UI-Prüfungen bestanden')
