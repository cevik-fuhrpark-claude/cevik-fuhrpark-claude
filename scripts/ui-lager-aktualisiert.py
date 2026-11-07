# [CLAUDE] UI-Test (07.11.2026, Backlog 1119, Blickwinkel „Werkstatt-Tablet zeigt den ganzen Tag die Lagerliste, Kollegen buchen Teile in Aufträge“):
#  Die Lagerliste blieb auf dem Stand des Öffnens (Entnahmen anderer erst nach Seitenwechsel sichtbar).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Suchtext, Filter, aufgeklappte Bereiche und Scrollposition bleiben),
#  Abfragen als Hintergrund (x-cfp-bg), nie bei Fokus im Feld/anderen Eingaben (Neuer Artikel). DE/UK/EN 390/820/1366 px, kein Überstand,
#  nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'la.inhaber', 'display_name': 'LA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'la.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'LA Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    ids = {}
    for i in range(25):
        nm = f'Filter {tag} {i:02d}'
        r = api('POST', '/api/stock', {'site': 'DORTMUND', 'name': nm, 'part_number': f'LA-{tag}-{i:02d}', 'initial_qty': '10', 'min_qty': '3'})
        if r['s'] != 201: check(False, f'Artikel {nm} ({r["s"]})')
        else: ids[i] = r['d']['id']
    def entnahme(i, qty):
        r = api('POST', f'/api/stock/{ids[i]}/movements', {'type': 'entnahme', 'qty': str(qty), 'note': 'Auftrag (Test)', 'request_key': str(uuid.uuid4())})
        check(r['s'] in (200, 201), f'Entnahme {qty} von Artikel {i} ({r["s"]})')
    def row(pg, i): return pg.evaluate("id => { const a = document.querySelector(`#sl a[data-id='${id}']`); return a ? a.textContent.replace(/\\s+/g, ' ') : ''; }", ids[i])

    # --- Werkstatt-Tablet mit künstlicher Uhr, Querformat 1180 px
    ctx = br.new_context(viewport={'width': 1180, 'height': 820}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}])['s'] == 200, 'Anmeldung Werkstatt')
    w.goto(B + '/#/stock'); w.wait_for_selector('#stockasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#stockasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Lagerliste nennt den Stand: „{t0}“')
    r0 = row(w, 24); check('10' in r0, f'vorher: Bestand 10 – „{r0[:80]}“')
    w.evaluate("() => window.scrollTo(0, 400)"); y0 = w.evaluate("() => Math.round(document.getElementById('sl').getBoundingClientRect().top)")
    entnahme(24, 8)
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check(row(w, 24) == r0, 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('stockreload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.body, { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    r1 = row(w, 24)
    check(r1 != r0 and '2' in r1, f'nach 5 Min.: Entnahme des Kollegen sichtbar ohne Neuladen – „{r1[:80]}“')
    check(w.evaluate("() => !document.getElementById('stockreload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    y1 = w.evaluate("() => Math.round(document.getElementById('sl').getBoundingClientRect().top)")
    check(w.evaluate('() => window.scrollY') > 300 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Liste bei {y0}/{y1} px)')
    sl = [h for u2, h in reqs if '/api/stock' in u2]
    check(sl and all(h == '1' for h in sl), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(sl)})')
    check(w.url.endswith('#/stock'), 'Tablet bleibt auf der Lagerliste')
    # Filter „unter Mindestbestand“ + Suchtext (nicht fokussiert) bleiben und filtern weiter
    w.select_option('#sf', 'min'); w.wait_for_timeout(300)
    w.fill('#q', f'Filter {tag}'); w.dispatch_event('#q', 'input'); w.evaluate("() => document.activeElement.blur()"); w.wait_for_timeout(300)
    vis0 = w.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).length")
    check(vis0 == 1, f'vorher: 1 Artikel unter Mindestbestand ({vis0})')
    entnahme(23, 9)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    vis = w.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).map((a) => a.dataset.id)")
    check(len(vis) == 2 and ids[23] in vis, f'mit Filter und Suchtext: trotzdem aktualisiert, neuer Artikel unter Mindestbestand ({len(vis)} sichtbar)')
    check(w.input_value('#q') == f'Filter {tag}' and w.input_value('#sf') == 'min', 'Suchtext und Filter bleiben')
    check('2' in (w.inner_text('#sfsum') or ''), f'Summenzeile passt zur Auswahl: „{w.inner_text("#sfsum")}“')
    # Eingabe im Formular „Neuer Artikel“: keine stille Aktualisierung (Eingabe bleibt)
    w.click('#nf >> xpath=..//summary'); w.fill('#nf [name=name]', 'Halb getippt'); w.evaluate("() => document.activeElement.blur()")
    entnahme(22, 9)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    vis2 = w.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).length")
    check(vis2 == 2 and w.input_value('#nf [name=name]') == 'Halb getippt', 'Eingabe „Neuer Artikel“: keine stille Aktualisierung, Eingabe bleibt')
    w.fill('#nf [name=name]', '')
    # Fokus im Suchfeld: keine Aktualisierung
    w.focus('#q'); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).length") == 2, 'Fokus im Suchfeld: keine stille Aktualisierung')
    w.evaluate("() => document.activeElement.blur()")
    w.click('#stockreload'); w.wait_for_timeout(1500)
    check(w.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).length") == 3, '„Neu laden“ holt den aktuellen Stand sofort')
    check(w.url.endswith('#/stock'), '„Neu laden“ bleibt auf der Lagerliste')
    # andere Seite: Lagerliste wird nicht darüber geschrieben
    w.goto(B + '/#/stock/journal'); w.wait_for_timeout(1500)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/stock/journal') and w.locator('#stockasof').count() == 0, 'Lagerjournal bleibt, keine Lagerliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte (Werkstatt-Handy, Tablet hochkant, PC Inhaber)
    for who, lang, (vw, vh), want in [(wsu, 'uk', (390, 844), 'Станом на'), (wsu, 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/stock'); q.reload(); q.wait_for_selector('#stockasof', timeout=15000)
        tx = q.inner_text('#stockasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-stand-{vw}-{lang}.png')
        if who == owner:
            q.emulate_media(media='print'); check(not q.is_visible('#stockasof'), 'Druck: keine Standzeile')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
