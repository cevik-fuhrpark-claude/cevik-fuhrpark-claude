# [CLAUDE] UI-Test (04.11.2026, Backlog 1000, Folge aus 999, Blickwinkel „Rückrufschreiben/Lieferschein per Post, Nummer anders geschrieben“):
# Leitung öffnet Lager → „Teile-Verwendung (Rückruf)“ und findet den Einbau über den Beleg „RE-<n>/0815“, eingegeben als „re <n> 0815“,
# sowie über die Teilenummer „A 000 <n> 12 20“, eingegeben mit Unter- und Gedankenstrichen. DE/UK/EN bei 390/820/1366 px, Hinweis je Sprache,
# kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tb.inhaber', 'display_name': 'TB Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['tb.inhaber', 'tz.inhaber', 'tv.inhaber', 'nw.inhaber', 'sr.inhaber', 'th.inhaber', 'ab.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    un = f'tb.ws.{tag}'
    u = api('POST', '/api/users', {'username': un, 'display_name': 'TB Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    n = str(uuid.uuid4().int)[:4]; plate = f'TB-A {n[:3]}'; vin = 'WDB9634031C' + str(uuid.uuid4().int)[:6]
    check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] in (200, 201), 'Fahrzeug')
    r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Bremse quietscht', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
    cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
    cmd = lambda f, action, payload={}, note=None: f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': payload, **({'note': note} if note else {})})
    check(cmd(api, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Bremse')['s'] == 200, 'freigegeben')
    check(cmd(wsapi, 'acknowledge')['s'] == 200 and cmd(wsapi, 'start_repair')['s'] == 200, 'Werkstatt übernimmt')
    check(cmd(wsapi, 'add_part', {'name': 'Bremsbelag', 'part_number': f'A 000 {n} 12 20', 'quantity': 1, 'supplier': 'Teile Nord KG', 'document_ref': f'RE-{n}/0815'})['s'] == 200, 'Teil')
    for lang in ['de', 'uk', 'en']:
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            api('PATCH', '/api/me', {'language': lang})
            ctx = br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
            q.evaluate("sessionStorage.removeItem('cfp_pu_q')")
            q.goto(B + '/#/stock'); q.wait_for_selector('#spu', timeout=15000); T = q.evaluate(TR)
            q.click('#spu'); q.wait_for_selector('#puq', timeout=10000)
            check(T['ptu_hint'] in q.inner_text('#app') and 're 2026 0815' in T['ptu_hint'], f'{lang} {w}px: Hinweis nennt die Schreibweise')
            for qq, what in [(f're {n} 0815', 'Beleg'), (f'A000_{n}–12–20', 'Teilenummer')]:
                q.fill('#puq', qq); q.click('#puf button.btn:not(.secondary)')
                try: q.wait_for_selector(f'#putab a[href="#/cases/{cid}"]', timeout=10000); hit = True
                except Exception: hit = False
                check(hit and f'RE-{n}/0815' in q.inner_text('#putab'), f'{lang} {w}px: {what} „{qq}“ findet den Einbau')
            if SHOTS: q.screenshot(path=f'{SHOTS}/teile-beleg-{lang}-{w}.png', full_page=True)
            check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
            check(not errs, f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
