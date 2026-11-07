# [CLAUDE] UI-Test (07.11.2026, Backlog 1114, Blickwinkel „Werkstatt-Wandbildschirm zeigt den ganzen Tag den Werkstattplan“):
#  Der Werkstattplan blieb auf einem dauerhaft sichtbaren Bildschirm auf dem Stand des Öffnens (neu freigegebene Aufträge fehlten).
#  Jetzt: „Stand HH:MM · Neu laden“, stille Aktualisierung alle 5 Min. (ohne Sprung, Scrollposition bleibt), Abfragen als Hintergrund
#  (x-cfp-bg), nie bei geänderten Feldern/Fokus im Formular. DE/UK/EN 390/820/1366 px, kein Überstand; Screenshots mit CFP_SHOTS.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wp.inhaber', 'display_name': 'WP Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'wp.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']
    wu = api('POST', '/api/users', {'username': 'wp.werkstatt', 'display_name': 'WP Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': wu['d']['invite_token'], 'password': PW}]); c0.close()
    vins = []
    for i in range(4):
        vin = f'WWP{i:05d}000000000'[:17]; vins.append(vin)
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': f'WP-W {700 + i}', 'site': 'Dortmund', 'kind': 'lkw'})['s'] == 201, f'Lkw WP-W {700 + i}')
    def freigeben(i):
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': 'Luftfederung hinten verliert Druck über Nacht (Test)', 'priority': 'mittel', 'driveability': 'fahrbereit', 'workshop_site': 'DORTMUND', 'request_key': str(uuid.uuid4())})['d']['id']
        v = api('GET', f'/api/cases/{cid}')['d']['case']['version']
        r = api('POST', f'/api/cases/{cid}/commands', {'action': 'approve_repair', 'command_id': str(uuid.uuid4()), 'expected_version': v, 'payload': {'workshop_site': 'DORTMUND'}, 'note': 'frei'})
        check(r['s'] == 200, f'WP-W {700 + i}: Reparatur freigegeben an Werkstatt Dortmund')
        return cid
    freigeben(0)

    # --- Werkstatt-Bildschirm mit künstlicher Uhr
    ctx = br.new_context(viewport={'width': 1366, 'height': 768}); ctx.clock.install()
    w = ctx.new_page(); errs = []; w.on('pageerror', lambda e: errs.append(str(e)))
    w.goto(B); check(w.evaluate(JS, ['POST', '/api/login', {'username': 'wp.werkstatt', 'password': PW}])['s'] == 200, 'Anmeldung Werkstatt')
    w.goto(B + '/#/plan'); w.wait_for_selector('#planasof', timeout=15000); w.wait_for_timeout(500)
    t0 = w.inner_text('#planasof')
    check(t0.startswith('Stand ') and 'Neu laden' in t0, f'Werkstattplan nennt den Stand: „{t0}“')
    check('WP-W 700' in w.inner_text('main') and 'WP-W 703' not in w.inner_text('main'), 'vorher: WP-W 700 im Plan, WP-W 703 nicht')
    freigeben(3)
    ctx.clock.fast_forward('02:00'); w.wait_for_timeout(500)
    check('WP-W 703' not in w.inner_text('main'), 'nach 2 Min.: noch alter Stand (Takt 5 Min.)')
    reqs = []
    w.on('request', lambda q: reqs.append((q.url, q.headers.get('x-cfp-bg'))) if '/api/' in q.url else None)
    w.evaluate("() => { document.getElementById('planreload').dataset.old = '1'; window.__ld = 0; const mo = new MutationObserver(() => { if (/Lädt|Loading/.test(document.querySelector('main')?.textContent || '')) window.__ld = 1; }); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); }")
    ctx.clock.fast_forward('03:30'); w.wait_for_timeout(1500)
    check('WP-W 703' in w.inner_text('main'), 'nach 5 Min.: neu freigegebener Auftrag WP-W 703 erscheint ohne Neuladen')
    check(w.evaluate("() => !document.getElementById('planreload').dataset.old"), 'Standzeile neu geschrieben')
    check(not w.evaluate("() => window.__ld === 1"), 'kein „Lädt…“-Zwischenbild')
    pl = [h for u, h in reqs if '/api/workshop/plan' in u]
    check(pl and all(h == '1' for h in pl), f'Abfrage als Hintergrund (x-cfp-bg) – verlängert die Sitzung nicht ({len(pl)})')
    check(w.url.endswith('#/plan'), 'Bildschirm bleibt auf dem Werkstattplan')
    # geändertes Feld (z. B. Termin eingetippt, noch nicht gespeichert): keine Aktualisierung
    freigeben(2)
    w.evaluate("() => { const i = document.createElement('input'); i.id = 'tmpin'; document.querySelector('main').appendChild(i); i.value = 'x'; }")
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check('WP-W 702' not in w.inner_text('main'), 'geändertes Feld im Plan: keine stille Aktualisierung')
    w.evaluate("() => document.getElementById('tmpin').remove()")
    w.click('#planreload'); w.wait_for_timeout(1500)
    check('WP-W 702' in w.inner_text('main'), '„Neu laden“ holt den aktuellen Stand sofort')
    check(w.url.endswith('#/plan'), '„Neu laden“ bleibt auf dem Werkstattplan')
    # andere Seite: Plan wird nicht darüber geschrieben
    w.goto(B + '/#/cases'); w.wait_for_selector('#cl', timeout=15000)
    ctx.clock.fast_forward('06:00'); w.wait_for_timeout(1000)
    check(w.url.endswith('#/cases') and w.locator('#planasof').count() == 0, 'Vorgangsliste bleibt, kein Plan darüber')
    check(not errs, f'keine Skriptfehler {errs[:2]}')
    ctx.close()

    # --- Sprachen und Geräte
    for lang, (vw, vh), want in [('uk', (390, 844), 'Станом на'), ('en', (820, 1180), 'As of'), ('de', (1366, 900), 'Stand')]:
        c = br.new_context(viewport={'width': vw, 'height': vh}); q = c.new_page(); er = []; q.on('pageerror', lambda e: er.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': 'wp.werkstatt', 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B + '/#/plan'); q.reload(); q.wait_for_selector('#planasof', timeout=15000)
        tx = q.inner_text('#planasof'); m = q.evaluate("() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })")
        check(tx.startswith(want), f'{lang} {vw} px: „{tx}“')
        check(m['sw'] <= m['cw'], f'{lang} {vw} px: kein Überstand ({m["sw"]}/{m["cw"]})')
        check(not er, f'{lang}: keine Skriptfehler {er[:2]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/plan-stand-{vw}-{lang}.png')
        q.evaluate(JS, ['PATCH', '/api/me', {'language': 'de'}]); c.close()
    # Druck: Standzeile nicht im Ausdruck
    c = br.new_context(viewport={'width': 1366, 'height': 900}); q = c.new_page(); q.goto(B)
    q.evaluate(JS, ['POST', '/api/login', {'username': 'wp.werkstatt', 'password': PW}]); q.goto(B + '/#/plan'); q.wait_for_selector('#planasof', timeout=15000)
    q.emulate_media(media='print'); check(not q.is_visible('#planasof'), 'Druck: keine Standzeile')
    c.close(); br.close()
print(f'\n{"FEHLER: " + str(len(fails)) if fails else "alles grün"}')
sys.exit(1 if fails else 0)
