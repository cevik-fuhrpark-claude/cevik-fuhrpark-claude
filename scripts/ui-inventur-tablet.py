# [CLAUDE] UI-Test (28.10.2026, Backlog 546–551, Blickwinkel „Jahresinventur am Werkstatt-Tablet“ / „neue Fuhrparkleiterin“):
# Inventurliste in derselben Reihenfolge wie die Zählliste (Lagerort, Name), Teilenummer, Lagerort-Auswahl, Buchbestand nur auf Wunsch (Blindzählung),
# Fortschritt „Gezählt: c von n“ + nicht gezählte Artikel, Rückfrage nennt sie; Hilfe „Übernahme als neue Fuhrparkleitung“.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BOOK = {'de': 'Buchbestand', 'uk': 'Обліковий залишок', 'en': 'Book stock'}
PROG = {'de': 'Gezählt: 1 von', 'uk': 'Пораховано: 1 з', 'en': 'Counted: 1 of'}
HELP = {'de': 'Übernahme als neue Fuhrparkleitung', 'uk': 'Прийняття справ', 'en': 'Taking over as new fleet manager'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'it.inhaber', 'display_name': 'IT Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'it.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber (frischer Server)')
    for un, role in [('it.werkstatt', 'workshop'), ('it.leitung', 'fleet')]:
        api('POST', '/api/login', {'username': 'it.inhaber', 'password': PW})  # Annehmen der Einladung meldet diese Seite als neue Person an
        u = api('POST', '/api/users', {'username': un, 'display_name': un.upper(), 'role': role, 'environment': 'production', **({'workshop_site': 'DORTMUND'} if role == 'workshop' else {})})
        if u['s'] in (200, 201): api('POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': 'it.werkstatt', 'password': PW})
    for name, loc, pn in [('Zündkerze', 'B1', 'ZK-1'), ('Ölfilter', 'B2', 'OF-7'), ('bremse vorn', 'A1', 'BR-3'), ('Achsmutter', None, None)]:
        api('POST', '/api/stock', {'name': name, 'location': loc, 'part_number': pn, 'initial_qty': 4})
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        dlg = []; q.on('dialog', lambda d: (dlg.append(d.message), d.dismiss()))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'it.werkstatt', 'password': PW}])
        q.goto(B + '/#/stock'); q.wait_for_selector('#inv'); q.click('#inv summary'); q.wait_for_selector('#invlist [data-inv]')
        names = q.eval_on_selector_all('#invlist [data-inv]', 'xs => xs.map((x) => x.dataset.invname)')
        check(names == ['bremse vorn (A1)', 'Zündkerze (B1)', 'Ölfilter (B2)', 'Achsmutter'], f'{lang} {w}px: 546 Reihenfolge wie Zählliste {names}')
        check('OF-7' in q.inner_text('#invlist'), f'{lang} {w}px: 546 Teilenummer')
        check(BOOK[lang] not in q.inner_text('#invlist thead'), f'{lang} {w}px: 548 Blindzählung (kein Buchbestand)')
        q.fill('[data-invname="Ölfilter (B2)"]', '3')
        q.check('#invbookshow'); q.wait_for_timeout(200)
        check(BOOK[lang] in q.inner_text('#invlist thead') and q.input_value('[data-invname="Ölfilter (B2)"]') == '3', f'{lang} {w}px: 548 Buchbestand auf Wunsch, Eingabe bleibt')
        q.select_option('#invloc', 'B2'); q.wait_for_timeout(100)
        check(q.locator('#invlist tr[data-invloc]:not([hidden])').count() == 1, f'{lang} {w}px: 546 Lagerort-Auswahl')
        q.select_option('#invloc', '*')
        q.click('#invchk'); q.wait_for_selector('[data-invprog]')
        check(PROG[lang] in q.inner_text('[data-invprog]') and '3' in q.inner_text('[data-invprog]'), f'{lang} {w}px: 547 Fortschritt ({q.inner_text("[data-invprog]")})')
        q.click('#invbook'); q.wait_for_timeout(300)
        check(len(dlg) == 1 and '3' in dlg[0].split('\n')[-1], f'{lang} {w}px: 547 Rückfrage nennt nicht gezählte Artikel')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Inventur)')
        if SHOTS: q.locator('#inv').screenshot(path=f'{SHOTS}/inventur-tablet-{lang}-{w}.png')
        q.uncheck('#invbookshow')
        check(not errs, f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        c.close()
        # Hilfe für die Fuhrparkleitung
        api('POST', '/api/login', {'username': 'it.leitung', 'password': PW}); api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'it.leitung', 'password': PW}])
        q.goto(B + '/#/help?s=handover'); q.wait_for_selector('#help-handover')
        check(HELP[lang] in q.inner_text('#help-handover') and q.locator('#help-handover li').count() == 8, f'{lang} {w}px: 551 Hilfe-Abschnitt')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen (Hilfe)')
        check(not errs, f'{lang} {w}px: Hilfe ohne Skriptfehler {errs[:1]}')
        c.close()
        api('POST', '/api/login', {'username': 'it.werkstatt', 'password': PW})
    br.close()
if fails: print('FEHLER:', len(fails)); raise SystemExit(1)
print('alle UI-Prüfungen bestanden')
