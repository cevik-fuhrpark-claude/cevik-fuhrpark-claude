# [CLAUDE] UI-Test (28.10.2026, Backlog 536–545, Blickwinkel „Reifenplatzer nachts auf der Autobahn“ / „UVV/Tachograph des Folgejahres planen“):
# kritische Meldung mit langsamem Foto-Upload zeigt das Notfall-Panel sofort (Foto-Stand darin), Vorgangsliste mit „nicht fahrbereit“ + Ort,
# Vorgang mit „Ort laut Meldung“ ≠ „Standort des Fahrzeugs“; Prüftermine mit Auswahl „Prüfart“, „bis Ende nächsten Jahres“, Anhänger-Chip.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, time, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
today = datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'np.inhaber', 'display_name': 'NP Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['np.inhaber', 'lh.inhaber', 'vt.inhaber', 'pm.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']
    pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340315{pid:03d}{i + 40:03d}'; plate = f'NP-AB {pid}{i}'; V = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        tv = f'WDB96340316{pid:03d}{i + 40:03d}'
        api('POST', '/api/vehicles', {'vin': tv, 'plate': f'NP-AH {pid}{i}', 'site': 'Dortmund', 'kind': 'anhaenger'})
        api('POST', f'/api/vehicles/VIN:{tv}/maintenance', {'kind': 'UVV', 'next_due_date': (today + datetime.timedelta(days=200)).isoformat(), 'evidence': 'Beleg UVV Anhänger'})
        api('POST', f'/api/vehicles/{V}/maintenance', {'kind': 'Tachograph', 'next_due_date': (today + datetime.timedelta(days=220)).isoformat(), 'evidence': 'Beleg Tacho'})
        fl = f'np.fleet{pid}{i}'
        u = api('POST', '/api/users', {'username': fl, 'display_name': fl.upper(), 'role': 'fleet', 'environment': envname, 'language': lang})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': fl, 'password': PW}])
        # Foto-Upload hängt 6 s (schwaches Netz)
        # (im Browser verzögert – ein blockierender Route-Handler hielte auch die Prüfungen des Skripts an)
        q.add_init_script("(() => { const f = window.fetch; window.fetch = (u, o) => (String(u).includes('/files') && o && o.method === 'POST' ? new Promise((r) => setTimeout(r, 6000)).then(() => f(u, o)) : f(u, o)); })()")
        q.goto(B + '/#/new'); q.reload(); q.wait_for_selector('#ph', state='attached')
        q.check(f'input[name=veh][value="{V}"]', force=True)
        q.fill('#d', f'Reifenplatzer vorne links (Test {i})'); q.check('input[name=prio][value=kritisch]', force=True); q.check('input[name=drv][value=nicht_fahrbereit]', force=True)
        q.fill('#l', 'A2 km 312 Richtung Hannover')
        q.set_input_files('#ph', [{'name': 'p.png', 'mimeType': 'image/png', 'buffer': PNG}])
        t0 = time.time(); q.click('#sb'); q.wait_for_selector('[data-sentcritical]', timeout=5000); dt = time.time() - t0
        check(dt < 4 and q.locator('[data-sentcritical] [data-callbox]').count() == 1, f'{lang}: 540 Notfall-Panel vor dem Foto-Upload ({dt:.1f} s)')
        check(q.locator('[data-phstate]').count() == 1, f'{lang}: 540 Foto-Stand im Panel')
        if SHOTS: q.screenshot(path=f'{SHOTS}/nachtpanne-panel-{lang}-{w}.png')
        q.wait_for_function("() => { const e = document.querySelector('[data-phstate]'); return e && e.textContent.includes('✓'); }", timeout=20000)
        check('✓' in q.inner_text('[data-phstate]'), f'{lang}: 540 Foto-Stand „übertragen“')
        q.goto(B + '/#/cases'); q.wait_for_selector(f'#app a.row:has-text("{plate}")', timeout=15000)
        row = q.locator(f'#app a.row:has-text("{plate}")').first
        check(row.locator('[data-notdrv]').count() == 1 and 'A2 km 312' in row.inner_text(), f'{lang}: 537 Liste mit „nicht fahrbereit“ und Ort')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Vorgänge)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/nachtpanne-liste-{lang}-{w}.png')
        q.goto(B + '/#/maintenance'); q.wait_for_selector('#mdueyear', timeout=15000)
        q.click('#mdueyear'); q.wait_for_selector('[data-mdueby]', timeout=5000)
        check(q.input_value('#mdueby') == f'{today.year + 1}-12-31', f'{lang}: 545 „bis Ende nächsten Jahres“')
        q.select_option('#mkind', 'UVV'); q.wait_for_timeout(800)
        titles = q.locator('#app .list a.row .title').all_inner_texts()
        check(len(titles) >= 1 and q.locator('#app .list a.row .chip').count() >= 1, f'{lang}: 541 nur UVV, Anhänger-Chip ({len(titles)} Zeilen)')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Prüftermine)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/nachtpanne-prueftermine-{lang}-{w}.png', full_page=True)
        check(not errs, f'{lang}: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
if fails: print('FEHLER:', len(fails)); raise SystemExit(1)
print('alle UI-Prüfungen bestanden')
