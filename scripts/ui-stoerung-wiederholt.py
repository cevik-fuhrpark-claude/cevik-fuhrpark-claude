# [CLAUDE] UI-Test (Backlog 467, Blickwinkel „Sporadische Störung – Werkstatt findet keinen Fehler“): Auftrag „Ohne Reparatur beenden“ mit Vermerk
# „kein Fehler feststellbar“, danach erneute Meldung → „Zum Fahrzeug“ zeigt „In den 90 Tagen davor abgeschlossen“ mit Art, Beschreibung und Vermerk
# (Leitung und Werkstatt); Backlog 468: früherer Vorgang mit Status „Ohne Reparatur beendet“ und Hinweis „erneut melden“ für den Melder. DE 390 / UK 820 / EN 1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HEAD = {'de': 'In den 90 Tagen davor abgeschlossen', 'uk': 'Закрито за 90 днів до цього', 'en': 'Closed in the 90 days before'}
KIND = {'de': 'Ohne Reparatur beendet', 'uk': 'Завершено без ремонту', 'en': 'Ended without repair'}
NOTE = {'de': 'Vermerk', 'uk': 'Примітка', 'en': 'Note'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sw.inhaber', 'display_name': 'SW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'sw.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    site = api('GET', '/api/meta')['d']['workshops'][0]['code']; pid = os.getpid()
    me = api('GET', '/api/me')['d']; envn = (me.get('user') or me).get('environment') or 'production'
    u = api('POST', '/api/users', {'username': 'sw.werkstatt', 'display_name': 'SW Werkstatt', 'role': 'workshop', 'environment': envn, 'workshop_site': site})
    check(u['s'] in (200, 201), 'Werkstatt-Konto angelegt')
    wtok = u['d'].get('invite_token') if u['d'] else None
    for i, (lang, w) in enumerate([('de', 390), ('uk', 820), ('en', 1366)]):
        vin = f'WDB9634031078{i:04d}'; VID = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'SW-T {i+1}', 'vin': vin, 'site': 'Dortmund'})
        def mk(desc, k):
            return api('POST', '/api/cases', {'vehicle_id': VID, 'description': desc, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'sw-{pid}-{i}-{k}'})['d']['id']
        def cmd(cid, action, payload={}, note=None):
            v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
            return api('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': f'sw-{pid}-{cid}-{action}', 'expected_version': v, 'note': note, 'payload': payload})
        c1 = mk('Motorwarnleuchte geht ab und zu an', 'a')
        check(cmd(c1, 'approve_repair', {'workshop_site': site}, 'prüfen')['s'] == 200, f'{lang}: Auftrag')
        check(cmd(c1, 'withdraw_order', {}, 'Kein Fehler feststellbar, Fehlerspeicher leer')['s'] == 200, f'{lang}: ohne Reparatur beendet')
        c2 = mk('Motorwarnleuchte wieder an', 'b')
        check(cmd(c2, 'approve_repair', {'workshop_site': site}, 'erneut prüfen')['s'] == 200, f'{lang}: zweiter Auftrag')
        users = [('sw.inhaber', 'Leitung')]
        if i == 0 and wtok:
            ctxw = br.new_context(); pw = ctxw.new_page(); pw.goto(B); pw.evaluate(JS, ['POST', '/api/invite/accept', {'token': wtok, 'password': PW}]); ctxw.close()
        users.append(('sw.werkstatt', 'Werkstatt'))
        for un, role in users:
            ctx = br.new_context(viewport={'width': w, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
            q.goto(B + '/#/cases/' + c2); q.reload()
            try: q.wait_for_selector('[data-virecent]', timeout=15000)
            except Exception: pass
            ok = q.locator('[data-virecent]').count() == 1
            check(ok, f'{lang}/{w} {role}: Abschnitt vorhanden')
            if ok:
                txt = q.inner_text('.vinfo')
                check(HEAD[lang] in txt, f'{lang}/{w} {role}: Überschrift „{HEAD[lang]}“')
                check(KIND[lang] in txt and 'Kein Fehler feststellbar' in txt and NOTE[lang] + ':' in txt, f'{lang}/{w} {role}: Art und Vermerk')
                check(q.evaluate("()=>document.querySelector('.vinfo').open"), f'{lang}/{w} {role}: aufgeklappt')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w} {role}: ohne Querscrollen')
                if SHOTS: q.locator('.vinfo').screenshot(path=f'{SHOTS}/stoerung_wiederholt_{lang}_{w}_{role}.png')
            if role == 'Leitung':
                # Backlog 468: früherer Vorgang zeigt „Ohne Reparatur beendet“ statt „Abgelehnt“, Melder bekommt den Hinweis „erneut melden“
                q.goto(B + '/#/cases/' + c1); q.reload()
                try: q.wait_for_selector('[data-wdagain]', timeout=15000)
                except Exception: pass
                check(q.locator('[data-wdagain]').count() == 1, f'{lang}/{w}: Hinweis „erneut melden“ für den Melder')
                check(KIND[lang] in q.inner_text('.chip >> nth=0') if q.locator('.chip').count() else False, f'{lang}/{w}: Status „{KIND[lang]}“ im Vorgangskopf')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}/{w}: Vorgang ohne Querscrollen')
                if SHOTS: q.screenshot(path=f'{SHOTS}/stoerung_beendet_{lang}_{w}.png')
            check(not errs, f'{lang}/{w} {role}: keine Skriptfehler {errs[:2]}')
            ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
