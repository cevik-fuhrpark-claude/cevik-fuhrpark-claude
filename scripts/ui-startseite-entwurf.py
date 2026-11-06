# [CLAUDE] UI-Test (06.11.2026, Backlog 1068, Blickwinkel „Fahrer-Handy: Meldung halb ausgefüllt, Anruf kommt rein / App wird vom System beendet“):
#  A) Meldung angefangen (Fahrzeug, Beschreibung) → Startseite (wie nach Neustart der App mit Startadresse #/) → Hinweis „Angefangen,
#     noch nicht gesendet“ mit Kennzeichen; „Weiter ausfüllen“ → Formular mit Eingaben
#  B) zusätzlich Abfahrtskontrolle angefangen → Startseite nennt beide (neueste zuerst); Neuladen auf der Startseite → Hinweis bleibt
#  C) „Entwurf verwerfen“ auf der Startseite entfernt nur diesen Eintrag; danach leeres Meldeformular ohne „wiederhergestellt“
#  D) Abmelden + andere Person: kein Hinweis
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Nur synthetische Testkonten.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VA = 'VIN:WMA15SZZ2HM733780'; VB = 'VIN:WMA15SZZ2HM733781'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None, ct=None: a.evaluate(JS, [m, pa, b, ct])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'se.inhaber', 'display_name': 'SE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'se.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    envn = api('GET', '/api/me')['d']['user'].get('environment') or 'production'
    csv = 'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nSE-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM733780;Lkw\nSE-ZM 2;Dortmund;MAN;2017;WMA15SZZ2HM733781;Lkw'
    check(api('POST', '/api/vehicles/import', csv, 'text/csv')['s'] == 200, 'Fahrzeuge importiert')
    u = api('POST', '/api/users', {'username': 'se.leitung', 'display_name': 'SE Leitung', 'role': 'fleet', 'environment': envn})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}, None]); c0.close()
    keys = [i['key'] for i in api('GET', '/api/meta')['d']['checklist']]
    for (w, h), lang in zip([(390, 844), (820, 1180), (1366, 900)], ['de', 'uk', 'en']):
        print(f'— {w} px / {lang}')
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []
        q.on('pageerror', lambda e: errs.append(str(e))); q.on('dialog', lambda d: d.accept())
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'se.inhaber', 'password': PW}, None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        T = q.evaluate("async (l) => { const m = await import('/i18n.js'); return m.STRINGS[l]; }", lang)
        q.goto(B + '/#/'); q.wait_for_selector('h1', timeout=15000); q.wait_for_timeout(1500)  # Startseite füllt die Fahrzeugliste des Geräts
        check(q.locator('#homedrafts').count() == 0, 'ohne Entwurf kein Hinweis')
        # A) Meldung angefangen
        q.goto(B + '/#/new'); q.wait_for_selector('#f #d', timeout=15000)
        q.locator(f'input[name=veh][value="{VA}"]').check(force=True)
        q.fill('#d', f'Spiegel rechts abgefahren ({lang})'); q.wait_for_timeout(200)
        q.goto(B + '/#/'); q.wait_for_selector('#homedrafts', timeout=15000)
        box = q.inner_text('#homedrafts')
        check(T['home_drafts'] in box and T['report_damage'] in box and 'SE-ZM 1' in box, f'A: Hinweis mit Meldung und Kennzeichen ({box[:120]!r})')
        q.click('#homedrafts a[href="#/new"]'); q.wait_for_selector('#fdraft', timeout=15000)
        check(q.input_value('#d') == f'Spiegel rechts abgefahren ({lang})' and q.locator(f'input[name=veh][value="{VA}"]').is_checked(), 'A: „Weiter ausfüllen“ → Eingaben wieder da')
        # B) Abfahrtskontrolle dazu
        q.goto(B + '/#/check'); q.wait_for_selector('#f #v', timeout=15000)
        q.select_option('#v', VB); q.locator(f'input[name="{keys[0]}"][value="ok"]').check(force=True); q.wait_for_timeout(200)
        q.goto(B + '/#/'); q.wait_for_selector('#homedrafts', timeout=15000)
        n = q.locator('[data-homedraft]').count(); first = q.locator('[data-homedraft]').first.inner_text()
        check(n == 2 and T['departure_check'] in first and 'SE-ZM 2' in first, f'B: zwei Einträge, Kontrolle (neuer) zuerst ({n})')
        q.reload(); q.wait_for_selector('#homedrafts', timeout=15000)
        check(q.locator('[data-homedraft]').count() == 2, 'B: nach Neuladen weiter da')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), 'B: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/startseite-entwurf-{lang}-{w}.png')
        # C) Meldung verwerfen
        q.click('[data-homedraft="#/new"] [data-fdrop]'); q.wait_for_timeout(300)
        check(q.locator('[data-homedraft]').count() == 1 and q.locator('[data-homedraft="#/check"]').count() == 1, 'C: nur die Meldung entfernt')
        q.goto(B + '/#/new'); q.wait_for_selector('#f #d', timeout=15000); q.wait_for_timeout(300)
        check(q.input_value('#d') == '' and q.locator('#fdraft').count() == 0, 'C: Meldeformular leer')
        q.goto(B + '/#/check'); q.wait_for_selector('#fdraft', timeout=15000); q.click('#fdx'); q.wait_for_timeout(500)
        q.goto(B + '/#/'); q.wait_for_selector('h1', timeout=15000); q.wait_for_timeout(500)
        check(q.locator('#homedrafts').count() == 0, 'C: alles verworfen → kein Hinweis')
        # D) andere Person auf demselben Gerät
        q.goto(B + '/#/new'); q.wait_for_selector('#f #d', timeout=15000); q.fill('#d', 'Entwurf Person 1'); q.wait_for_timeout(200)
        q.evaluate(JS, ['POST', '/api/logout', None, None]); q.evaluate("sessionStorage.removeItem('cfp_after_login')")
        q.goto(B + '/#/login'); q.wait_for_selector('#u', timeout=15000); q.fill('#u', 'se.leitung'); q.fill('#p', PW); q.keyboard.press('Enter')
        q.wait_for_timeout(2500); q.goto(B + '/#/'); q.wait_for_selector('h1', timeout=15000); q.wait_for_timeout(800)
        check(q.locator('#homedrafts').count() == 0, 'D: andere Person sieht keinen Entwurf')
        check(not errs, f'keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
