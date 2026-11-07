# [CLAUDE] UI-Test (07.11.2026, Backlog 1120, Blickwinkel „Fuhrparkleitung hat die Prüfterminliste den ganzen Tag offen, Werkstatt trägt
#  Durchführungen ein“): Die Liste „Prüftermine“ blieb auf dem Stand des Öffnens (neue Werkstatttermine/Durchführungen erst nach Seitenwechsel).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Reiter, „Fällig bis“, aufgeklappte Bereiche und Scrollposition bleiben),
#  Abfragen als Hintergrund (x-cfp-bg), nie bei Fokus im Feld, Sammeltermin-Auswahl oder angezeigter Nachweisliste. DE/UK/EN 390/820/1366 px,
#  kein Überstand, nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
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
    for un in ['pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper()
    flu = f'pa.fl.{tag.lower()}'
    u = api('POST', '/api/users', {'username': flu, 'display_name': 'PA Fuhrparkleitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    today = datetime.date.fromisoformat(api('GET', '/api/maintenance')['d']['today'])
    rules = {}
    for i in range(12):
        pl = f'PA-{tag} {i + 1}'; vin = ('WPA' + tag + f'{i:02d}' + '0' * 17)[:17]
        v = api('POST', '/api/vehicles', {'plate': pl, 'vin': vin, 'site': 'Dortmund'})
        if v['s'] != 201: check(False, f'Fahrzeug {pl} ({v["s"]} {v["d"]})'); continue
        r = api('POST', f"/api/vehicles/{v['d']['id']}/maintenance", {'kind': 'UVV', 'last_done_date': (today - datetime.timedelta(days=355)).isoformat(), 'interval_months': 12, 'evidence': 'UI-Test Prüftermine'})
        if r['s'] != 201: check(False, f'Prüftermin {pl} ({r["s"]} {r["d"]})')
        else: rules[i] = r['d']['id']
    pday = today + datetime.timedelta(days=3)
    while pday.weekday() > 4: pday += datetime.timedelta(days=1)
    def plan(i):
        r = api('POST', f'/api/maintenance/{rules[i]}/plan', {'planned_date': pday.isoformat()})
        check(r['s'] == 200, f'Werkstatttermin für Fahrzeug {i + 1} ({r["s"]})')
    def mine(pg): return pg.evaluate("t => [...document.querySelectorAll('#main .list a.row')].filter((a) => a.textContent.includes(t)).length", f'PA-{tag}')

    # --- Fuhrparkleitung am PC mit künstlicher Uhr, Reiter „fällig ohne Termin“
    ctx = br.new_context(viewport={'width': 1366, 'height': 900}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': flu, 'password': PW}])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + '/#/maintenance?f=noplan'); w.wait_for_selector('#maintasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#maintasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Prüfterminliste nennt den Stand: „{t0}“')
    n0 = mine(w); check(n0 == 12, f'vorher: 12 Fahrzeuge fällig ohne Termin ({n0})')
    w.evaluate("() => window.scrollTo(0, 300)"); TOP = "() => Math.round(document.querySelector('[data-mf=noplan]').getBoundingClientRect().top)"; y0 = w.evaluate(TOP)
    plan(0)
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check(mine(w) == 12, 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('maintreload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.body, { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    n1 = mine(w)
    check(n1 == 11, f'nach 5 Min.: eingeplantes Fahrzeug verschwindet ohne Neuladen aus „fällig ohne Termin“ ({n1})')
    check(w.evaluate("() => !document.getElementById('maintreload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    y1 = w.evaluate(TOP); check(w.evaluate('() => window.scrollY') > 200 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Reiter bei {y0}/{y1} px)')
    ml = [h for u2, h in reqs if '/api/maintenance' in u2]
    check(ml and all(h == '1' for h in ml), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(ml)})')
    check(w.url.endswith('#/maintenance?f=noplan'), 'bleibt auf der Prüfterminliste')
    # Reiter gewechselt, „Fällig bis“ gesetzt: bleibt über die stille Aktualisierung erhalten
    w.click('[data-mf=due]'); w.wait_for_timeout(800); w.click('#mduenext'); w.wait_for_timeout(800)
    dby = w.input_value('#mdueby'); check(bool(dby), f'„Fällig bis“ gesetzt ({dby})')
    w.click('[data-mf=noplan]'); w.wait_for_timeout(800)
    plan(1)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check(mine(w) == 10 and w.input_value('#mdueby') == dby, f'mit „Fällig bis“: trotzdem aktualisiert, Auswahl bleibt ({mine(w)})')
    # Sammeltermin: Auswahl angehakt → keine stille Aktualisierung
    if w.locator('#mbatch').count():
        w.click('#mbatch > summary'); w.locator('#mbf input[name=mbid]').first.check(); w.evaluate("() => document.activeElement.blur()")
        plan(2)
        ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
        check(mine(w) == 10 and w.locator('#mbf input[name=mbid]:checked').count() == 1, 'Sammeltermin-Auswahl: keine stille Aktualisierung, Haken bleibt')
        w.locator('#mbf input[name=mbid]').first.uncheck()
        check(w.locator('#mbatch[open]').count() == 1, 'Sammeltermin bleibt aufgeklappt')
    else: check(False, 'Sammeltermin fehlt')
    # Nachweisliste angezeigt → keine stille Aktualisierung (Ergebnis bliebe sonst weg)
    w.click('#mhist > summary'); w.click('#mhf button.btn.secondary >> nth=0'); w.wait_for_timeout(1000)
    check(bool(w.inner_text('#mhres').strip()), 'Nachweisliste angezeigt')
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 10 and bool(w.inner_text('#mhres').strip()), 'angezeigte Nachweisliste: keine stille Aktualisierung')
    # Fokus im Feld „Fällig bis“: keine Aktualisierung; „Neu laden“ holt sofort
    w.click('#maintreload'); w.wait_for_timeout(1500)
    check(mine(w) == 9, f'„Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    check(w.url.endswith('#/maintenance?f=noplan') and not w.inner_text('#mhres').strip(), '„Neu laden“ bleibt auf der Liste')
    plan(3); w.focus('#mdueby'); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 9, 'Fokus im Feld: keine stille Aktualisierung')
    w.evaluate("() => document.activeElement.blur()")
    # andere Seite: Prüfterminliste wird nicht darüber geschrieben
    w.goto(B + '/#/fines'); w.wait_for_timeout(1500)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/fines') and w.locator('#maintasof').count() == 0, 'Bußgelder bleiben, keine Prüfterminliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte (Handy, Tablet hochkant, PC Inhaber)
    for who, lang, (vw, vh), want in [(flu, 'uk', (390, 844), 'Станом на'), (flu, 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/maintenance'); q.reload(); q.wait_for_selector('#maintasof', timeout=15000)
        tx = q.inner_text('#maintasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/prueftermine-stand-{vw}-{lang}.png')
        if who == owner:
            q.emulate_media(media='print'); check(not q.is_visible('#maintasof'), 'Druck: keine Standzeile')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
