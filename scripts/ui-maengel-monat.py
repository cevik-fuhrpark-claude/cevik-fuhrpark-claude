# [CLAUDE] UI-Test (07.11.2026, Backlog 1128, Blickwinkel „Fuhrparkleitung bespricht in der Monatsrunde die Mängel des Vormonats“):
#  Mängelstatistik: Zeitraum wahlweise gleitend (30–365 Tage) oder Kalendermonat (laufender + 12 vorherige). Prüft Auswahl, Abfrage `month=`,
#  Druckkopf mit Monatsname und Zeitraum, Rückweg zu „90 Tage“, DE/UK/EN 390/820/1366 px ohne Überstand; Screenshots mit CFP_SHOTS.
#  Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'pa.inhaber', 'display_name': 'PA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['mm.inhaber', 'ra.inhaber', 'bg.inhaber', 'pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper()
    un = f'mm.fl.{tag.lower()}'
    u = api('POST', '/api/users', {'username': un, 'display_name': 'MM Fuhrparkleitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    for who, lang, (vw, vh), cal in [(owner, 'de', (1366, 900), 'Kalendermonat'), (un, 'uk', (390, 844), 'Календарний місяць'), (un, 'en', (820, 1180), 'Calendar month')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        reqs = []; q.on('request', lambda r: reqs.append(r.url) if '/api/reports/defects' in r.url else None)
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/defects'); q.reload(); q.wait_for_selector('#dd', timeout=15000); q.wait_for_timeout(500)
        groups = q.evaluate("() => [...document.querySelectorAll('#dd optgroup')].map((g) => [g.label, g.children.length])")
        check(len(groups) == 2 and groups[1][0] == cal and groups[1][1] == 13 and groups[0][1] == 4, f'{lang}: Auswahl gleitend (4) + Kalendermonat (13): {groups}')
        prev = q.evaluate("() => document.querySelectorAll('#dd optgroup')[1].children[1].value")
        q.select_option('#dd', prev); q.wait_for_timeout(1200)
        check(any('month=' + prev[2:] in x for x in reqs), f'{lang}: Abfrage mit month={prev[2:]}')
        check(q.input_value('#dd') == prev, f'{lang}: Vormonat bleibt gewählt')
        q.emulate_media(media='print'); pr = q.inner_text('#main .print-only'); q.emulate_media(media='screen')
        mname = q.evaluate("() => document.querySelector('#dd option:checked').textContent.trim()")
        check(mname.split(' ')[0].lower() in pr.lower() and ('(01.' in pr or '(01/' in pr), f'{lang}: Druckkopf nennt Monat und Zeitraum: „{pr[:90]}“')
        m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/maengel-monat-{vw}-{lang}.png')
        q.select_option('#dd', '90'); q.wait_for_timeout(1200)
        check(reqs and 'days=90' in reqs[-1] and 'month=' not in reqs[-1], f'{lang}: zurück auf 90 Tage gleitend')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
