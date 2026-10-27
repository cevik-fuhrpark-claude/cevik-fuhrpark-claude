# [CLAUDE] UI-Test (27.10.2026, Backlog 441, Blickwinkel „Rückruf eines Teilelieferanten: an welchen Lkw ist Teil X verbaut?“):
# Leitung öffnet Lager → „Teile-Verwendung (Rückruf)“, sucht die Teilenummer in anderer Schreibweise und findet den Einbau mit Fahrzeug,
# Vorgang, Lieferant, Gewährleistung; aus der Artikelakte „Wo verbaut?“ ist die Suche vorbelegt; Werkstatt eines anderen Standorts findet
# nichts; Backlog 442: Leitung erfasst die gefundenen Fahrzeuge als offenen Rückruf (Vorschau → Übernehmen). DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787);
# Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tv.inhaber', 'display_name': 'TV Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['tv.inhaber', 'sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    users = {}
    for site in ['DORTMUND', 'MUENCHEN']:
        un = f'tv.ws.{site.lower()}.{tag}'
        u = api('POST', '/api/users', {'username': un, 'display_name': f'TV Werkstatt {site}', 'role': 'workshop', 'environment': envname, 'workshop_site': site})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        users[site] = (un, q0)
    wsapi = lambda m, pa, b=None: users['DORTMUND'][1].evaluate(JS, [m, pa, b])
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:5]; pn = f'81.{n}-6195'; plate = f'TV-A {n[:3]}'
        vin = 'WDB9634031C' + str(uuid.uuid4().int)[:6]
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] in (200, 201), f'{lang}: Fahrzeug')
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Spiel in der Lenkung', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})
        cid = r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        ver = lambda: api('GET', f'/api/cases/{cid}')['d']['case']['version']
        cmd = lambda f, action, payload={}, note=None: f('POST', f'/api/cases/{cid}/commands', {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': ver(), 'payload': payload, **({'note': note} if note else {})})
        check(cmd(api, 'approve_repair', {'workshop_site': 'DORTMUND'}, 'Spurstange tauschen')['s'] == 200, f'{lang}: freigegeben')
        check(cmd(wsapi, 'acknowledge')['s'] == 200 and cmd(wsapi, 'start_repair')['s'] == 200, f'{lang}: Werkstatt übernimmt')
        check(cmd(wsapi, 'add_part', {'name': 'Spurstangenkopf', 'part_number': pn, 'quantity': 1, 'supplier': f'Teile Nord {n}', 'document_ref': f'LS-{n}', 'warranty_until': '2028-06-30'})['s'] == 200, f'{lang}: Teil')
        st = api('POST', '/api/stock', {'site': 'DORTMUND', 'name': 'Spurstangenkopf', 'part_number': pn, 'unit': 'Stk'})
        check(st['s'] == 201, f'{lang}: Lagerartikel {st}')
        sid = st['d'].get('id') or st['d'].get('item', {}).get('id')
        cno = api('GET', f'/api/cases/{cid}')['d']['case']['case_no']
        api('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.evaluate("sessionStorage.removeItem('cfp_pu_q')")
        q.goto(B + '/#/stock'); q.wait_for_selector('#spu', timeout=15000); T = q.evaluate(TR)
        check(q.inner_text('#spu').strip() == T['ptu_title'], f'{lang}: Knopf in der Lagerliste')
        q.click('#spu'); q.wait_for_selector('#puq', timeout=10000)
        check(T['ptu_hint'] in q.inner_text('#app'), f'{lang}: Hinweis Leitung')
        q.fill('#puq', pn.replace('.', ' ').replace('-', '')); q.click('#puf button.btn:not(.secondary)')
        q.wait_for_selector(f'#putab a[href="#/cases/{cid}"]', timeout=10000); q.wait_for_timeout(300)
        txt = q.inner_text('#putab')
        check(q.locator('#putab tbody tr').count() == 1 and plate in txt and cno in txt and f'Teile Nord {n}' in txt and f'LS-{n}' in txt, f'{lang}: Einbau mit Fahrzeug, Vorgang, Lieferant, Beleg')
        check(T['ptu_sum'].replace('{n}', '1').replace('{v}', '1') in q.inner_text('#pusum'), f'{lang}: Zusammenfassung')
        check(q.is_enabled('#pucsv') and q.is_enabled('#puprt'), f'{lang}: CSV/Drucken aktiv')
        check(q.evaluate(noscroll), f'{lang}: ohne Querscrollen')
        # Backlog 442: gefundene Fahrzeuge als offenen Rückruf erfassen (Vorschau → Übernehmen), danach in der Fahrzeugakte offen
        q.click('#purc summary'); q.wait_for_selector('#purcref', timeout=5000)
        check(q.locator('#purcpick input[name=purcveh]:checked').count() == 1, f'{lang}: Fahrzeug vorgewählt')
        q.click('#purcprev'); q.wait_for_timeout(300)
        check(q.locator('#purctab').count() == 0, f'{lang}: ohne Referenz keine Vorschau')
        q.fill('#purcref', f'TN-RS {n}'); q.fill('#purcnote', 'Spurstangenkopf tauschen'); q.click('#purcprev')
        q.wait_for_selector('#purcapply', timeout=10000)
        check(plate in q.inner_text('#purctab') and T['ia_neu'] in q.inner_text('#purctab'), f'{lang}: Vorschau „neu“')
        check(q.evaluate(noscroll), f'{lang}: Rückruf-Bereich ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/teileverwendung-{lang}-{w}.png', full_page=True)
        q.click('#purcapply'); q.wait_for_selector('#purcres a[href="#/maintenance"]', timeout=10000)
        mr = [m for m in (api('GET', f'/api/vehicles/VIN:{vin}')['d'].get('maintenance') or []) if m['kind'] == 'Rückruf']
        check(len(mr) == 1 and mr[0]['evidence'].startswith(f'TN-RS {n}') and not mr[0]['next_due_date'], f'{lang}: Rückruf offen in der Akte, ohne Frist')
        # Artikelakte → „Wo verbaut?“ belegt die Suche mit der Teilenummer vor
        q.evaluate("sessionStorage.removeItem('cfp_pu_q')")
        q.goto(B + f'/#/stock/{sid}'); q.wait_for_selector('#itempu', timeout=15000)
        check(q.inner_text('#itempu').strip() == T['ptu_item_btn'], f'{lang}: Knopf in der Artikelakte')
        q.click('#itempu'); q.wait_for_selector(f'#putab a[href="#/cases/{cid}"]', timeout=10000)
        check(q.input_value('#puq') == pn, f'{lang}: Suche vorbelegt')
        q.fill('#puq', 'zzz-kein-teil'); q.click('#puf button.btn:not(.secondary)'); q.wait_for_selector('#punone', timeout=10000)
        check(T['ptu_none'] in q.inner_text('#punone') and not q.is_enabled('#pucsv'), f'{lang}: kein Treffer, CSV aus')
        check(not errs, f'{lang}: keine Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
        # Werkstatt München: Auftrag aus Dortmund nicht sichtbar
        un, q0 = users['MUENCHEN']; q0.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.evaluate("sessionStorage.setItem('cfp_pu_q', %r)" % pn)
        q.goto(B + '/#/stock/usage'); q.wait_for_selector('#puq', timeout=15000); T = q.evaluate(TR)
        q.wait_for_selector('#punone', timeout=10000)
        check(T['ptu_hint_ws'] in q.inner_text('#app'), f'{lang}: Hinweis Werkstatt')
        check(q.locator('#putab').count() == 0, f'{lang}: Werkstatt München sieht den Dortmunder Einbau nicht')
        q.evaluate("sessionStorage.setItem('cfp_pu_q', 'Spurstangenkopf')"); q.goto(B + '/#/stock'); q.wait_for_selector('#spu', timeout=15000); q.click('#spu'); q.wait_for_selector('#puq', timeout=10000); q.wait_for_timeout(800)
        check(q.locator('#purc').count() == 0, f'{lang}: Werkstatt ohne Rückruf-Erfassung')
        check(q.evaluate(noscroll), f'{lang}: Werkstatt ohne Querscrollen')
        check(not errs, f'{lang}: keine Skriptfehler (Werkstatt) {errs[:1]}'); ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
