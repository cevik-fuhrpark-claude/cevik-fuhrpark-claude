# [CLAUDE] UI-Test (07.11.2026, Backlog 1115, Blickwinkel „Disposition hat die Fahrzeugliste den ganzen Tag offen“):
#  Die Fahrzeugliste blieb in einem dauerhaft sichtbaren Fenster auf dem Stand des Öffnens (neue Meldung/Sperre fehlte bis zum Seitenwechsel).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Filter, Suchtext und Scrollposition bleiben), Abfragen als Hintergrund
#  (x-cfp-bg), nie bei Fokus im Feld/anderen geänderten Feldern. DE/UK/EN 390/820/1366 px, kein Überstand; Screenshots mit CFP_SHOTS.
# Voraussetzung: frischer Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
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
    if not api('GET', '/api/setup/status')['d'].get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten.')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fl.inhaber', 'display_name': 'FL Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'fl.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    du = api('POST', '/api/users', {'username': 'fl.dispo', 'display_name': 'FL Dispo', 'role': 'dispatch', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': du['d']['invite_token'], 'password': PW}]); c0.close()
    vins = []
    for i in range(30):
        vin = f'WFL{i:05d}000000000'[:17]; vins.append(vin)
        r = api('POST', '/api/vehicles', {'vin': vin, 'plate': f'FL-D {800 + i}', 'site': 'Dortmund', 'kind': 'lkw'})
        if r['s'] != 201: check(False, f'Lkw FL-D {800 + i} ({r["s"]})')
    def melden(i):
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': 'Spiegel rechts lose (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        check(r['s'] in (200, 201), f'Meldung zu FL-D {800 + i}')
    def offen_n(pg): return pg.evaluate("() => { const b = document.querySelector('[data-av=meldung_offen]'); return b ? b.textContent : ''; }")

    # --- Disposition mit künstlicher Uhr, Fenster 960 px (zwei Fenster nebeneinander am 1920-px-Monitor)
    ctx = br.new_context(viewport={'width': 960, 'height': 1000}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': 'fl.dispo', 'password': PW}])['s'] == 200, 'Anmeldung Disposition')
    w.goto(B + '/#/vehicles'); w.wait_for_selector('#vehasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#vehasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Fahrzeugliste nennt den Stand: „{t0}“')
    check('(0)' in offen_n(w), f'vorher: Meldung offen (0) – „{offen_n(w)}“')
    # Lage der Liste im Fenster vergleichen (nicht scrollY: die künstliche Uhr blendet oben ggf. den Hinweis „Geräteuhr weicht ab“ ein)
    w.evaluate("() => window.scrollTo(0, 400)"); y0 = w.evaluate("() => Math.round(document.getElementById('vl').getBoundingClientRect().top)")
    melden(29)
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check('(0)' in offen_n(w), 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('vehreload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    check('(1)' in offen_n(w), f'nach 5 Min.: neue Meldung zählt ohne Neuladen – „{offen_n(w)}“')
    check(w.evaluate("() => !document.getElementById('vehreload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    y1 = w.evaluate("() => Math.round(document.getElementById('vl').getBoundingClientRect().top)"); check(w.evaluate('() => window.scrollY') > 300 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Liste bei {y0}/{y1} px)')
    vl = [h for u, h in reqs if '/api/vehicles' in u]
    check(vl and all(h == '1' for h in vl), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(vl)})')
    check(w.url.endswith('#/vehicles'), 'Fenster bleibt auf der Fahrzeugliste')
    # Filter + Suchtext (Feld nicht fokussiert) bleiben und filtern nach der Aktualisierung weiter
    w.click('[data-av=meldung_offen]'); w.wait_for_timeout(800)
    w.fill('#q', 'FL-D 829'); w.dispatch_event('#q', 'input'); w.evaluate("() => document.activeElement.blur()")
    melden(28)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check('(2)' in offen_n(w), f'mit Suchtext (ohne Fokus): trotzdem aktualisiert – „{offen_n(w)}“')
    check(w.input_value('#q') == 'FL-D 829', 'Suchtext bleibt')
    vis = w.evaluate("() => [...document.querySelectorAll('#vl a')].filter((a) => !a.hidden).map((a) => a.textContent)")
    check(len(vis) == 1 and 'FL-D 829' in vis[0], f'Suche filtert nach der Aktualisierung weiter ({len(vis)} sichtbar)')
    check(w.get_attribute('[data-av=meldung_offen]', 'aria-pressed') == 'true', 'Filter „Meldung offen“ bleibt gewählt')
    # Fokus im Suchfeld: keine Aktualisierung
    w.fill('#q', ''); w.dispatch_event('#q', 'input'); w.focus('#q')
    melden(27)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check('(2)' in offen_n(w), 'Fokus im Suchfeld: keine stille Aktualisierung')
    w.evaluate("() => document.activeElement.blur()")
    w.click('#vehreload'); w.wait_for_timeout(1500)
    check('(3)' in offen_n(w), '„Neu laden“ holt den aktuellen Stand sofort')
    check(w.url.endswith('#/vehicles'), '„Neu laden“ bleibt auf der Fahrzeugliste')
    # Sprung aus einem Zähler (#/vehicles?f=…) – danach ebenfalls still aktualisiert
    w.goto(B + '/#/vehicles?f=meldung_offen'); w.wait_for_selector('#vehasof', timeout=15000); w.wait_for_timeout(500)
    melden(26)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check('(4)' in offen_n(w), f'nach Sprung aus dem Zähler: ebenfalls aktualisiert – „{offen_n(w)}“')
    # andere Seite: Liste wird nicht darüber geschrieben
    w.goto(B + '/#/cases'); w.wait_for_selector('#cl', timeout=15000)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/cases') and w.locator('#vehasof').count() == 0, 'Vorgangsliste bleibt, keine Fahrzeugliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte
    for lang, (vw, vh), want in [('uk', (390, 844), 'Станом на'), ('en', (820, 1180), 'As of'), ('de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'fl.dispo', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/vehicles'); q.reload(); q.wait_for_selector('#vehasof', timeout=15000)
        tx = q.inner_text('#vehasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrzeugliste-stand-{vw}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    # Druck: Standzeile nicht im Ausdruck; Inhaber sieht sie auch
    c = br.new_context(viewport={'width': 1366, 'height': 900}); q = c.new_page(); q.goto(B)
    q.evaluate(JS, ['POST', '/api/login', {'username': 'fl.inhaber', 'password': PW}]); q.goto(B + '/#/vehicles'); q.wait_for_selector('#vehasof', timeout=15000)
    q.emulate_media(media='print'); check(not q.is_visible('#vehasof'), 'Druck: keine Standzeile')
    c.close(); br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
