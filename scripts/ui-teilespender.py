# [CLAUDE] UI-Test (Backlog 469–471, Blickwinkel „Teil aus einem ruhenden Lkw in einen anderen umbauen“): Hinweis „Ausbau aus <Kennzeichen>“ am
# Lieferant-Feld des Teils (Werkstatt), Teile-Verwendung findet den Einbau über das Spender-Kennzeichen ohne Leerzeichen; Rückruf-Schritt wählt den
# ruhenden Spender nicht vor. DE 390 / UK 820 / EN 1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tsp.inhaber', 'display_name': 'TSP Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'tsp.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']; pid = os.getpid()
    me = api('GET', '/api/me')['d']; envn = (me.get('user') or me).get('environment') or 'production'
    for i, (lang, w) in enumerate([('de', 390), ('uk', 820), ('en', 1366)]):
        un = f'tsp.ws{pid % 1000}.{i}'
        u = api('POST', '/api/users', {'username': un, 'display_name': f'TSP Werkstatt {i}', 'role': 'workshop', 'environment': envn, 'workshop_site': site})
        check(u['s'] in (200, 201), f'{lang}: Werkstatt-Konto')
        dv = f'WDB9634031079{i:04d}'; rv = f'WDB9634031080{i:04d}'; dpl = f'TS-D {i+1}'
        api('POST', '/api/vehicles', {'plate': dpl, 'vin': dv, 'site': 'Dortmund'}); api('POST', '/api/vehicles', {'plate': f'TS-R {i+1}', 'vin': rv, 'site': 'Dortmund'})
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + rv, 'description': 'Anlasser defekt', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'tsp-{pid}-{i}'})['d']['id']
        def cmd(f, action, payload={}, note=None):
            v = f('GET', f'/api/cases/{cid}')['d']['case']['version']
            return f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'tsp-{pid}-{i}-{action}', 'expected_version': v, 'note': note, 'payload': payload})
        check(cmd(api, 'approve_repair', {'workshop_site': site}, 'Anlasser')['s'] == 200, f'{lang}: Auftrag')
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        wapi = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        check(cmd(wapi, 'start_repair')['s'] == 200, f'{lang}: Reparatur begonnen')
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=add_part]', timeout=15000); T = q.evaluate(TR)
        q.click('[data-act=add_part]'); q.wait_for_selector('[data-psuphint]', timeout=5000)
        check(q.inner_text('[data-psuphint]').strip() == T['part_supplier_hint'], f'{lang}/{w}: Hinweis am Lieferant-Feld')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: Formular ohne Querscrollen')
        if SHOTS: q.locator('#actform').screenshot(path=f'{SHOTS}/teilespender_teil_{lang}_{w}.png')
        q.fill('#af [name=name]', 'Anlasser'); q.fill('#af [name=supplier]', f'Ausbau aus {dpl}'); q.click('#af button.btn'); q.wait_for_timeout(1500)
        parts = api('GET', f'/api/cases/{cid}')['d']['parts']
        check(any(x['supplier'] == f'Ausbau aus {dpl}' and x['unit_price_net'] is None for x in parts), f'{lang}/{w}: Teil ohne Preis mit Herkunft gebucht')
        ctx.close()
        # Leitung: Spender ruhend → Teile-Verwendung über Spender-Kennzeichen ohne Leerzeichen, Rückruf-Schritt nicht vorgewählt
        api('POST', f'/api/vehicles/VIN:{rv}/evaluation', {'excluded': True, 'reason': 'Test Teilespender'})
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs2 = []; q.on('pageerror', lambda e: errs2.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'tsp.inhaber', 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.evaluate("sessionStorage.removeItem('cfp_pu_q')")
        q.goto(B + '/#/stock'); q.wait_for_selector('#spu', timeout=15000); q.click('#spu'); q.wait_for_selector('#puq', timeout=10000)
        q.fill('#puq', dpl.replace(' ', '').replace('-', '')); q.click('#puf button.btn:not(.secondary)')
        try: q.wait_for_selector(f'#putab a[href="#/cases/{cid}"]', timeout=10000)
        except Exception: pass
        check(q.locator(f'#putab a[href="#/cases/{cid}"]').count() == 1, f'{lang}/{w}: Teile-Verwendung findet den Einbau über das Spender-Kennzeichen')
        if q.locator('#purc summary').count():
            q.click('#purc summary'); q.wait_for_selector('#purcpick', timeout=5000)
            check(q.locator('#purcpick input[data-purcdorm]:checked').count() == 0 and q.locator('#purcpick input[data-purcdorm]').count() == 1, f'{lang}/{w}: ruhendes Fahrzeug nicht vorgewählt')
            check(q.evaluate(TR)['ptu_rc_dormant_hint'] in q.inner_text('#purcpick'), f'{lang}/{w}: Hinweis „nicht vorgewählt“')
            if SHOTS: q.locator('#purc').screenshot(path=f'{SHOTS}/teilespender_rueckruf_{lang}_{w}.png')
        else: check(False, f'{lang}/{w}: Rückruf-Bereich fehlt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: Teile-Verwendung ohne Querscrollen')
        check(not errs and not errs2, f'{lang}/{w}: keine Skriptfehler {(errs + errs2)[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
