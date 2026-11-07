# [CLAUDE] UI-Test (07.11.2026, Backlog 1127, Blickwinkel „Werkstatt-Tablet bzw. Fuhrparkleitung hat die Reifenübersicht den ganzen Tag offen“):
#  Die Reifenübersicht blieb auf dem Stand des Öffnens (frische Messungen anderer erst nach Seitenwechsel sichtbar).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Reiter, Standort und Scrollposition bleiben; Direktsprung #/tires?f=…
#  wird auf #/tires umgeschrieben und zählt als dieselbe Seite), Abfragen als Hintergrund (x-cfp-bg), nie bei Fokus im Feld oder geänderter
#  Auswahl. DE/UK/EN 390/820/1366 px, kein Überstand, nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver
#  (In-Memory-DB). Nur synthetische Testdaten.
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
    for un in ['ra.inhaber', 'bg.inhaber', 'pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper()
    users = {}
    for role, nm in [('fleet', 'fl'), ('workshop', 'ws')]:
        un = f'ra.{nm}.{tag.lower()}'
        body = {'username': un, 'display_name': f'RA {role}', 'role': role, 'environment': env}
        if role == 'workshop': body['workshop_site'] = 'DORTMUND'
        u = api('POST', '/api/users', body)
        check(u['s'] in (200, 201), f'Konto {role} ({u["s"]} {u["d"] if u["s"] >= 300 else ""})')
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
        users[role] = un
    n = [0]
    def abgefahren():
        n[0] += 1
        vin = f'RA{tag}{n[0]:011d}'[:17]
        v = api('POST', '/api/vehicles', {'plate': f'RA-{tag} {n[0]}', 'vin': vin, 'site': 'Dortmund' if n[0] % 2 else 'Hamburg'})
        check(v['s'] in (200, 201), f'Fahrzeug {n[0]} ({v["s"]})')
        m = api('POST', f'/api/vehicles/{v["d"]["id"]}/tires/events', {'event_type': 'messung', 'position': 'VA-L', 'tread_mm': 1})
        check(m['s'] in (200, 201), f'Messung 1 mm Fahrzeug {n[0]} ({m["s"]} {m["d"] if m["s"] >= 300 else ""})')
    for _ in range(14): abgefahren()
    def mine(pg): return pg.evaluate("t => [...document.querySelectorAll('#main .list a.row')].filter((a) => a.textContent.includes(t)).length", f'RA-{tag}')

    # --- Fuhrparkleitung am PC mit künstlicher Uhr, Direktsprung mit Reiter
    ctx = br.new_context(viewport={'width': 1366, 'height': 700}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': users['fleet'], 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + '/#/tires?f=attention'); w.wait_for_selector('#tiresasof', timeout=15000); w.wait_for_timeout(800)
    check(w.url.endswith('#/tires'), 'Direktsprung auf #/tires umgeschrieben')
    t0 = w.inner_text('#tiresasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Reifenübersicht nennt den Stand: „{t0}“')
    check(mine(w) == 14, f'vorher: 14 Fahrzeuge unter Minimum ({mine(w)})')
    w.evaluate("() => window.scrollTo(0, 300)"); TOP = "() => Math.round(document.querySelector('#main .list').getBoundingClientRect().top)"; y0 = w.evaluate(TOP)
    abgefahren()
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check(mine(w) == 14, 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('tirereload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.body, { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    check(mine(w) == 15, f'nach 5 Min.: neue Messung der Werkstatt sichtbar ohne Neuladen ({mine(w)})')
    check(w.evaluate("() => !document.getElementById('tirereload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    y1 = w.evaluate(TOP); check(w.evaluate('() => window.scrollY') > 200 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Liste bei {y0}/{y1} px)')
    fl = [h for u2, h in reqs if '/api/tires/fleet' in u2]
    check(fl and all(h == '1' for h in fl), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(fl)})')
    check(w.url.endswith('#/tires'), 'bleibt auf der Reifenübersicht')
    # Reiter „Alle“ und Standort bleiben über die stille Aktualisierung
    w.click('[data-tf=all]'); w.wait_for_timeout(800)
    w.select_option('#tsite', 'Dortmund'); w.wait_for_timeout(1200)
    k0 = mine(w); abgefahren(); abgefahren(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check(mine(w) == k0 + 1 and w.locator('[data-tf=all][aria-pressed=true]').count() == 1 and w.input_value('#tsite') == 'Dortmund', f'Reiter „Alle“ + Standort Dortmund bleiben, nur Dortmunder Lkw neu ({k0}→{mine(w)})')
    # Fokus im Feld: keine Aktualisierung; „Neu laden“ holt sofort
    k0 = mine(w); abgefahren(); abgefahren(); w.focus('#tsite'); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == k0, 'Fokus im Feld: keine stille Aktualisierung')
    w.evaluate("() => document.activeElement.blur()")
    w.click('#tirereload'); w.wait_for_timeout(1500)
    check(mine(w) == k0 + 1 and w.url.endswith('#/tires'), f'„Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    # andere Seite: Reifenübersicht wird nicht darüber geschrieben
    w.goto(B + '/#/maintenance'); w.wait_for_timeout(1500)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/maintenance') and w.locator('#tiresasof').count() == 0, 'Prüftermine bleiben, keine Reifenübersicht darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte (Handy Werkstatt, Tablet hochkant, PC Inhaber)
    for who, lang, (vw, vh), want in [(users['workshop'], 'uk', (390, 844), 'Станом на'), (users['fleet'], 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/tires'); q.reload(); q.wait_for_selector('#tiresasof', timeout=15000)
        tx = q.inner_text('#tiresasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        hh = q.evaluate("() => Math.round(document.getElementById('tirereload').getBoundingClientRect().height)")
        check(hh >= 24, f'{lang} {vw} px: Tippfläche „Neu laden“ {hh} px')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/reifen-stand-{vw}-{lang}.png')
        if who == owner:
            q.emulate_media(media='print'); check(not q.is_visible('#tiresasof'), 'Druck: keine Standzeile')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
