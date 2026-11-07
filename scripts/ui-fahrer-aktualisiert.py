# [CLAUDE] UI-Test (07.11.2026, Backlog 1125/1126, Blickwinkel „Fuhrparkleitung hat Fahrerliste bzw. Auslese-Fristen den ganzen Tag offen“):
#  Die Listen „Fahrer“ und „Auslesungen“ blieben auf dem Stand des Öffnens (neue Einträge der Kollegen erst nach Seitenwechsel).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (Scrollposition bleibt), Abfragen als Hintergrund (x-cfp-bg),
#  nie bei Fokus im Feld, Eingaben (Neuer Fahrer, Importquelle) oder Import-Vorschau; Fahrer sehen keine Standzeile; andere Seite wird nicht überschrieben. DE/UK/EN 390/820/1366 px,
#  kein Überstand, nicht im Druck; Screenshots mit CFP_SHOTS. Voraussetzung: Entwicklungsserver (In-Memory-DB). Nur synthetische Testdaten.
import os, sys, uuid, time, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def day(n): return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None, ct=None: a.evaluate(JS, [m, pa, b, ct])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['fa.inhaber', 'va.inhaber', 'bg.inhaber', 'pa.inhaber', 'la.inhaber', 'fl.inhaber', 'lf.inhaber', 'we.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4].upper(); sfx = str(uuid.uuid4().int)[:4]
    flu = f'fa.fl.{tag.lower()}'
    u = api('POST', '/api/users', {'username': flu, 'display_name': 'FA Fuhrparkleitung', 'role': 'fleet', 'environment': env})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}, None]); c0.close()
    n = [0]
    def fahrer():
        n[0] += 1
        d = api('POST', '/api/drivers', {'display_name': f'FA-{tag} Fahrer {n[0]:02d}', 'personnel_no': f'FA{tag}{n[0]:02d}', 'site': 'Dortmund'})
        r = api('POST', '/api/tacho/downloads', {'kind': 'fahrerkarte', 'driver_id': d['d']['id'], 'downloaded_on': day(60), 'evidence': f'fa-{tag}-{n[0]}.ddd'})
        check(d['s'] == 201 and r['s'] in (200, 201), f'Fahrer {n[0]} mit Auslesung angelegt ({d["s"]}/{r["s"]})')
    for _ in range(14): fahrer()
    def mine(pg): return pg.evaluate("t => [...document.querySelectorAll('#main .list a.row')].filter((a) => a.textContent.includes(t)).length", f'FA-{tag}')

    ctx = br.new_context(viewport={'width': 1366, 'height': 700}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': flu, 'password': PW}, None])['s'] == 200, 'Anmeldung Fuhrparkleitung')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    for hsh, pid, rid, api_path in [('#/drivers', 'driversasof', 'drvreload', '/api/drivers'), ('#/tacho', 'tachoasof', 'tachoreload', '/api/tacho')]:
        w.goto(B + '/' + hsh); w.wait_for_selector('#' + pid, timeout=15000); w.wait_for_timeout(500)
        t0 = w.inner_text('#' + pid); base = mine(w)
        check(t0.startswith('Stand ') and 'Neu laden' in t0, f'{hsh}: Stand genannt „{t0}“')
        check(base >= 14, f'{hsh}: vorher {base} Fahrer')
        w.evaluate("() => window.scrollTo(0, 300)"); TOP = "() => Math.round(document.querySelector('#main .list').getBoundingClientRect().top)"; y0 = w.evaluate(TOP)
        fahrer(); ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
        check(mine(w) == base, f'{hsh}: nach 2 Min. noch alter Stand')
        reqs.clear(); w.evaluate("r => { document.getElementById(r).dataset.old = '1'; }", rid)
        ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
        check(mine(w) == base + 1, f'{hsh}: nach 5 Min. neuer Fahrer sichtbar ohne Neuladen ({mine(w)})')
        check(w.evaluate("r => !document.getElementById(r).dataset.old", rid), f'{hsh}: Standzeile neu geschrieben')
        y1 = w.evaluate(TOP); check(w.evaluate('() => window.scrollY') > 200 and abs(y1 - y0) <= 2, f'{hsh}: Scrollposition bleibt ({y0}/{y1} px)')
        fl = [h for u2, h in reqs if api_path in u2]
        check(fl and all(h == '1' for h in fl), f'{hsh}: Abfrage als Hintergrund (x-cfp-bg) ({len(fl)})')
        # Eingabe: keine Aktualisierung
        fld = '#ndf [name=display_name]' if hsh == '#/drivers' else '#tsrc'
        if hsh == '#/drivers': w.click('details:has(#ndf) > summary')
        w.fill(fld, 'Halb getippt'); w.evaluate("() => document.activeElement.blur()")
        fahrer(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
        check(mine(w) == base + 1 and w.input_value(fld) == 'Halb getippt', f'{hsh}: Eingabe – keine stille Aktualisierung, Eingabe bleibt')
        w.fill(fld, ''); w.evaluate("() => document.activeElement.blur()"); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1500)
        check(mine(w) == base + 2, f'{hsh}: Eingabe zurückgenommen – aktualisiert ({mine(w)})')
        if hsh == '#/tacho':
            w.evaluate("() => { document.getElementById('timpr').innerHTML = '<p>Vorschau (Test)</p>'; }")
            fahrer(); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
            check(mine(w) == base + 2 and 'Vorschau (Test)' in w.inner_text('#timpr'), '#/tacho: Import-Vorschau – keine stille Aktualisierung')
        else:
            fahrer()
        w.focus(fld); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
        check(mine(w) == base + 2, f'{hsh}: Fokus im Feld – keine stille Aktualisierung'); w.evaluate("() => document.activeElement.blur()")
        w.click('#' + rid); w.wait_for_timeout(1500)
        check(mine(w) == base + 3 and w.url.endswith(hsh), f'{hsh}: „Neu laden“ holt den aktuellen Stand sofort ({mine(w)})')
    w.goto(B + '/#/fines'); w.wait_for_timeout(1500); ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/fines') and w.locator('#driversasof, #tachoasof').count() == 0, 'andere Seite bleibt, keine Fahrer-/Auslesungsliste darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    for who, lang, (vw, vh), want in [(flu, 'uk', (390, 844), 'Станом на'), (flu, 'en', (820, 1180), 'As of'), (owner, 'de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': who, 'password': PW}, None]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}, None]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        for hsh, pid, rid, shot in [('#/drivers', 'driversasof', 'drvreload', 'fahrer'), ('#/tacho', 'tachoasof', 'tachoreload', 'auslesungen')]:
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

    # Fahrer: eigene Akte, keine Standzeile der Fahrerliste
    du = f'fa.fa.{tag.lower()}'
    u = api('POST', '/api/users', {'username': du, 'display_name': 'FA Fahrer', 'role': 'driver', 'environment': env})
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B); q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}, None])
    q.goto(B + '/#/drivers'); q.wait_for_selector('h1', timeout=15000); q.wait_for_timeout(800)
    check(q.locator('#driversasof').count() == 0, 'Fahrer: keine Standzeile der Fahrerliste'); c.close()
    br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
