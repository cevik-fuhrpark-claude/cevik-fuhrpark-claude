# [CLAUDE] UI-Test (27.10.2026, Backlog 436, Blickwinkel „Fahrtenschreiber-Kalibrierung läuft ab“): Fahrer-Startseite „Mein Fahrzeug“ nennt
# beim Lkw ohne Tachograph-Termin „Fahrtenschreiber … Frist ungeklärt – klärt die Fuhrparkleitung“, nach Eintrag mit Termin laut
# Prüfbescheinigung das Datum; Fahrzeugakte „Termin/Regel hinzufügen“ zeigt den Hinweis nur bei Auswahl „Tachograph“.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tk.inhaber', 'display_name': 'TK Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['tk.inhaber', 'hm.inhaber', 'hs.inhaber', 'sk.inhaber', 'nf.inhaber', 'az.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    due = (datetime.date.today() + datetime.timedelta(days=500)).isoformat()
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        vin = f'WDB96340310{pid:03d}{i + 7:03d}'; VID = 'VIN:' + vin
        check(api('POST', '/api/vehicles', {'plate': f'TK-Z {pid}{i}', 'vin': vin, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Lkw')
        u = f'tk.fahrer{pid}{i}'
        r = api('POST', '/api/users', {'username': u, 'display_name': u.upper(), 'role': 'driver', 'environment': envname})
        uid = r['d'].get('id') or r['d'].get('user', {}).get('id')
        c0 = br.new_context(); p0 = c0.new_page(); p0.goto(B); p0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
        check(api('POST', f'/api/vehicles/{VID}/drivers', {'user_id': uid, 'end_previous': False})['s'] == 201, f'{lang}: zugeordnet')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS, ['POST', '/api/login', {'username': u, 'password': PW}])['s'] == 200, f'{lang}: Fahrer angemeldet')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.goto(B + '/#/'); q.reload(); q.wait_for_selector('[data-unclear]', timeout=15000); q.wait_for_timeout(300)
        T = q.evaluate(TR)
        dts = q.evaluate("() => [...document.querySelectorAll('[data-unclear]')].map((x) => x.closest('dd').previousElementSibling.textContent)")
        check(T['mk_tacho'] in [d.strip() for d in dts], f'{lang}: Fahrtenschreiber ungeklärt genannt {dts}')
        check(q.locator('[data-unclearwho]').count() == q.locator('[data-unclear]').count(), f'{lang}: wer klärt')
        check(q.evaluate(noscroll), f'{lang}: ohne Querscrollen (Fahrer)')
        if SHOTS: q.locator('[data-unclear]').last.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tacho_fahrer_{lang}_{w}.png')
        n_unclear = len(dts)
        rr = api('POST', f'/api/vehicles/{VID}/maintenance', {'kind': 'Tachograph', 'last_done_date': (datetime.date.today() - datetime.timedelta(days=200)).isoformat(), 'next_due_date': due, 'evidence': 'Prüfbescheinigung UI'})
        check(rr['s'] == 201, f'{lang}: Tachograph mit Termin eingetragen {rr["s"]}')
        q.reload(); q.wait_for_selector('[data-unclear]', timeout=15000); q.wait_for_timeout(300)
        check(q.locator('[data-unclear]').count() == n_unclear - 1, f'{lang}: nicht mehr ungeklärt')
        check(datetime.date.fromisoformat(due).strftime('%d.%m.%Y') in q.inner_text('body') or due[:4] in q.inner_text('body'), f'{lang}: Termin angezeigt')
        check(not errs, f'{lang}: ohne Skriptfehler (Fahrer) {errs[:1]}'); ctx.close()
        # Fahrzeugakte: Hinweis beim Anlegen nur bei „Tachograph“
        ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
        m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); m.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        m.goto(B + '/#/vehicles/' + VID); m.reload(); m.wait_for_selector('#mf', state='attached', timeout=15000)
        T = m.evaluate(TR)
        m.locator('#mf').locator('xpath=ancestor::details[1]/summary').click()
        hint = m.locator('#mf [data-mftacho]')
        m.locator('#mf select[name=kind]').select_option('UVV')
        check(hint.is_hidden(), f'{lang} {w}px: bei UVV kein Hinweis')
        m.locator('#mf select[name=kind]').select_option('Tachograph')
        check(hint.is_visible() and hint.inner_text().strip() == T['rule_tacho_hint'], f'{lang} {w}px: Hinweis bei Tachograph')
        check(m.locator('#mf input[name=interval_months]').input_value() == '', f'{lang} {w}px: kein Intervall vorbelegt')
        check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Akte)')
        if SHOTS: hint.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/tacho_anlegen_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler (Akte) {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
