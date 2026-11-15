# [CLAUDE] UI-Test Backlog 1501 (WCAG 3.3.1): Server-Prüffehler mit field_key markieren das Formularfeld (aria-invalid, Hinweis am Feld,
# Fokus) statt nur einen Toast zu zeigen – Notfall-Rufnummer (Bezeichnung zu kurz) und Fahrerakte (Name zu lang), DE/UK/EN bei 390/820/1366 px;
# Stufe 8: Fahrzeughinweis „gültig bis“, Wareneingang (Lieferant, neuer Artikel – Felder ohne name= über data-fkey).
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). CFP_SHOTS=<ordner> speichert Bildschirmfotos.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
MSG = {'de': ('Bezeichnung ist zu kurz', 'zu lang'), 'uk': ('Назва закоротка', None), 'en': ('Name is too short', None)}
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sf.inhaber', 'display_name': 'SF Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    v = api('POST', '/api/vehicles', {'vin': 'WDB9634031L123456', 'plate': 'SZ-YC 1501', 'site': 'Dortmund'})
    vid = v['d'].get('id') or v['d'].get('vehicle', {}).get('id')
    for lang in ['de', 'uk', 'en']:
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            print('—', lang, w)
            c = br.new_context(viewport={'width': w, 'height': h}, locale='de-DE'); q = c.new_page(); q.goto(B)
            errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.evaluate(JS, ['POST', '/api/login', {'username': 'sf.inhaber', 'password': PW}])
            q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            q.goto(B + '/#/emergency/edit'); q.wait_for_selector('#emf')
            q.fill('#emf [name=label]', 'D'); q.fill('#emf [name=phone]', '0123 456')
            q.click('#emf button:not([type=button])')
            q.wait_for_selector('#emf [name=label][aria-invalid=true]', timeout=8000)
            inv = q.evaluate("""() => { const el = document.querySelector('#emf [name=label]'); const d = (el.getAttribute('aria-describedby') || '').split(' ')[0];
              const p = d && document.getElementById(d); return { name: document.activeElement && document.activeElement.name, txt: p ? p.textContent : '' }; }""")
            check(MSG[lang][0] in inv['txt'], 'Hinweis am Feld „Bezeichnung“: ' + inv['txt'])
            check(inv['name'] == 'label', 'Fokus im Feld „Bezeichnung“')
            if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-notfall-{lang}-{w}.png')
            q.fill('#emf [name=label]', 'Disposition')
            check(q.eval_on_selector('#emf [name=label]', 'e => !e.hasAttribute("aria-invalid")'), 'Eingabe hebt die Markierung auf')
            if lang == 'de' and w == 390:
                q.goto(B + '/#/drivers'); q.wait_for_selector('#ndf', state='attached')
                q.evaluate("() => { const f = document.querySelector('#ndf'); f.closest('details').open = true; f.elements.display_name.value = 'N'.repeat(121); }")
                q.click('#ndf button:not([type=button])')
                q.wait_for_selector('#ndf [name=display_name][aria-invalid=true]', timeout=8000)
                check(q.evaluate("() => document.activeElement && document.activeElement.name") == 'display_name', 'Fahrerakte: Fokus im Feld „Name“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-fahrer-{lang}-{w}.png')
                # Stufe 2: Fahrzeugvertrag – km-Kontingent ohne km bei Übernahme (Prüfung zwischen Feldern, nur am Server)
                q.goto(B + '/#/vehicles/' + vid); q.wait_for_selector('#ctf', state='attached')
                q.evaluate("() => { document.querySelector('#ctf').closest('details').open = true; }")
                q.fill('#ctf [name=partner]', 'Leasing GmbH'); q.fill('#ctf [name=evidence]', 'Vertrag'); q.fill('#ctf [name=km_allowance]', '100000')
                q.click('#ctf button:not([type=button])')
                q.wait_for_selector('#ctf [name=start_km][aria-invalid=true]', timeout=8000)
                check(q.evaluate("() => document.activeElement && document.activeElement.name") == 'start_km', 'Vertrag: Fokus im Feld „km bei Übernahme“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-vertrag-{lang}-{w}.png')
                # Stufe 3: Bußgeld – Antwortfrist vor der Tatzeit
                q.goto(B + '/#/fines'); q.wait_for_selector('#nf', state='attached')
                q.evaluate("() => { document.querySelector('#nf').closest('details').open = true; }")
                q.fill('#nf [name=authority]', 'Bußgeldstelle Test'); q.fill('#nf [name=offense_at]', '2026-11-10T10:00')
                q.fill('#nf [name=plate_in_letter]', 'SZ-YC 1501'); q.fill('#nf [name=response_due]', '2026-11-01')
                q.click('#nf button:not([type=button])')
                q.wait_for_selector('#nf [name=response_due][aria-invalid=true]', timeout=8000)
                check(q.evaluate("() => document.activeElement && document.activeElement.name") == 'response_due', 'Bußgeld: Fokus im Feld „Antwortfrist“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-bussgeld-{lang}-{w}.png')
                # Stufe 8: Fahrzeughinweis „gültig bis“ in der Vergangenheit (nur am Server geprüft)
                q.goto(B + '/#/vehicles/' + vid); q.wait_for_selector('#vnf', state='attached')
                q.evaluate("() => { document.querySelector('#vnf').closest('details').open = true; }")
                q.fill('#vnf [name=text]', 'Hinweis Feld 1501'); q.fill('#vnf [name=valid_until]', '2020-01-01')
                q.click('#vnf button:not([type=button])')
                q.wait_for_selector('#vnf [name=valid_until][aria-invalid=true]', timeout=8000)
                check(q.evaluate("() => document.activeElement && document.activeElement.name") == 'valid_until', 'Fahrzeughinweis: Fokus im Feld „Gültig bis“')
                if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-hinweis-{lang}-{w}.png')
            check(not errs, 'keine Skriptfehler: ' + ' | '.join(errs))
            c.close()
    # Stufe 8: Wareneingang – Eingaben ohne name= (data-fkey): Lieferant beim Buchen, Bezeichnung beim „neu anlegen“
    env = api('GET', '/api/me')['d']['active_environment']
    u = api('POST', '/api/users', {'username': 'sf.werkstatt', 'display_name': 'SF Werkstatt', 'role': 'workshop', 'environment': env, 'workshop_site': 'DORTMUND'})
    c = br.new_context(viewport={'width': 390, 'height': 844}); q = c.new_page(); q.goto(B); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
    q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    q.evaluate(JS, ['POST', '/api/login', {'username': 'sf.werkstatt', 'password': PW}])
    item = q.evaluate(JS, ['POST', '/api/stock', {'site': 'DORTMUND', 'name': 'Ölfilter 1501', 'part_number': 'W1501'}])['d']['id']
    q.goto(B + '/#/stock/receipt'); q.wait_for_selector('#rcf', timeout=15000)
    q.select_option('#rclines .rcl:nth-child(1) select', item); q.fill('#rclines .rcl:nth-child(1) .rcq', '2')
    q.evaluate("() => { document.querySelector('#rcsup').value = 'S'.repeat(121); }")
    q.click('#rcf button:not([type=button])')
    q.wait_for_selector('#rcsup[aria-invalid=true]', timeout=8000)
    check(q.evaluate("() => document.activeElement && document.activeElement.id") == 'rcsup', 'Wareneingang: Fokus im Feld „Lieferant“ (data-fkey)')
    if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-wareneingang-de-390.png')
    q.fill('#rcsup', 'Teile Süd')
    q.click('#rclines .rcl:nth-child(1) [data-rcnew]')
    q.evaluate("() => { document.querySelector('[data-rcnname]').value = 'N'.repeat(201); }")
    q.click('[data-rcnsave]')
    q.wait_for_selector('[data-rcnname][aria-invalid=true]', timeout=8000)
    check(q.evaluate("() => document.activeElement && document.activeElement.hasAttribute('data-rcnname')"), 'Neuer Artikel: Fokus im Feld „Bezeichnung“ (data-fkey)')
    if SHOTS: q.screenshot(path=f'{SHOTS}/serverfeld-neuer-artikel-de-390.png')
    check(not errs, 'keine Skriptfehler (Wareneingang): ' + ' | '.join(errs))
    c.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
