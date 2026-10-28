# [CLAUDE] UI-Test (28.10.2026, Backlog 562, Blickwinkel „Jahresinventur – zwei Personen zählen“): ein Artikel wurde heute schon gezählt
# und gebucht; „Abweichungen prüfen“ zeigt den Hinweis „heute schon gezählt um …“ mit Menge, Buchen bleibt möglich.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
AT = {'de': 'heute schon gezählt um', 'uk': 'сьогодні вже пораховано о', 'en': 'already counted today at'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hg.inhaber', 'display_name': 'HG Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'hg.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber (frischer Server)')
    u = api('POST', '/api/users', {'username': 'hg.werkstatt', 'display_name': 'HG WERKSTATT', 'role': 'workshop', 'environment': 'production', 'workshop_site': 'DORTMUND'})
    api('POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': 'hg.werkstatt', 'password': PW})
    ids = {}
    for name, pn in [('Ölfilter mit sehr langer Bezeichnung für Sattelzugmaschinen', 'OF-562-LANG-0001'), ('Luftfilter', 'LF-1')]:
        r = api('POST', '/api/stock', {'name': name, 'part_number': pn, 'initial_qty': 4}); ids[name] = r['d'].get('id') or r['d']['item']['id']
    oel = 'Ölfilter mit sehr langer Bezeichnung für Sattelzugmaschinen'
    check(api('POST', '/api/stock/inventory', {'site': 'DORTMUND', 'counts': [{'item_id': ids[oel], 'counted': 4}]})['s'] == 200, 'erste Zählung gebucht')
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'hg.werkstatt', 'password': PW}])
        q.goto(B + '/#/stock'); q.wait_for_selector('#inv'); q.click('#inv summary'); q.wait_for_selector('#invlist [data-inv]')
        q.fill(f'[data-inv="{ids[oel]}"]', '5'); q.fill(f'[data-inv="{ids["Luftfilter"]}"]', '4')
        q.click('#invchk'); q.wait_for_selector('[data-invtoday]', timeout=10000)
        txt = q.inner_text('[data-invtoday]')
        check(AT[lang] in txt and 'OF-562-LANG-0001' in txt and 'Luftfilter' not in txt, f'{lang} {w}px: Hinweis nur für den heute gezählten Artikel')
        check(not q.locator('#invbook').is_disabled(), f'{lang} {w}px: Buchen bleibt möglich')
        check(q.evaluate(noscroll), f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('#inv').screenshot(path=f'{SHOTS}/inventur-heute-{lang}-{w}.png')
        check(not errs, f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
