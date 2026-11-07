# [CLAUDE] UI-Test (07.11.2026, Backlog 1122, Blickwinkel „Büro hat die Bußgeldliste den ganzen Tag offen, Kollegin erfasst Schreiben“):
#  Die Liste „Bußgelder & Schreiben“ blieb auf dem Stand des Öffnens (neue Schreiben anderer erst nach Seitenwechsel sichtbar).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (aufgeklappte Bereiche und Scrollposition bleiben), Abfragen als
#  Hintergrund (x-cfp-bg), nie bei Fokus im Feld oder Eingaben (Neues Schreiben); nicht für Fahrer. DE/UK/EN 390/820/1366 px, kein Überstand,
#  nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid, datetime
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
    for un in ['bg.inhaber', 'pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper()
    flu = f'bg.fl.{tag.lower()}'
    u = api('POST', '/api/users', {'username': flu, 'display_name': 'BG Fuhrparkleitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    drv = f'bg.fa.{tag.lower()}'
    u = api('POST', '/api/users', {'username': drv, 'display_name': 'BG Fahrer', 'role': 'driver', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    n = [0]
    def schreiben():
        n[0] += 1
        r = api('POST', '/api/fines', {'kind': 'anhoerung', 'authority': f'Bußgeldstelle BG-{tag}', 'reference': f'BG-{tag}-{n[0]:02d}', 'offense_type': 'parken', 'offense_at': '2026-10-01T08:00:00Z', 'plate_in_letter': f'BG-{tag} {n[0]}', 'request_key': str(uuid.uuid4())})
        check(r['s'] in (200, 201), f'Schreiben {n[0]} erfasst ({r["s"]})')
    for _ in range(14): schreiben()
    def mine(pg): return pg.evaluate("t => [...document.querySelectorAll('#main .list a.row')].filter((a) => a.textContent.includes(t)).length", f'BG-{tag}')

    # --- Fuhrparkleitung am PC mit künstlicher Uhr
    ctx = br.new_context(viewport={'width': 1366, 'height': 900}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': flu, 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + '/#/fines'); w.wait_for_selector('#finesasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#finesasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Bußgeldliste nennt den Stand: „{t0}“')
    check(mine(w) == 14, f'vorher: 14 Schreiben ({mine(w)})')
    w.evaluate("() => window.scrollTo(0, 300)"); TOP = "() => Math.round(document.querySelector('#main .list').getBoundingClientRect().top)"; y0 = w.evaluate(TOP)
    schreiben()
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check(mine(w) == 14, 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('finesreload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.body, { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    check(mine(w) == 15, f'nach 5 Min.: neues Schreiben der Kollegin sichtbar ohne Neuladen ({mine(w)})')
    check(w.evaluate("() => !document.getElementById('finesreload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    y1 = w.evaluate(TOP); check(w.evaluate('() => window.scrollY') > 200 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Liste bei {y0}/{y1} px)')
    fl = [h for u2, h in reqs if '/api/fines' in u2]
    check(fl and all(h == '1' for h in fl), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(fl)})')
    check(w.url.endswith('#/fines'), 'bleibt auf der Bußgeldliste')
    # Eingabe im Formular „Neues Schreiben“: keine stille Aktualisierung (Eingabe bleibt), Bereich bleibt aufgeklappt
    w.click('#nf >> xpath=..//summary'); w.fill('#nf [name=authority]', 'Halb getippt'); w.evaluate("() => document.activeElement.blur()")
    schreiben(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 15 and w.input_value('#nf [name=authority]') == 'Halb getippt', 'Eingabe „Neues Schreiben“: keine stille Aktualisierung, Eingabe bleibt')
    w.fill('#nf [name=authority]', ''); w.evaluate("() => document.activeElement.blur()")
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check(mine(w) == 16 and w.locator('details:has(#nf)[open]').count() == 1, f'Eingabe zurückgenommen: aktualisiert, Bereich bleibt aufgeklappt ({mine(w)})')
    # Fokus im Feld: keine Aktualisierung; „Neu laden“ holt sofort
    schreiben(); w.focus('#nf [name=authority]'); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 16, 'Fokus im Feld: keine stille Aktualisierung')
    w.evaluate("() => document.activeElement.blur()")
    w.click('#finesreload'); w.wait_for_timeout(1500)
    check(mine(w) == 17 and w.url.endswith('#/fines'), f'„Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    # andere Seite: Bußgeldliste wird nicht darüber geschrieben
    w.goto(B + '/#/maintenance'); w.wait_for_timeout(1500)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/maintenance') and w.locator('#finesasof').count() == 0, 'Prüftermine bleiben, keine Bußgeldliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Fahrer („Meine Bußgelder“): keine Standzeile
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': drv, 'password': PW}])
    q.goto(B + '/#/fines'); q.wait_for_selector('h1', timeout=15000); q.wait_for_timeout(800)
    check(q.locator('#finesasof').count() == 0, 'Fahrer: keine Standzeile'); c.close()

    # --- Sprachen und Geräte (Handy, Tablet hochkant, PC Inhaber)
    for who, lang, (vw, vh), want in [(flu, 'uk', (390, 844), 'Станом на'), (flu, 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/fines'); q.reload(); q.wait_for_selector('#finesasof', timeout=15000)
        tx = q.inner_text('#finesasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        hh = q.evaluate("() => Math.round(document.getElementById('finesreload').getBoundingClientRect().height)")
        check(hh >= 24, f'{lang} {vw} px: Tippfläche „Neu laden“ {hh} px')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/bussgelder-stand-{vw}-{lang}.png')
        if who == owner:
            q.emulate_media(media='print'); check(not q.is_visible('#finesasof'), 'Druck: keine Standzeile')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
