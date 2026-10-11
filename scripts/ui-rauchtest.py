# [CLAUDE] UI-Rauchtest: alle Ansichten je Rolle in Handy-, Tablet- und PC-Breite aufrufen
# Voraussetzung: lokaler Entwicklungsserver mit frischer In-Memory-DB (sh scripts/restart-dev.sh) und Python-Playwright.
# Aufruf: [CFP_LANG=uk|en] [CFP_SCHEME=dark] python3 scripts/ui-rauchtest.py [Ausgabeordner für Screenshots]
# Zusätzlich: Kontrast WCAG AA (Handy-Breite) und Druckansichten (A4).
# Prüft je Ansicht: keine JavaScript-Fehler, keine Fehlermeldung (rote Meldung), keine waagrechte Scrollleiste der Seite,
# Überschrift vorhanden. Nur synthetische Testdaten (Kennzeichen RT-…), nichts verlässt den Rechner.
import sys, os, datetime
from playwright.sync_api import sync_playwright

B = os.environ.get('CFP_URL', 'http://localhost:8787')
OUT = sys.argv[1] if len(sys.argv) > 1 else None
PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ROUTES = {
    'owner': ['', 'search', 'inbox', 'plan', 'cases', 'vehicles', 'master', 'more', 'maintenance', 'tires', 'kpi', 'defects', 'costs', 'stock', 'stock/reorder', 'fines', 'users', 'audit', 'usage', 'quality', 'wsload', 'telematics', 'contracts', 'claims', 'settings', 'help', 'new', 'check'],
    'fleet': ['', 'search', 'inbox', 'plan', 'cases', 'cases?f=repeat', 'vehicles', 'master', 'more', 'maintenance', 'tires', 'kpi', 'defects', 'costs', 'stock', 'stock/reorder', 'fines', 'users', 'quality', 'wsload', 'telematics', 'contracts', 'claims', 'help', 'help?s=dates'],
    'workshop': ['', 'search', 'plan', 'cases', 'cases?f=repeat', 'inbox', 'vehicles', 'more', 'maintenance', 'tires', 'stock', 'stock/reorder', 'wsload', 'help'],
    'driver': ['', 'inbox', 'cases', 'cases?f=repeat', 'new', 'check', 'check/paper', 'more', 'fines', 'help', 'help?s=check'],
    'dispatch': ['', 'search', 'inbox', 'plan', 'cases', 'vehicles', 'more', 'maintenance', 'help'],
}
# Barrierefreiheit (vereinfacht): Felder ohne zugänglichen Namen, Bilder ohne Alternativtext, Schaltflächen/Links ohne Text
A11Y = """() => {
  const out = [];
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  for (const el of document.querySelectorAll('#app input:not([type=hidden]), #app select, #app textarea')) {
    if (!visible(el)) continue;
    const named = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.title;
    if (!named) out.push(`Feld ohne Beschriftung: ${el.outerHTML.slice(0, 80)}`);
  }
  for (const el of document.querySelectorAll('#app img')) if (!el.hasAttribute('alt')) out.push(`Bild ohne alt: ${el.outerHTML.slice(0, 80)}`);
  for (const el of document.querySelectorAll('#app button, #app a[href]')) {
    if (!visible(el)) continue;
    if (!(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.title && !el.querySelector('img[alt]:not([alt=\"\"])')) out.push(`Schaltfläche/Link ohne Text: ${el.outerHTML.slice(0, 80)}`);
  }
  return out;
}"""
SIZES = [('handy', 390, 844), ('tablet', 820, 1180), ('pc', 1440, 900)]
# Kontrast (WCAG 2.1 AA): Text ≥ 4,5:1, großer Text (≥ 24 px bzw. ≥ 18,7 px fett) ≥ 3:1; Hintergrund = erster deckender Vorfahr.
# Ausgenommen: deaktivierte Elemente, Kennzeichen-Grafik (fest schwarz/weiß), Texte über Bildern.
CONTRAST = """() => {
  const out = [];
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let base = { r: 255, g: 255, b: 255 }; for (const c of stack.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; return base; };
  const seen = new Set();
  const w = document.createTreeWalker(document.querySelector('#app') || document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode.textContent.trim(); const el = w.currentNode.parentElement;
    if (!t || !el || seen.has(el) || el.offsetParent === null) continue; seen.add(el);
    if (el.closest('.plate, [disabled], .qr, .qrcard')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue;
    const fg = parse(cs.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const a = fg.a ?? 1; const f2 = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
    const L1 = lum(f2), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700; const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need - 0.05) out.push(`${ratio.toFixed(2)}:1 „${t.slice(0, 30)}“ (${el.tagName.toLowerCase()}.${el.className})`);
  }
  return out;
}"""
# Zielgröße (WCAG 2.2 AA 2.5.8: mind. 24×24 px; Werkstatt mit Handschuhen): Schaltflächen, Auswahlfelder, Eingaben, Links als Schaltfläche
TARGETS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('#app button, #app .btn, #app select, #app input:not([type=hidden]):not([type=checkbox]):not([type=radio]), #app textarea, .tabbar a')) {
    if (!(el.offsetWidth || el.offsetHeight) || el.closest('.print-only')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) out.push(`${Math.round(r.width)}×${Math.round(r.height)} ${el.tagName.toLowerCase()} „${(el.textContent || el.name || '').trim().slice(0, 25)}“`);
  }
  return out;
}"""
# Ansichten mit „Drucken / PDF“ (Präfix mit „/“ am Ende = Detailansicht mit ID)
PRINT = {
    'owner': ['cases/', 'vehicles/', 'maintenance', 'plan', 'stock/reorder', 'defects', 'vehicles/qr', 'vehicles/qr/'],
    'workshop': ['cases/', 'stock/reorder', 'plan'],
    'driver': ['check/paper'],
}
PRINT_CHECK = """() => {
  const out = [];
  const W = document.documentElement.clientWidth;
  const app = document.querySelector('#app') || document.body;
  const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.offsetWidth || el.offsetHeight || el.getClientRects().length); };
  if (document.documentElement.scrollWidth - W > 2) out.push(`Seite ${document.documentElement.scrollWidth - W}px breiter als A4`);
  let n = 0;
  for (const el of app.querySelectorAll('*')) {
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right - W > 2 && n++ < 3) out.push(`ragt ${Math.round(r.right - W)}px über den Rand: <${el.tagName.toLowerCase()} class="${el.className}">${(el.textContent || '').trim().slice(0, 40)}`);
    const cs = getComputedStyle(el);
    if (['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX) && el.scrollWidth - el.clientWidth > 2 && !el.classList.contains('plate'))
      out.push(`abgeschnitten (${el.scrollWidth - el.clientWidth}px): <${el.tagName.toLowerCase()} class="${el.className}">${(el.textContent || '').trim().slice(0, 40)}`);
  }
  for (const el of app.querySelectorAll('button, input:not([type=hidden]), select, textarea')) if (shown(el)) { out.push(`Bedienelement im Ausdruck: ${el.outerHTML.slice(0, 70)}`); break; }
  const po = [...app.querySelectorAll('.print-only')].some(shown);
  if (!po && !app.querySelector('.qrsheet, table.paper')) out.push('kein Ausdruckvermerk (print-only)');
  return out;
}"""

problems = []
with sync_playwright() as p:
    br = p.chromium.launch()
    SCHEME = os.environ.get('CFP_SCHEME', 'light')  # CFP_SCHEME=dark prüft die dunkle Darstellung
    adm = br.new_page(color_scheme=SCHEME)
    adm.goto(B)
    api = lambda m, path, body=None: adm.evaluate(JS, [m, path, body])
    st = api('GET', '/api/setup/status')['d']
    if not st.get('needs_setup'):
        sys.exit('Server ist bereits eingerichtet – bitte mit frischer In-Memory-DB neu starten (sh scripts/restart-dev.sh).')
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'rt.inhaber', 'display_name': 'Rauchtest Inhaber'})
    api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    vin = 'WDB96340310123456'
    vid = 'VIN:' + vin
    api('POST', '/api/vehicles', {'plate': 'RT-AB 101', 'vin': vin, 'site': 'Dortmund'})
    hu = api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'HU', 'last_done_date': '2026-01-10', 'interval_months': 12, 'evidence': 'Rauchtest'})
    # Geplanter Prüftermin zusätzlich zum geplanten Werkstattauftrag (+2 Tage, unten): Disposition/Werkstattplan zeigen „Fahrzeug auch geplant am …“
    pl = api('POST', f"/api/maintenance/{(hu.get('d') or {}).get('id')}/plan", {'planned_date': (datetime.date.today() + datetime.timedelta(days=5)).isoformat()})
    if pl['s'] != 200:
        problems.append(f'Vorbereitung Prüftermin planen: {pl}')
    # Prüfung mit erheblichen Mängeln ohne Folgevorgang: Fahrzeugakte zeigt „Auftrag Mängelbeseitigung“, Startseite „Heute zu tun“ den Hinweis
    uvv = api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'UVV', 'last_done_date': '2025-09-01', 'interval_months': 12, 'evidence': 'Rauchtest'})
    cp = api('POST', f"/api/maintenance/{(uvv.get('d') or {}).get('id')}/complete", {'done_date': (datetime.date.today() - datetime.timedelta(days=3)).isoformat(), 'evidence': 'Rauchtest UVV-Protokoll', 'result': 'erhebliche_maengel'})
    if cp['s'] != 200:
        problems.append(f'Vorbereitung Prüfung mit Mängeln: {cp}')
    # Pflichtprüfung ohne Ergebnis: „Heute zu tun“ der Leitung zeigt „Pflichtprüfung ohne Prüfergebnis“, Datenqualität mit Direktfilter
    sp = api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'SP', 'last_done_date': '2025-12-01', 'interval_months': 6, 'evidence': 'Rauchtest'})
    cs = api('POST', f"/api/maintenance/{(sp.get('d') or {}).get('id')}/complete", {'done_date': (datetime.date.today() - datetime.timedelta(days=2)).isoformat(), 'evidence': 'Rauchtest SP-Bericht'})
    if cs['s'] != 200:
        problems.append(f'Vorbereitung Prüfung ohne Ergebnis: {cs}')
    ROUTES['owner'] += ['quality?f=inspection_no_result']
    ROUTES['fleet'] += ['quality?f=inspection_no_result']
    ROUTES['owner'] += [f'vehicles/{vid}', f'vehicles/{vid}/timeline']
    ROUTES['fleet'] += [f'vehicles/{vid}', f'vehicles/{vid}/timeline']
    # kodierte Fahrzeug-ID (wie aus encodeURIComponent-Links) und Sprung zu einer (hier unbekannten) Durchführung
    ROUTES['workshop'] += [f"vehicles/{vid.replace(':', '%3A')}", f"vehicles/{vid.replace(':', '%3A')}?ev=unbekannt"]
    pages = {'owner': adm}
    for role, extra in [('fleet', {}), ('workshop', {'workshop_site': 'DORTMUND'}), ('driver', {}), ('dispatch', {})]:
        u = api('POST', '/api/users', {'username': f'rt.{role}', 'display_name': f'Rauchtest {role}', 'role': role, 'environment': 'production', **extra})
        if u['s'] != 201:
            sys.exit(f'Benutzer {role}: {u}')
        if role == 'driver':
            api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': u['d']['id']})
        pg = br.new_context(color_scheme=SCHEME).new_page()
        pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        pages[role] = pg
    # Fahrerakte mit Fahrerkarte und Auslesungen (synthetisch)
    drv_user = [x for x in api('GET', '/api/users')['d']['users'] if x['username'] == 'rt.driver'][0]['id']
    did = api('POST', '/api/drivers', {'display_name': 'Rauchtest Fahrer', 'personnel_no': 'RT-1', 'user_id': drv_user})['d']['id']
    api('POST', f'/api/drivers/{did}/documents', {'kind': 'fahrerkarte', 'valid_until': '2030-12-31', 'evidence': 'Rauchtest'})
    api('POST', '/api/tacho/downloads', {'kind': 'fahrerkarte', 'driver_id': did, 'downloaded_on': '2026-09-01', 'evidence': 'Rauchtest Datei C_RT.ddd'})
    api('POST', '/api/tacho/downloads', {'kind': 'massenspeicher', 'vehicle_id': vid, 'downloaded_on': '2026-08-01', 'evidence': 'Rauchtest Datei M_RT.ddd'})
    # Verträge (synthetisch): Leasing mit km-Kontingent, Kündigungstag bald; Versicherung abgelaufen (Handlungsbedarf)
    td = datetime.date.today()
    api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'leasing', 'partner': 'Rauchtest-Leasing', 'contract_no': 'RT-L-1', 'start_date': (td - datetime.timedelta(days=100)).isoformat(),
        'end_date': (td + datetime.timedelta(days=300)).isoformat(), 'notice_months': 9, 'km_allowance': 100000, 'start_km': 1000, 'monthly_rate_net': '999,5', 'evidence': 'Rauchtest Vertrag'})
    api('POST', f'/api/vehicles/{vid}/contracts', {'kind': 'versicherung', 'partner': 'Rauchtest-Versicherung', 'end_date': (td - datetime.timedelta(days=2)).isoformat(), 'evidence': 'Rauchtest Police'})
    for r in ('owner', 'fleet'):
        ROUTES[r] += ['drivers', f'drivers/{did}', 'tacho', 'vehicles/qr', f'vehicles/qr/{vid}']
    ROUTES['driver'] += ['drivers', f'new/{vid}', f'v/{vid}', f'check/{vid}']
    # Eine Meldung, damit Listen nicht leer sind
    cs = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Spiegel locker', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': 'rt-1'}])
    cid = (cs.get('d') or {}).get('case', {}).get('id') or (cs.get('d') or {}).get('id')
    if cid:
        for r in ('owner', 'fleet'):  # Werkstatt sieht den Vorgang erst nach Zuweisung
            ROUTES[r] += [f'cases/{cid}', f'inspect/{cid}']
        ROUTES['driver'] += [f'cases/{cid}']
        # Versicherungsfall am ersten Vorgang (Abschnitt im Vorgang + Übersicht „Versicherungsfälle“)
        cl = api('PUT', f'/api/cases/{cid}/claim', {'insurer': 'Rauchtest-Versicherung', 'claim_no': 'RT-S-1', 'reported_on': datetime.date.today().isoformat(), 'deductible_net': '500', 'evidence': 'Rauchtest Schadenmeldung'})
        if cl['s'] != 200:
            problems.append(f'Vorbereitung Versicherungsfall: {cl}')
        # Erstattung (Zeitleiste „Erstattung erhalten“, Kostenbericht „Versicherungserstattungen“)
        cl = api('PUT', f'/api/cases/{cid}/claim', {'status': 'reguliert', 'reimbursed_net': '300', 'reimbursed_on': datetime.date.today().isoformat(), 'evidence': 'Rauchtest Abrechnung'})
        if cl['s'] != 200:
            problems.append(f'Vorbereitung Erstattung: {cl}')
    # Meldung mit „Unfall“ ohne Versicherungsfall (Datenqualität: Hinweis mit Link auf den Vorgang)
    pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: kleiner Unfall beim Rangieren', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': 'rt-unfall'}])
    # Zweiter Vorgang, der Werkstatt zugewiesen und in Reparatur (Detailansicht + Kontrollformular aus Werkstattsicht)
    cs2 = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Bremslicht defekt', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': 'rt-2'}])
    cid2 = (cs2.get('d') or {}).get('id')
    if cid2:
        ws_site = api('GET', '/api/meta')['d']['workshops'][0]['code']
        def cmd(pg, c, action, payload=None, note=None):
            v = pg.evaluate(JS, ['GET', f'/api/cases/{c}', None])['d']['case']['version']
            return pg.evaluate(JS, ['POST', f'/api/cases/{c}/commands', {'action': action, 'command_id': f'rt-{action}-{c}', 'expected_version': v, 'note': note, 'payload': payload or {}}])
        cmd(adm, cid2, 'approve_repair', {'workshop_site': ws_site}, 'Rauchtest Umfang')
        import datetime
        cmd(pages['workshop'], cid2, 'acknowledge', {'planned_date': (datetime.date.today() + datetime.timedelta(days=2)).isoformat()})
        r = cmd(pages['workshop'], cid2, 'start_repair')
        if r['s'] == 200:
            ROUTES['workshop'] += [f'cases/{cid2}', f'inspect/{cid2}']
        else:
            problems.append(f'Vorbereitung Werkstattvorgang: {r}')
        # Werkstattplan „Ohne Termin“: ein übernommener Auftrag (direkt planbar) und ein noch nicht übernommener
        for key, desc, ack in (('rt-3', 'Rauchtest: Wischerblatt', True), ('rt-4', 'Rauchtest: Kennzeichenleuchte', False)):
            cx = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': desc, 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': key}])
            cxid = (cx.get('d') or {}).get('id')
            if not cxid:
                problems.append(f'Vorbereitung Werkstattplan: {cx}'); continue
            cmd(adm, cxid, 'approve_repair', {'workshop_site': ws_site}, 'Rauchtest Umfang')
            if ack:
                cmd(pages['workshop'], cxid, 'acknowledge')
        # Werkstatttermin gestern, Reparatur nicht begonnen („Heute zu tun“ Leitung, Plan „Termin überschritten“)
        cx = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Termin verpasst', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': 'rt-5'}])
        if (cx.get('d') or {}).get('id'):
            cmd(adm, cx['d']['id'], 'approve_repair', {'workshop_site': ws_site, 'planned_date': (datetime.date.today() - datetime.timedelta(days=1)).isoformat()}, 'Rauchtest Umfang')
        # Wartet auf Teile mit Liefertermin (Vorgang, Listen, Disposition „Nicht einplanen“, Heute zu tun)
        cx = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Luftfederbalg', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': 'rt-6'}])
        c6 = (cx.get('d') or {}).get('id')
        if c6:
            cmd(adm, c6, 'approve_repair', {'workshop_site': ws_site}, 'Rauchtest Umfang')
            cmd(pages['workshop'], c6, 'start_repair')
            r = cmd(pages['workshop'], c6, 'wait_parts', {'parts_expected_date': (datetime.date.today() + datetime.timedelta(days=1)).isoformat()}, 'Rauchtest Balg bestellt')
            if r['s'] == 200:
                for rr in ('owner', 'fleet', 'workshop'):
                    ROUTES[rr] += [f'cases/{c6}']
            else:
                problems.append(f'Vorbereitung Wartet auf Teile: {r}')
            # Werkstatttermin heute, Teile erst morgen → Werkstattplan zeigt „Termin vor Liefertermin der Teile“
            cmd(pages['workshop'], c6, 'set_planned_date', {'planned_date': datetime.date.today().isoformat()})
        # Abgeschlossenes Warten auf Teile mit Liefertermin → Kennzahlen „Termintreue Teile-Liefertermine“ (eingehalten)
        cx = pages['driver'].evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Rauchtest: Spiegelglas', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': 'rt-7'}])
        c7 = (cx.get('d') or {}).get('id')
        if c7:
            cmd(adm, c7, 'approve_repair', {'workshop_site': ws_site}, 'Rauchtest Umfang')
            cmd(pages['workshop'], c7, 'start_repair')
            cmd(pages['workshop'], c7, 'wait_parts', {'parts_expected_date': (datetime.date.today() + datetime.timedelta(days=3)).isoformat()}, 'Rauchtest Glas bestellt')
            r = cmd(pages['workshop'], c7, 'resume_repair')
            if r['s'] != 200:
                problems.append(f'Vorbereitung Termintreue Teile: {r}')
            # Kosten-Freigabegrenze (synthetisch 100 €): Teil 250 € → „Kostenfreigabe ausstehend“ (Leitung mit Beträgen, Werkstatt ohne)
            api('PUT', '/api/settings', {'repair_cost_limit_net': 100})
            r = cmd(pages['workshop'], c7, 'add_part', {'name': 'Rauchtest Spiegelglas', 'quantity': 1, 'unit_price_net': 250})
            if r['s'] != 200 or not r['d'].get('cost_limit_exceeded'):
                problems.append(f'Vorbereitung Kostengrenze: {r}')
            for rr in ('owner', 'fleet', 'workshop'):
                ROUTES[rr] += [f'cases/{c7}']
        # Werkstattauftrag aus dem HU-Prüftermin (Fahrzeugakte zeigt Link, Vorgang zeigt Hinweis „Auftrag aus Prüftermin“)
        mo = api('POST', f"/api/maintenance/{(hu.get('d') or {}).get('id')}/order", {'workshop_site': ws_site, 'note': 'Rauchtest HU', 'request_key': 'rt-mo-1'})
        if mo['s'] != 201:
            problems.append(f'Vorbereitung Auftrag aus Prüftermin: {mo}')
        else:
            for rr in ('owner', 'fleet', 'workshop'):
                ROUTES[rr] += [f"cases/{mo['d']['id']}"]
    # Bußgeld und Lagerartikel für die Detailansichten
    fn = api('POST', '/api/fines', {'kind': 'anhoerung', 'authority': 'Rauchtest Bußgeldstelle', 'reference': 'RT-AZ-1', 'offense_type': 'geschwindigkeit', 'offense_at': '2026-09-01T08:00:00Z', 'location': 'Rauchtest', 'plate_in_letter': 'RT-AB 101', 'amount_eur': 70, 'response_due': '2026-12-01'})
    if fn['s'] in (200, 201):
        for r in ('owner', 'fleet'):
            ROUTES[r] += [f"fines/{fn['d']['id']}"]
    else:
        problems.append(f'Vorbereitung Bußgeld: {fn}')
    st = pages['workshop'].evaluate(JS, ['POST', '/api/stock', {'name': 'Rauchtest Bremsbelag', 'part_number': 'RT-1', 'initial_qty': 3, 'min_qty': 1}])
    if st['s'] in (200, 201):
        sid = st['d'].get('id') or st['d'].get('item', {}).get('id')
        ROUTES['workshop'] += [f'stock/{sid}']
        ROUTES['owner'] += [f'stock/{sid}']
    else:
        problems.append(f'Vorbereitung Lager: {st}')

    # Mehr Inhalt für Listen und Druckansichten: zweites Fahrzeug mit überfälligen Prüfungen, Abfahrtskontrolle mit Mängeln,
    # Lagerartikel unter Mindestbestand (alles synthetisch)
    vin2 = 'WDB96340310654321'
    api('POST', '/api/vehicles', {'plate': 'RT-CD 2022', 'vin': vin2, 'site': 'Dortmund Logistikzentrum Hafen Nord', 'manufacturer': 'Mercedes-Benz', 'model': 'Actros 1845 LS Sattelzugmaschine'})
    for kind, d, m in [('UVV', '2025-06-01', 12), ('Tachograph', '2024-08-15', 24), ('Sonstiges', '2025-01-01', 6)]:
        api('POST', f'/api/vehicles/VIN:{vin2}/maintenance', {'kind': kind, 'last_done_date': d, 'interval_months': m, 'evidence': 'Rauchtest Prüfbericht mit sehr langer Nachweisbezeichnung Nr. 2025-000123'})
    api('POST', f'/api/vehicles/{vid}/maintenance', {'kind': 'UVV', 'last_done_date': '2025-10-20', 'interval_months': 12, 'evidence': 'Rauchtest'})
    keys = [i['key'] for i in api('GET', '/api/meta')['d']['checklist']]
    ck = pages['driver'].evaluate(JS, ['POST', '/api/inspections', {'kind': 'abfahrt', 'vehicle_id': vid, 'request_key': 'rt-chk-1', 'items': [{'key': k, 'result': 'mangel' if i < 2 else 'ok', 'note': 'Rauchtest: Mangel mit ausführlicher Beschreibung, damit lange Texte im Ausdruck umbrechen müssen' if i < 2 else None} for i, k in enumerate(keys)]}])
    if ck['s'] != 201:
        problems.append(f'Vorbereitung Abfahrtskontrolle: {ck}')
    st2 = pages['workshop'].evaluate(JS, ['POST', '/api/stock', {'name': 'Rauchtest Luftfilter Fahrerhaus mit langer Artikelbezeichnung', 'part_number': 'RT-A0000903400-LANG', 'initial_qty': 1, 'min_qty': 6, 'unit_price_net': 12.5}])
    ROUTES['owner'] += [f'vehicles/VIN:{vin2}']
    if st2['s'] not in (200, 201):
        problems.append(f'Vorbereitung Lager 2: {st2}')

    # Sprache für alle Rauchtest-Konten (CFP_LANG=uk|en): lange ukrainische Texte dürfen das Layout nicht sprengen
    LANG = os.environ.get('CFP_LANG')
    if LANG:
        for pg in pages.values():
            r = pg.evaluate(JS, ['PATCH', '/api/me', {'language': LANG}])
            if r['s'] != 200:
                sys.exit(f'Sprache {LANG}: {r}')
    for role, pg in pages.items():
        errors = []
        pg.on('pageerror', lambda e, errors=errors: errors.append(str(e)))
        pg.on('console', lambda m, errors=errors: errors.append('CSP: ' + m.text) if 'Content Security Policy' in m.text else None)
        for name, w, h in SIZES:
            pg.set_viewport_size({'width': w, 'height': h})
            for r in ROUTES[role]:
                errors.clear()
                pg.goto(f'{B}/#/{r}')
                pg.wait_for_timeout(500)
                where = f'{role} {name} #/{r}'
                if errors:
                    problems.append(f'{where}: JS-Fehler {errors[:2]}')
                if pg.locator('#rl').count():
                    problems.append(f'{where}: Ansicht abgebrochen „{pg.locator(".panel.alert").first.text_content()}“')
                err = pg.locator('.toast.err')
                if err.count():
                    problems.append(f'{where}: Fehlermeldung „{err.first.text_content()}“')
                if not pg.locator('h1').count():
                    problems.append(f'{where}: keine Überschrift')
                # Route nicht gefunden → App springt auf die Startseite (außer die Ansicht selbst leitet bewusst weiter)
                if r and pg.evaluate('location.hash') in ('', '#/') :
                    problems.append(f'{where}: auf Startseite umgeleitet (Route fehlt?)')
                if name == 'handy':
                    low = pg.evaluate(CONTRAST)
                    if low:
                        problems.append(f'{where}: Kontrast zu gering {low[:3]}')
                    small = pg.evaluate(TARGETS)
                    if small:
                        problems.append(f'{where}: Bedienelement kleiner als 24 px {small[:3]}')
                    a11y = pg.evaluate(A11Y)
                    if a11y:
                        problems.append(f'{where}: Barrierefreiheit {a11y[:3]}')
                if LANG and name == 'handy':
                    # deutsche Reste in der Oberfläche; ausgenommen: Testdaten, Werkstattnamen, Gesetzeszitate, CSV-Spaltenköpfe (Dateiformat)
                    de = pg.evaluate(r"""() => { const out = []; const w = document.createTreeWalker(document.querySelector('#app') || document.body, NodeFilter.SHOW_TEXT);
                      while (w.nextNode()) { const x = w.currentNode.textContent.trim(); const el = w.currentNode.parentElement;
                        if (x && /[äöüßÄÖÜ]/.test(x) && !/Bußgeldstelle|StVZO|Rauchtest|;|^Werkstatt [A-ZÄÖÜ]/.test(x) && el && el.offsetParent !== null) out.push(x.slice(0, 60)); } return out; }""")
                    if de:
                        problems.append(f'{where}: deutscher Text in {LANG}: {de[:4]}')
                over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                if over > 2:
                    problems.append(f'{where}: Seite {over}px breiter als der Bildschirm')
                if OUT and name == 'handy':
                    os.makedirs(OUT, exist_ok=True)
                    pg.screenshot(path=os.path.join(OUT, f"{role}_{r.replace('/', '_').replace(':', '') or 'start'}.png"), full_page=True)
    # Druckansichten: Druckmodus in A4-Hochformat-Breite (190 mm Inhalt ≈ 718 px); prüft abgeschnittene Tabellen/Inhalte,
    # waagrechtes Überlaufen, sichtbare Bedienelemente im Ausdruck, Ausdruckvermerk vorhanden.
    print_routes = []
    for role in PRINT:
        for r in ROUTES[role]:
            base = r.split('?')[0]
            if any(base == x or (x.endswith('/') and base.startswith(x) and base.count('/') == x.count('/')) for x in PRINT[role]):
                print_routes.append((role, r))
    for role, r in print_routes:
        pg = pages[role]
        pg.set_viewport_size({'width': 718, 'height': 1000})
        pg.emulate_media(media='screen')
        pg.goto(f'{B}/#/{r}')
        pg.wait_for_timeout(500)
        base = r.split('?')[0]
        if base == 'maintenance':
            pg.click('[data-mf=all]')
            pg.wait_for_timeout(300)
        pg.emulate_media(media='print')
        pg.wait_for_timeout(100)
        where = f'{role} Druck #/{r}'
        res = pg.evaluate(PRINT_CHECK)
        for x in res:
            problems.append(f'{where}: {x}')
        if OUT:
            os.makedirs(OUT, exist_ok=True)
            pg.pdf(path=os.path.join(OUT, f"druck_{role}_{r.replace('/', '_').replace(':', '')}.pdf"), format='A4')
        pg.emulate_media(media='screen')
    br.close()

n = sum(len(v) for v in ROUTES.values()) * len(SIZES)
print(f'{n} Ansichten geprüft, {len(print_routes)} Druckansichten, {len(problems)} Auffälligkeiten')
for x in problems:
    print('  - ' + x)
sys.exit(1 if problems else 0)
