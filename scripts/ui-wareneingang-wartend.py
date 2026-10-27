# [CLAUDE] UI-Test (27.10.2026, Backlog 450, Folge aus 449): Nach dem Wareneingang zeigt die Seite die Aufträge dieser Werkstatt, die auf Teile
# warten, mit Vermerk; der Auftrag, dessen Vermerk die gelieferte Teilenummer (andere Schreibweise) nennt, steht oben mit „Vermerk passt“.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'ww.inhaber', 'display_name': 'WW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['ww.inhaber', 'we.inhaber', 'tl.inhaber', 'tf.inhaber', 'tv.inhaber', 'sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'ww.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'WW Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    vin = ('WDB9634031' + str(uuid.uuid4().int)[:7]); api('POST', '/api/vehicles', {'plate': f'TF-WW {tag[:3]}', 'vin': vin, 'site': 'Dortmund'})
    k = [0]
    def cmd(who, cid, action, payload=None, note=None):
        k[0] += 1; v = who('GET', f'/api/cases/{cid}')['d']['case']['version']
        b = {'action': action, 'command_id': f'ww-{tag}-{k[0]}', 'expected_version': v, 'payload': payload or {}}
        if note: b['note'] = note
        return who('POST', f'/api/cases/{cid}/commands', b)
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:5]
        ia = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Bremsbelag {n}', 'part_number': f'BB-{n}'})['d']['id']
        ids = []
        for note in [f'Lenkgetriebe, Herstellerteil (Lieferung offen) {n}', f'Bremsbelag-Satz bb {n} bestellt']:
            r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'Werkstattauftrag {n}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'workshop_site': 'DORTMUND', 'request_key': f'ww-{tag}-{n}-{len(ids)}'})
            cid = r['d']['id']; ids.append(cid)
            ok = cmd(api, cid, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'freigegeben')['s'] == 200 and cmd(wsapi, cid, 'start_repair')['s'] == 200 and cmd(wsapi, cid, 'wait_parts', {}, note)['s'] == 200
            check(ok, f'{lang}: Auftrag wartet auf Teile')
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/stock/receipt'); q.wait_for_selector('#rcf', timeout=15000); T = q.evaluate(TR)
        q.fill('#rcsup', f'Teile Süd {n}'); q.select_option('#rclines .rcl:nth-child(1) select', ia); q.fill('#rclines .rcl:nth-child(1) .rcq', '2')
        q.click('#rcbook'); q.wait_for_selector('#rcwait', timeout=10000)
        txt = q.inner_text('#rcwait')
        check(T['rcw_title'] in txt and T['act_parts_partial'] in txt, f'{lang}: Abschnitt mit Hinweis')
        lis = q.locator('#rcwait li')
        first = lis.first.inner_text()
        check(f'bb {n}' in first and T['rcw_match'] in first, f'{lang}: passender Auftrag oben, gekennzeichnet ({first[:70]!r})')
        check(f'Lenkgetriebe' in txt and q.locator('#rcwait li[data-rcwhit]').count() == 1, f'{lang}: anderer wartender Auftrag ohne Kennzeichnung')
        check(q.evaluate(noscroll), f'{lang}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wareneingang-wartend-{lang}-{w}.png', full_page=True)
        q.locator('#rcwait li[data-rcwhit] a').first.click(); q.wait_for_selector('#pwnote', timeout=10000)
        check(q.locator('button[data-act="parts_partial"]').count() == 1, f'{lang}: Link öffnet Auftrag mit „Teillieferung eingegangen“')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:1]}'); ctx.close()
        for cid in ids: cmd(wsapi, cid, 'resume_repair')
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
