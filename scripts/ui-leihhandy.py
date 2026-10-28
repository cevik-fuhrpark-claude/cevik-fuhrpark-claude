# [CLAUDE] UI-Test (28.10.2026, Backlog 527–535, Blickwinkel „Neuer Fahrer, erster Arbeitstag mit Leihhandy“ / „Quartalsende: offene Versicherungsfälle“):
# Einladung mit „Passwort anzeigen“, Anmeldung weist kyrillischen Benutzernamen ohne Anfrage ab und entfernt Leerzeichen, Abmelden fragt bei
# abgelehnten Meldungen nach, Anmeldeseite nennt sie getrennt, Abmelden ohne Netz mit stehendem Hinweis; Versicherungsfälle mit Reitern
# „Nachfassen“/„zurückgezogen“ und Suche im Ausdruckkopf. DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler.
# Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, json
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lh.inhaber', 'display_name': 'LH Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['lh.inhaber', 'vt.inhaber', 'pm.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        un = f'lh.fahrer{pid}{i}'
        u = api('POST', '/api/users', {'username': un, 'display_name': f'LH Fahrer {i}', 'role': 'driver', 'environment': envname, 'language': lang})
        check(u['s'] in (200, 201), f'{lang}: Fahrer angelegt')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        reqs = []; q.on('request', lambda r: reqs.append(r.url) if '/api/login' in r.url else None)
        q.goto(f"{B}/#/invite/{u['d']['invite_token']}"); q.wait_for_selector('#pwshow')
        q.fill('#p', PW); q.click('#pwshow')
        check(q.get_attribute('#p', 'type') == 'text' and q.get_attribute('#pwshow', 'aria-pressed') == 'true', f'{lang}: 535 Passwort sichtbar')
        check(q.evaluate(noscroll), f'{lang}: Einladung ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leihhandy-einladung-{lang}-{w}.png')
        q.click('#pwshow'); check(q.get_attribute('#p', 'type') == 'password', f'{lang}: 535 wieder verdeckt')
        q.click('form#f button.block'); q.wait_for_function("() => location.hash !== '' && !location.hash.startsWith('#/invite')", timeout=10000)
        me = q.evaluate(JS, ['GET', '/api/me', None])['d']['user']
        # abgelehnte Meldung im Postausgang dieser Person (so wie die App sie nach einer Ablehnung ablegt)
        key = f"cfp_outbox_{me['id']}_{me['environment']}"
        q.evaluate("([k, n]) => localStorage.setItem(k, JSON.stringify([{ path: '/api/cases', body: { request_key: 'rk-' + Date.now(), vehicle_id: 'VIN:X', description: 'Spiegel kaputt' }, photos: 0, saved_at: new Date().toISOString(), user_name: n, failed: { code: 'validation', message: 'abgelehnt' } }]))", [key, me['display_name']])
        q.goto(f'{B}/#/more'); q.wait_for_selector('#lo')
        dialogs = []
        q.once('dialog', lambda d: (dialogs.append(d.message), d.dismiss()))
        q.click('#lo'); q.wait_for_timeout(500)
        check(len(dialogs) == 1 and q.evaluate("location.hash") == '#/more', f'{lang}: 532 Rückfrage bei abgelehnter Meldung, abbrechen bleibt angemeldet')
        # ohne Netz: stehender Hinweis, weiterhin angemeldet
        ctx.set_offline(True)
        q.once('dialog', lambda d: d.accept())
        q.click('#lo'); q.wait_for_selector('#lo_off', timeout=5000)
        check(q.is_visible('#lo_off') and q.evaluate("location.hash") == '#/more', f'{lang}: 533 Hinweis ohne Netz')
        q.wait_for_timeout(3500); check(q.is_visible('#lo_off'), f'{lang}: 533 Hinweis bleibt stehen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leihhandy-abmelden-offline-{lang}-{w}.png', full_page=False)
        ctx.set_offline(False)
        q.once('dialog', lambda d: d.accept())
        q.click('#lo'); q.wait_for_selector('#orphan_outbox', timeout=8000)
        txt = q.inner_text('#orphan_outbox')
        check(me['display_name'] in txt and ('abgelehnt' in txt or 'відхилено' in txt or 'rejected' in txt), f'{lang}: 532 Anmeldeseite nennt abgelehnte Meldung')
        # 534: kyrillisch → keine Anfrage, Hinweis; „Leerzeichen“ → Anmeldung gelingt
        q.evaluate("() => localStorage.removeItem('" + key + "')")
        n0 = len(reqs); q.fill('#u', 'лх.фахрер'); q.fill('#p', PW); q.click('form#f button.block'); q.wait_for_timeout(400)
        check(q.is_visible('#ulatin') and len(reqs) == n0, f'{lang}: 534 kyrillisch ohne Anfrage, Hinweis sichtbar')
        check(q.evaluate(noscroll), f'{lang}: Anmeldeseite ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leihhandy-anmeldung-{lang}-{w}.png')
        q.fill('#u', un[:3] + ' ' + un[3:]); q.click('form#f button.block')
        q.wait_for_function("() => !location.hash.startsWith('#/login')", timeout=10000)
        check(q.evaluate(JS, ['GET', '/api/me', None])['s'] == 200, f'{lang}: 534 Leerzeichen entfernt, angemeldet')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # 527/530/531: Versicherungsfälle (Inhaber, PC)
    ctx = br.new_context(viewport={'width': 1366, 'height': 900}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}])
    q.goto(f'{B}/#/claims'); q.wait_for_selector('[data-clf="zurueckgezogen"]')
    check(q.locator('[data-clf="abgelehnt"]').count() == 1, '531: Reiter vorhanden')
    q.fill('#clq', 'XY-123'); q.wait_for_selector('#clqinfo', timeout=5000)
    ph = q.evaluate("() => document.querySelector('p.print-only').textContent")
    check('XY-123' in ph, '530: Suche im Ausdruckkopf: ' + ph[:120])
    if SHOTS: q.screenshot(path=f'{SHOTS}/leihhandy-versicherung-1366.png')
    check(not errs, f'Versicherungsfälle: keine Skriptfehler {errs[:2]}')
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
