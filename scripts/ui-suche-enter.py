# [CLAUDE] UI-Test (09.11.2026, Backlog 1232, Folge aus 1231 „Barcode-Scanner/Enter“): In der globalen Suche sucht Enter sofort (ohne die
# 300-ms-Pause abzuwarten); genau ein Treffer (Hilfe-Abschnitte zählen nicht) wird geöffnet – Teilenummer ohne Leerzeichen → Artikelakte,
# eindeutiges Kennzeichen → Fahrzeugakte; mehrere Treffer → Seite bleibt, Suchtext markiert (nächste Eingabe ersetzt ihn).
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SELALL = "(s) => { const e = document.querySelector(s); return !!e && document.activeElement === e && e.selectionStart === 0 && e.selectionEnd === e.value.length && e.value.length > 0; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def wait_hash(q, want):
    for _ in range(50):  # kein wait_for_function (eval – CSP der App)
        if q.evaluate('() => location.hash') == want: return True
        q.wait_for_timeout(200)
    return False
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'se.inhaber', 'display_name': 'SE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['se.inhaber', 'bs.inhaber', 'st.inhaber', 'wn.inhaber', 'tl.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    pid = int(uuid.uuid4().int % 10**7); tag = uuid.uuid4().hex[:4]
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = f'{(pid + i) % 9000 + 1000}'
        plate = f'QX-E {n}'; vin = f'WDB9634032{pid % 1000000:06d}{i}'[:17]
        r = api('POST', '/api/vehicles', {'plate': plate, 'vin': vin, 'site': 'Dortmund'}); check(r['s'] in (200, 201), f'{lang}: Fahrzeug angelegt')
        api('POST', '/api/vehicles', {'plate': f'QX-E {n}1', 'vin': vin[:-1] + 'Z', 'site': 'Dortmund'})  # zweites Fahrzeug mit gleichem Anfang
        pn = f'B 412 {n[:2]} {n[2:]} 7'; scan = pn.replace(' ', '')
        it = api('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Kupplungsscheibe {tag}{i}', 'part_number': pn, 'initial_qty': '1'})
        check(it['s'] == 201, f'{lang}: Lagerartikel angelegt'); iid = it['d']['id']
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/search'); q.reload(); q.wait_for_selector('#gq', timeout=15000)
        q.fill('#gq', ''); q.click('#gq'); q.keyboard.type(scan, delay=3); q.keyboard.press('Enter')
        check(wait_hash(q, f'#/stock/{iid}'), f'{lang}: Teilenummer ohne Leerzeichen + Enter öffnet den Artikel')
        q.goto(B + '/#/search'); q.wait_for_selector('#gq', timeout=15000); q.fill('#gq', ''); q.click('#gq')
        q.keyboard.type(f'QX-E {n}', delay=3); q.keyboard.press('Enter'); q.wait_for_timeout(1200)
        check(q.evaluate('() => location.hash') == '#/search' and q.evaluate(SELALL, '#gq'), f'{lang}: zwei Fahrzeuge → Seite bleibt, Suchtext markiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/suche-enter-{lang}-{w}.png')
        q.keyboard.type(f'QX-E {n}1')
        check(q.input_value('#gq') == f'QX-E {n}1', f'{lang}: nächste Eingabe ersetzt den Suchtext')
        q.keyboard.press('Enter')
        vid = r['d'].get('id') if r['d'] else None
        okv = False
        for _ in range(50):
            hh = q.evaluate('() => location.hash'); okv = hh.startswith('#/vehicles/')
            if okv: break
            q.wait_for_timeout(200)
        check(okv, f'{lang}: eindeutiges Kennzeichen + Enter öffnet die Fahrzeugakte')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), f'{lang}: ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
