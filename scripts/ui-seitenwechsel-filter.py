# [CLAUDE] UI-Test (09.11.2026, Backlog 1236, Folge aus 1235, Blickwinkel „Leitung ändert einen Filter/lädt neu und tippt sofort auf eine
# andere Seite“): Startseite („Neu laden“), Vorgangsliste („Neu laden“), Master („Agent jetzt prüfen“) und Kennzahlen (Zeitraum anzeigen)
# überschrieben bei langsamer Antwort die inzwischen geöffnete Seite. Jetzt bleibt die neue Seite stehen; ohne Seitenwechsel baut die
# Ansicht wie bisher neu auf. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard
# Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Nur Antworten auf GET-Anfragen, deren Adresse window.cfpSlowRx trifft, verzögern (die danach geöffnete Seite lädt normal schnell)
SLOW = """(rx) => { window.cfpSlowRx = new RegExp(rx); if (window.cfpSlow) return; window.cfpSlow = true; const f = window.fetch;
  window.fetch = async (u, o) => { const r = await f(u, o); if ((!o || !o.method || o.method === 'GET') && window.cfpSlowRx && window.cfpSlowRx.test(String(u))) await new Promise((x) => setTimeout(x, 1500)); return r; }; }"""
noscroll = 'document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sf.inhaber', 'display_name': 'SF Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['sf.inhaber', 'sw.inhaber', 'bs.inhaber', 'is.inhaber', 'wn.inhaber', 'tl.inhaber', 'we.inhaber', 'rp.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        print('—', lang, w)
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        def away(click, rx, target, gone):
            q.evaluate(SLOW, rx); q.click(click); q.wait_for_timeout(150); q.evaluate("location.hash = %r" % target); q.wait_for_timeout(2400)
            return q.evaluate('location.hash') == target and q.locator(gone).count() == 0
        # 1) Startseite „Neu laden“ → sofort „Lager“
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector('#homereload')
        check(away('#homereload', r'/api/dashboard', '#/stock', '#homeasof') and q.locator('#q').count() > 0, f'{lang}: Startseite neu laden, sofort „Lager“ → Lagerliste bleibt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/seitenwechsel-filter-{lang}-{w}-lager.png', full_page=False)
        # 2) Vorgangsliste „Neu laden“ → sofort „Fahrzeuge“
        q.evaluate("window.cfpSlowRx = null; location.hash = '#/cases'"); q.wait_for_selector('#casesreload')
        check(away('#casesreload', r'/api/cases\?', '#/vehicles', '#casesasof'), f'{lang}: Vorgangsliste neu laden, sofort „Fahrzeuge“ → Fahrzeugliste bleibt')
        # ohne Seitenwechsel: Liste baut neu auf
        q.evaluate("window.cfpSlowRx = null; location.hash = '#/cases'"); q.wait_for_selector('#casesreload')
        q.evaluate("document.querySelector('#casesasof').dataset.alt = '1'"); q.click('#casesreload')
        q.wait_for_function("() => document.querySelector('#casesasof') && !document.querySelector('#casesasof').dataset.alt", timeout=8000)
        check(q.evaluate('location.hash').startswith('#/cases'), f'{lang}: ohne Seitenwechsel Vorgangsliste neu aufgebaut')
        # 3) Master „Agent jetzt prüfen“ → sofort „Lager“
        q.evaluate("location.hash = '#/master'"); q.wait_for_selector('#ra')
        check(away('#ra', r'/api/master$', '#/stock', '#ra') and q.locator('#q').count() > 0, f'{lang}: Master – Agent prüfen, sofort „Lager“ → Lagerliste bleibt')
        q.evaluate("window.cfpSlowRx = null; location.hash = '#/master'"); q.wait_for_selector('#ra')
        q.evaluate("document.querySelector('#ra').dataset.alt = '1'"); q.click('#ra')
        q.wait_for_function("() => document.querySelector('#ra') && !document.querySelector('#ra').dataset.alt", timeout=15000)
        check(q.evaluate('location.hash') == '#/master', f'{lang}: ohne Seitenwechsel Master neu aufgebaut')
        # 4) Kennzahlen „Anzeigen“ → sofort „Kosten“
        q.evaluate("location.hash = '#/kpi'"); q.wait_for_selector('#kf2 button')
        check(away('#kf2 button', r'/api/reports/kpi', '#/costs', '#kf2'), f'{lang}: Kennzahlen anzeigen, sofort „Kosten“ → Kostenauswertung bleibt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/seitenwechsel-filter-{lang}-{w}-kosten.png', full_page=False)
        check(q.evaluate(noscroll), f'{lang}: kein Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
