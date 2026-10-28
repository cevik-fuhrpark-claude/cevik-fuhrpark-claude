# [CLAUDE] UI-Test (28.10.2026, Backlog 483–487, Blickwinkel „Werkstatt-Wochenabschluss“ / „Disposition plant abends den nächsten Tag“):
# Werkstatt-Startseite zeigt „Freigegeben, Restarbeiten offen“ mit Link auf den Listenfilter (Zeile nennt „Restarbeiten: n“);
# Fahrzeugliste markiert den Werkstatttermin morgen; Druckkopf bei Filter „ruhend“ ohne technischen Schlüssel.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
tomorrow = (datetime.datetime.now(ZoneInfo('Europe/Berlin')).date() + datetime.timedelta(days=1)).isoformat()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wa.inhaber', 'display_name': 'WA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; pid = os.getpid() % 900 + 100
    def mkuser(un, role, lang, **kw):
        u = api('POST', '/api/users', {'username': un, 'display_name': un.upper(), 'role': role, 'environment': envname, 'language': lang, **kw})
        c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c0.close()
    items = [{'key': i['key'], 'result': 'ok'} for i in api('GET', '/api/meta')['d']['checklist']]
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        site = 'DORTMUND'; wsu = f'wa.ws{pid}{i}'; mkuser(wsu, 'workshop', lang, workshop_site=site)
        vin = f'WDB96340312{pid:03d}{i + 10:03d}'; plate = f'WA-AB {pid}{i}'
        check(api('POST', '/api/vehicles', {'vin': vin, 'plate': plate, 'site': 'Dortmund'})['s'] == 201, f'{lang}: Fahrzeug')
        wc = br.new_context(); wp = wc.new_page(); wp.goto(B); wp.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}])
        wapi = lambda m, pa, b=None: wp.evaluate(JS, [m, pa, b])
        def cmd(f, cid, action, payload, note=None):
            v = f('GET', f'/api/cases/{cid}')['d']['case']['version']
            body = {'action': action, 'command_id': str(uuid.uuid4()), 'expected_version': v, 'payload': payload}
            if note: body['note'] = note
            return f('POST', f'/api/cases/{cid}/commands', body)
        cid = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'Verkleidung lose WA {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})['d']['id']
        check(cmd(api, cid, 'approve_repair', {'workshop_site': site}, 'freigegeben')['s'] == 200, f'{lang}: Freigabe Werkstatt')
        check(cmd(wapi, cid, 'start_repair', {})['s'] == 200, f'{lang}: Beginn')
        check(cmd(wapi, cid, 'add_open_item', {'description': f'Halter provisorisch WA {i}'})['s'] == 200, f'{lang}: Restarbeit')
        cmd(wapi, cid, 'record_work', {'hours': 1, 'description': 'Verkleidung'})
        wapi('POST', '/api/inspections', {'kind': 'nach_reparatur', 'case_id': cid, 'request_key': str(uuid.uuid4()), 'items': items})
        cmd(wapi, cid, 'request_quality_check', {}, 'fertig')
        check(cmd(api, cid, 'technical_release', {'confirm': True}, 'Kontrolle ok')['s'] == 200, f'{lang}: technische Freigabe')
        # zweiter Auftrag mit Termin morgen (Fahrzeugliste)
        c2 = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': f'Bremse prüfen WA {i}', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': str(uuid.uuid4())})['d']['id']
        cmd(api, c2, 'approve_repair', {'workshop_site': site}, 'freigegeben')
        cmd(wapi, c2, 'acknowledge', {}); r2 = cmd(wapi, c2, 'set_planned_date', {'planned_date': tomorrow}); check(r2['s'] == 200, f'{lang}: Termin morgen {r2}')
        wc.close()
        # Werkstatt-Startseite
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.goto(B + '/#/'); q.reload()
        q.wait_for_selector('#wsoi', timeout=15000); TT = q.evaluate(TR)
        check(TT['filter_open_items'] in q.inner_text('#wsoi'), f'{lang} {w}px: Abschnitt „{TT["filter_open_items"]}“')
        row = q.locator('a.row', has_text=f'Verkleidung lose WA {i}').first
        check(row.count() == 1 and f'{TT["open_items"]}: 1' in row.inner_text(), f'{lang} {w}px: Zeile nennt offene Restarbeiten')
        check(q.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Startseite)')
        if SHOTS: q.locator('#wsoi').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wochenabschluss_start_{lang}_{w}.png')
        q.click('a[href*="f=open_items"]'); q.wait_for_selector('[data-f=open_items].on', timeout=10000)
        check(f'Verkleidung lose WA {i}' in q.inner_text('main'), f'{lang} {w}px: Listenfilter zeigt den Auftrag')
        check(not errs, f'{lang}: ohne Skriptfehler (Werkstatt) {errs[:1]}'); ctx.close()
        # Leitung: Fahrzeugliste mit „(morgen)“, Druckkopf „ruhend“
        ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
        m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); m.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        m.goto(B + '/#/vehicles'); m.reload(); m.wait_for_selector('#vl', timeout=15000); TT = m.evaluate(TR)
        vr = m.locator('#vl a.row', has_text=plate).first
        check(vr.locator('[data-tomorrow]').count() == 1 and TT['tomorrow'] in vr.inner_text(), f'{lang} {w}px: Termin morgen markiert')
        check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen (Fahrzeuge)')
        if SHOTS: vr.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/wochenabschluss_morgen_{lang}_{w}.png')
        check(not errs, f'{lang}: ohne Skriptfehler (Leitung) {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
