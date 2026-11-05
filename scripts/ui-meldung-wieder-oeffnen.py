# [CLAUDE] UI-Test (Backlog 1023, Blickwinkel „Leitung lehnt eine Meldung versehentlich ab bzw. der Fahrer widerspricht“): abgelehnte
# Meldung (als Dublette) – Knopf „Wieder öffnen“, Hinweis inkl. Dublette-Satz, Grund Pflicht; danach Status „Gemeldet“, „Reparatur
# freigeben“ wieder da, Verlauf zeigt „Meldung wieder geöffnet“. Backlog 1024: meldende Disposition sieht an ihrer abgelehnten Meldung
# den Grund und den Widerspruchsweg (Kasten #rejbox). DE 390 / UK 820 / EN 1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
JS_ENV = """async ([m, path, body, env]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1', 'x-cfp-env': env }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN = {'de': 'Wieder öffnen', 'uk': 'Відкрити знову', 'en': 'Reopen'}
HEV = {'de': 'Meldung wieder geöffnet', 'uk': 'Повідомлення знову відкрито', 'en': 'Report reopened'}
DUP = {'de': 'Die Zuordnung als Dublette endet', 'uk': 'Позначка дубліката знімається', 'en': 'The duplicate link ends'}
APP = {'de': 'Reparatur freigeben', 'uk': 'Дозволити ремонт', 'en': 'Approve repair'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'reo.inhaber', 'display_name': 'REO Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    user = 'reo.inhaber'
    if True:
        check(api('POST', '/api/login', {'username': user, 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
        pid = os.getpid()
        for i, (lang, w) in enumerate([('de', 390), ('uk', 820), ('en', 1366)]):
            vin = f'WDB9634031088{i:04d}'; VID = 'VIN:' + vin
            api('POST', '/api/vehicles', {'plate': f'REO {i+1}', 'vin': vin, 'site': 'Dortmund'})
            mk = lambda k, txt: api('POST', '/api/cases', {'vehicle_id': VID, 'description': txt, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'reo-{pid}-{i}-{k}'})['d']['id']
            orig = mk('a', 'Spiegel rechts gebrochen'); cid = mk('b', 'Rücklicht links defekt')
            def cmd(action, payload={}, note=None):
                v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
                return api('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'reo-{pid}-{i}-{action}', 'expected_version': v, 'note': note, 'payload': payload})
            check(cmd('reject', {'duplicate_of': orig})['s'] == 200, f'{lang}: als Dublette abgelehnt')
            api('PATCH', '/api/me', {'language': lang})
            ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
            q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('[data-act=reopen]', timeout=15000)
            check(q.locator('[data-act=reopen]').inner_text().strip() == BTN[lang], f'{lang}/{w}: Knopf „{BTN[lang]}“')
            q.click('[data-act=reopen]'); q.wait_for_selector('#reohint')
            check(DUP[lang] in q.inner_text('#reohint'), f'{lang}/{w}: Hinweis nennt das Ende der Dublette')
            check(q.locator('#af [name=note][required]').count() == 1, f'{lang}/{w}: Grund Pflicht')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: ohne Querscrollen')
            if SHOTS: q.locator('#actform').screenshot(path=f'{SHOTS}/wieder_oeffnen_{lang}_{w}.png')
            q.fill('#af [name=note]', 'anderer Schaden laut Fahrer'); q.click('#af button.btn'); q.wait_for_timeout(1500)
            d = api('GET', f'/api/cases/{cid}')['d']
            check(d['case']['status'] == 'gemeldet' and d['case']['duplicate_of'] is None, f'{lang}/{w}: wieder gemeldet, keine Dublette ({d["case"]["status"]})')
            q.wait_for_selector('[data-act=approve_repair]', timeout=10000)
            check(q.locator('[data-act=approve_repair]').inner_text().strip() == APP[lang], f'{lang}/{w}: „{APP[lang]}“ wieder möglich')
            check(HEV[lang] in q.inner_text('ol.timeline'), f'{lang}/{w}: Verlauf zeigt „{HEV[lang]}“')
            check(q.locator('[data-act=reopen]').count() == 0, f'{lang}/{w}: Knopf verschwunden')
            if SHOTS: q.screenshot(path=f'{SHOTS}/wieder_oeffnen_seite_{lang}_{w}.png', full_page=False)
            check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
            ctx.close()
        # Backlog 1024: Melder (Disposition) sieht Grund + Widerspruchsweg
        env = api('GET', '/api/me')['d'].get('environment') or 'test'
        u = api('POST', '/api/users', {'username': 'reo.dispo', 'display_name': 'REO Dispo', 'role': 'dispatch', 'environment': env})
        check(u['s'] in (200, 201), f'Dispo-Konto angelegt ({u["s"]})')
        REJ = {'de': 'Ihre Meldung wurde abgelehnt', 'uk': 'Ваше повідомлення відхилено', 'en': 'Your report was rejected'}
        for i, (lang, w) in enumerate([('de', 390), ('uk', 820), ('en', 1366)]):
            ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); qa = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
            if i == 0: qa('POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW})
            check(qa('POST', '/api/login', {'username': 'reo.dispo', 'password': PW})['s'] == 200, f'{lang}: Anmeldung Dispo')
            qa('PATCH', '/api/me', {'language': lang}); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
            r = qa('POST', '/api/cases', {'vehicle_id': f'VIN:WDB9634031088{i:04d}', 'description': 'Delle Tür rechts', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': f'reo-d-{pid}-{i}'})
            check(r['s'] in (200, 201), f'{lang}: Dispo meldet ({r["s"]})'); did = r['d']['id']
            # Inhaber arbeitet in der Testumgebung des Dispo-Kontos (Kopfzeile x-cfp-env wie die Umgebungsauswahl der App)
            te = lambda m, pa, b=None: a.evaluate(JS_ENV, [m, pa, b, env])
            v = te('GET', f'/api/cases/{did}')['d']['case']['version']
            check(te('POST', f'/api/cases/{did}/commands', {'action': 'reject', 'command_id': f'reo-d-{pid}-{i}', 'expected_version': v, 'note': 'Vorschaden laut Übergabe', 'payload': {}})['s'] == 200, f'{lang}: Leitung lehnt ab')
            q.goto(B + '/#/cases/' + did); q.reload(); q.wait_for_selector('#rejbox', timeout=15000)
            tx = q.inner_text('#rejbox')
            check(REJ[lang] in tx and 'Vorschaden laut Übergabe' in tx, f'{lang}/{w}: Kasten mit Grund')
            check(q.locator('#ct').count() == 1, f'{lang}/{w}: Kommentarfeld vorhanden')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: ohne Querscrollen')
            if SHOTS: q.screenshot(path=f'{SHOTS}/abgelehnt_melder_{lang}_{w}.png')
            check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
            ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
