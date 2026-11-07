# [CLAUDE] UI-Test (07.11.2026, Backlog 1123/1124, Blickwinkel „Inhaber/Fuhrparkleitung hat Verträge bzw. Versicherungsfälle den ganzen Tag offen“):
#  Die Listen „Verträge“ und „Versicherungsfälle“ blieben auf dem Stand des Öffnens (neue Einträge der Kollegen erst nach Seitenwechsel).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Scrollposition bleibt), Abfragen als Hintergrund (x-cfp-bg),
#  nie bei Fokus im Feld, Eingaben (Importquelle) oder Import-Vorschau; andere Seite wird nicht überschrieben. DE/UK/EN 390/820/1366 px,
#  kein Überstand, nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid, time
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None, ct=None: a.evaluate(JS, [m, pa, b, ct])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'va.inhaber', 'display_name': 'VA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['va.inhaber', 'bg.inhaber', 'pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper(); sfx = str(uuid.uuid4().int)[:4]
    flu = f'va.fl.{tag.lower()}'
    u = api('POST', '/api/users', {'username': flu, 'display_name': 'VA Fuhrparkleitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}, None]); c0.close()
    vins = [f'WMA15VA{tag}{sfx}{i:02d}'[:17] for i in range(6)]
    rows = '\n'.join(f'VA-{tag} {i};Dortmund;MAN;2018;{v};Lkw' for i, v in enumerate(vins))
    check(api('POST', '/api/vehicles/import', f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{rows}', 'text/csv')['s'] == 200, 'Fahrzeuge importiert')
    n = [0]
    def vertrag():
        n[0] += 1
        r = api('POST', f'/api/vehicles/VIN:{vins[n[0] % 6]}/contracts', {'kind': 'wartung', 'partner': f'VA-{tag} Service', 'evidence': 'Vertrag (Test)', 'contract_no': f'VA-{tag}-{n[0]:02d}', 'start_date': '2026-01-01'})
        check(r['s'] in (200, 201), f'Vertrag {n[0]} angelegt ({r["s"]})')
    for _ in range(14): vertrag()
    k = [0]
    def schaden():
        k[0] += 1
        c = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[k[0] % 6], 'description': f'Spiegel abgefahren (Test VA {k[0]})', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': f'va-{tag}-{k[0]}'})
        r = api('PUT', f'/api/cases/{c["d"]["id"]}/claim', {'insurer': f'VA-{tag} Versicherung', 'claim_no': f'VS-{tag}-{k[0]:02d}', 'reported_on': time.strftime('%Y-%m-%d'), 'evidence': 'Schadenmeldung (Test)'})
        check(c['s'] == 201 and r['s'] == 200, f'Versicherungsfall {k[0]} angelegt ({r["s"]})')
    for _ in range(8): schaden()
    def mine(pg): return pg.evaluate("t => [...document.querySelectorAll('#main .list a.row')].filter((a) => a.textContent.includes(t)).length", f'VA-{tag}')

    # --- Fuhrparkleitung am PC mit künstlicher Uhr: Verträge
    ctx = br.new_context(viewport={'width': 1366, 'height': 700}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': flu, 'password': PW}, None])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    w.goto(B + '/#/contracts'); w.wait_for_selector('#contractsasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#contractsasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Verträge nennen den Stand: „{t0}“')
    check(mine(w) == 14, f'vorher: 14 Verträge ({mine(w)})')
    w.evaluate("() => window.scrollTo(0, 300)"); TOP = "() => Math.round(document.querySelector('#main .list').getBoundingClientRect().top)"; y0 = w.evaluate(TOP)
    vertrag(); ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check(mine(w) == 14, 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('ctreload').dataset.old = '1'; }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    check(mine(w) == 15, f'nach 5 Min.: neuer Vertrag sichtbar ohne Neuladen ({mine(w)})')
    check(w.evaluate("() => !document.getElementById('ctreload').dataset.old"), 'Standzeile neu geschrieben')
    y1 = w.evaluate(TOP); check(w.evaluate('() => window.scrollY') > 200 and abs(y1 - y0) <= 2, f'Scrollposition bleibt (Liste bei {y0}/{y1} px)')
    fl = [h for u2, h in reqs if '/api/contracts' in u2]
    check(fl and all(h == '1' for h in fl), f'Abfrage als Hintergrund (x-cfp-bg) ({len(fl)})')
    # Eingabe Importquelle: keine Aktualisierung, Eingabe bleibt; zurückgenommen: aktualisiert, Bereich bleibt offen
    w.click('details:has(#ctsrc) > summary'); w.fill('#ctsrc', 'Halb getippt'); w.evaluate("() => document.activeElement.blur()")
    vertrag(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 15 and w.input_value('#ctsrc') == 'Halb getippt', 'Eingabe Importquelle: keine stille Aktualisierung, Eingabe bleibt')
    w.fill('#ctsrc', ''); w.evaluate("() => document.activeElement.blur()")
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check(mine(w) == 16 and w.locator('details:has(#ctsrc)[open]').count() == 1, f'Eingabe zurückgenommen: aktualisiert, Bereich bleibt aufgeklappt ({mine(w)})')
    # angezeigte Import-Vorschau: bleibt stehen
    w.evaluate("() => { document.getElementById('ctimpr').innerHTML = '<p>Vorschau (Test)</p>'; }")
    vertrag(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 16 and 'Vorschau (Test)' in w.inner_text('#ctimpr'), 'Import-Vorschau: keine stille Aktualisierung')
    w.click('#ctreload'); w.wait_for_timeout(1500)
    check(mine(w) == 17 and w.url.endswith('#/contracts'), f'„Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    # Fokus im Feld
    vertrag(); w.focus('#ctsrc'); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 17, 'Fokus im Feld: keine stille Aktualisierung'); w.evaluate("() => document.activeElement.blur()")

    # --- Versicherungsfälle
    w.goto(B + '/#/claims'); w.wait_for_selector('#claimsasof', timeout=15000); w.wait_for_timeout(500)
    check(w.inner_text('#claimsasof').startswith('Stand '), 'Versicherungsfälle nennen den Stand')
    check(mine(w) == 8, f'vorher: 8 offene Versicherungsfälle ({mine(w)})')
    reqs.clear(); schaden(); ctx.clock.fast_forward('05:30'); w.wait_for_timeout(1500)
    check(mine(w) == 9, f'nach 5 Min.: neuer Versicherungsfall sichtbar ({mine(w)})')
    cl = [h for u2, h in reqs if '/api/claims' in u2]
    check(cl and all(h == '1' for h in cl), f'Abfrage als Hintergrund (x-cfp-bg) ({len(cl)})')
    w.check('#cl3p'); schaden(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(mine(w) == 9 and w.is_checked('#cl3p'), 'Haken „mit Unfallgegner“ gesetzt: keine stille Aktualisierung')
    w.uncheck('#cl3p'); w.evaluate("() => document.activeElement.blur()"); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
    check(mine(w) == 10, f'Haken zurückgenommen: aktualisiert ({mine(w)})')
    schaden(); w.click('#clreload'); w.wait_for_timeout(1500)
    check(mine(w) == 11 and w.url.endswith('#/claims'), f'„Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    # andere Seite: nichts darüber schreiben
    w.goto(B + '/#/fines'); w.wait_for_timeout(1500); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/fines') and w.locator('#claimsasof, #contractsasof').count() == 0, 'Bußgelder bleiben, keine Vertrags-/Versicherungsliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte (Handy, Tablet hochkant, PC Inhaber)
    for who, lang, (vw, vh), want in [(flu, 'uk', (390, 844), 'Станом на'), (flu, 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}, None]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}, None]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        for hsh, pid, rid, shot in [('#/contracts', 'contractsasof', 'ctreload', 'vertraege'), ('#/claims', 'claimsasof', 'clreload', 'versicherung')]:
            q.goto(B + '/' + hsh); q.reload(); q.wait_for_selector('#' + pid, timeout=15000)
            tx = q.inner_text('#' + pid); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
            check(tx.startswith(want), f'{shot} {lang} {vw} px: „{tx}“')
            check(m['sw'] <= m['cw'], f'{shot} {lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
            hh = q.evaluate("r => Math.round(document.getElementById(r).getBoundingClientRect().height)", rid)
            check(hh >= 24, f'{shot} {lang} {vw} px: Tippfläche „Neu laden“ {hh} px')
            if SHOTS: q.screenshot(path=f'{SHOTS}/{shot}-stand-{vw}-{lang}.png')
            if who == owner:
                q.emulate_media(media='print'); check(not q.is_visible('#' + pid), f'{shot} Druck: keine Standzeile'); q.emulate_media(media='screen')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}, None]); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
