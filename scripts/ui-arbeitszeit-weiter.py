# [CLAUDE] UI-Test (09.11.2026, Backlog 1223, Blickwinkel „Werkstatt erfasst Arbeitszeit am Ende der Schicht am Tablet“):
# Nach „Arbeitszeit erfassen“ zeigt der Vorgang „Weitere Arbeitszeit buchen“ mit den anderen Aufträgen derselben Werkstatt (in Reparatur zuerst,
# je mit den am Buchungstag schon gebuchten Stunden); Antippen öffnet den Auftrag mit dem Formular, ein nachgetragenes Datum wird übernommen;
# Aufträge einer anderen Werkstatt erscheinen nicht; „Fertig“ schließt die Liste. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Braucht den Dev-Server (frisch oder bereits benutzt); Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE = {'de': 'Weitere Arbeitszeit buchen', 'uk': 'Записати ще час роботи', 'en': 'Book more working time'}
NONE = {'de': 'noch nichts gebucht', 'uk': 'ще нічого не внесено', 'en': 'Nothing booked'}
BOOKED = {'de': 'gebucht:', 'uk': 'внесено:', 'en': 'Booked on'}
R = os.urandom(3).hex()
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '() => document.documentElement.scrollWidth <= innerWidth + 1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wx.inhaber', 'display_name': 'WX Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = 'wx.inhaber' if api('POST', '/api/login', {'username': 'wx.inhaber', 'password': PW})['s'] == 200 else None
    if not owner:  # Dev-Server schon von einem anderen Skript eingerichtet: dessen Inhaber gibt es nicht – eigenes Setup unmöglich
        for un in ['it.inhaber', 'az.inhaber', 'so.inhaber']:
            if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, f'Anmeldung Inhaber ({owner})')
    ws = 'wx.ws' + R
    u = api('POST', '/api/users', {'username': ws, 'display_name': 'WX Werkstatt', 'role': 'workshop', 'workshop_site': 'DORTMUND', 'environment': 'production'})
    if u['s'] in (200, 201): api('POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW})
    api('POST', '/api/login', {'username': owner, 'password': PW})
    sites = [w['code'] for w in api('GET', '/api/meta')['d']['workshops']]
    other = next((x for x in sites if x != 'DORTMUND'), None)
    ids = []; plates = []
    for i, (desc, site) in enumerate([('Bremse hinten links schleift', 'DORTMUND'), ('Spiegel rechts lose', 'DORTMUND'), ('Luftfederbalg undicht', 'DORTMUND'), ('Kühlgerät Fehler', other or 'DORTMUND')]):
        vin = f'WDB9634031{R[:4].upper()}{i:03d}'[:17].ljust(17, '0')
        pl = f'WX-{R[:2].upper()} {i + 1}'
        v = api('POST', '/api/vehicles', {'vin': vin, 'plate': pl, 'site': 'Dortmund'})
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': desc, 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'wx-{R}-{i}'})
        check(r['s'] in (200, 201), f'Vorgang {i + 1} angelegt ({r["s"]}, Fahrzeug {v["s"]})'); ids.append(r['d']['id']); plates.append(pl)
        c = api('GET', f'/api/cases/{ids[-1]}')['d']['case']
        api('POST', f'/api/cases/{ids[-1]}/commands', {'action': 'approve_repair', 'command_id': os.urandom(8).hex(), 'expected_version': c['version'], 'payload': {'workshop_site': site}, 'note': 'Bitte reparieren'})
    api('POST', '/api/login', {'username': ws, 'password': PW})
    for cid in ids[:2]:
        c = api('GET', f'/api/cases/{cid}')['d']['case']
        check(api('POST', f'/api/cases/{cid}/commands', {'action': 'start_repair', 'command_id': os.urandom(8).hex(), 'expected_version': c['version'], 'payload': {}})['s'] == 200, 'Reparatur begonnen')
    nos = [api('GET', f'/api/cases/{cid}')['d']['case']['case_no'] for cid in ids[:3]]
    yday = a.evaluate("() => { const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()); const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }")
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        api('PATCH', '/api/me', {'language': lang})
        c = br.new_context(viewport={'width': w, 'height': h}); q = c.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.on('dialog', lambda d: d.accept())  # Monatsanfang (Zeitreise): Rückfrage „vergangener Monat“
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': ws, 'password': PW}])
        q.goto(B + f'/#/cases/{ids[0]}'); q.wait_for_selector('button[data-act=record_work]', timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_selector('#af input[name=hours]')
        useday = yday if lang == 'en' else None
        q.fill('#af input[name=hours]', '0,5'); q.fill('#af input[name=description]', 'Bremsbeläge geprüft')
        if useday: q.fill('#af input[name=work_date]', useday); q.dispatch_event('#af input[name=work_date]', 'change')
        q.click('#af .actions button:not([type=button])')
        q.wait_for_selector('#worknext [data-wnext]', timeout=15000)
        txt = q.inner_text('#worknext')
        order = q.eval_on_selector_all('#worknext [data-wnext]', 'xs => xs.map((x) => x.dataset.wnext)')
        check(TITLE[lang] in txt, f'{lang}/{w}: Liste „{TITLE[lang]}“ nach dem Buchen')
        check(order == [ids[1], ids[2]], f'{lang}/{w}: andere Aufträge derselben Werkstatt, in Reparatur zuerst, ohne fremde Werkstatt ({len(order)})')
        check(nos[1] in txt and plates[1] in txt and ids[3] not in order, f'{lang}/{w}: Auftragsnummer und Kennzeichen stehen in der Liste')
        check(q.locator('#wnxsum').count() == 1, f'{lang}/{w}: Summe des Buchungstags')
        check(q.evaluate(noscroll), f'{lang}/{w}: ohne Querscrollen (Liste)')
        if SHOTS: q.locator('#worknext').screenshot(path=f'{SHOTS}/arbeitszeit-weiter-{lang}-{w}.png')
        # Antippen → Auftrag 2 mit offenem Formular, Datum übernommen
        q.click(f'#worknext [data-wnext="{ids[1]}"]')
        q.wait_for_function(f"() => location.hash.includes({ids[1]!r}) && document.querySelector('#af input[name=hours]')", timeout=15000)
        check(nos[1] in q.inner_text('#afcase'), f'{lang}/{w}: Formular „Arbeitszeit erfassen“ des gewählten Auftrags offen')
        dv = q.input_value('#af input[name=work_date]')
        check(dv == (useday or dv), f'{lang}/{w}: Buchungsdatum übernommen ({dv})')
        q.fill('#af input[name=hours]', '0,5'); q.fill('#af input[name=description]', 'Spiegel befestigt')
        q.click('#af .actions button:not([type=button])')
        q.wait_for_selector('#worknext [data-wnext]', timeout=15000)
        first = q.locator(f'#worknext [data-wnext="{ids[0]}"]')
        check(first.count() == 1 and BOOKED[lang] in first.inner_text(), f'{lang}/{w}: Auftrag 1 zeigt die gebuchten Stunden ({first.inner_text()[-40:] if first.count() else "-"!r})')
        third = q.locator(f'#worknext [data-wnext="{ids[2]}"]').inner_text()
        check(NONE[lang] in third or BOOKED[lang] in third, f'{lang}/{w}: Auftrag 3 mit Stand des Tages')
        q.click('#wnxclose'); q.wait_for_timeout(200)
        check(q.locator('#worknext').count() == 0, f'{lang}/{w}: „Fertig“ schließt die Liste')
        check(not errs, f'{lang}/{w}: ohne Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('FEHLER:', len(fails)) if fails else print('alles grün')
raise SystemExit(1 if fails else 0)
