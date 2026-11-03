# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 895, Blickwinkel „Fuhrparkleitung druckt auf dem Schwarz-Weiß-Laser ohne Hintergrundgrafiken“):
# Browser drucken Hintergründe standardmäßig nicht. Geprüft wird in der Druckdarstellung jeder Ansicht: kein Element mit Text,
# dessen Bedeutung nur an einer Hintergrundfarbe hängt (eigene Fläche, aber kein Rahmen und kein print-color-adjust: exact) –
# vorher standen „Kritisch“, „Gesperrt“, „überfällig“, „Widerspruch“ ohne Rahmen da, neutrale Chips mit Rahmen; Flottenbalken leer.
# Zusätzlich: kritische Chips im Druck mit kräftigerem Rahmen als neutrale, PDF wird erzeugt, Bildschirm unverändert, Link-Knöpfe im Druck ausgeblendet,
# Rufnummern (Notruf 112, Panne & Notfall) bleiben schwarz gerahmt; Gegenprobe (Druckregeln im CSSOM entfernt → rot). Inhaber + Fahrer, DE 390 / UK 820 / EN 1366. Dev-Server: CFP_URL (Port 8787).
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Elemente mit eigener (nicht weißer) Hintergrundfläche, eigenem Text und ohne Rahmen/Umriss – im Druck ohne Hintergrundgrafiken nicht erkennbar
DETECT = """() => {
  const parse = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const isBg = (c) => { const [r, g, b, a] = parse(c); return (a === undefined ? 1 : a) > 0.05 && !(r > 248 && g > 248 && b > 248); };
  const border = (s) => ['Top', 'Right', 'Bottom', 'Left'].some((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && parse(s['border' + k + 'Color'])[3] !== 0) || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0);
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    if (!el.getClientRects().length) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || !isBg(s.backgroundColor)) continue;
    if (border(s) || s.webkitPrintColorAdjust === 'exact' || s.printColorAdjust === 'exact') continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!own && el.children.length) continue;
    out.push(el.tagName.toLowerCase() + [...el.classList].map((c) => '.' + c).join('') + ' «' + (own || el.textContent.trim()).slice(0, 30) + '»');
  }
  return [...new Set(out)];
}"""
EMERG = """() => { const a = document.querySelector('#em112'); if (!a || !a.getClientRects().length) return null; const s = getComputedStyle(a);
  return [s.color, s.borderTopWidth, [...document.querySelectorAll('main a.btn:not([href^="tel:"])')].some((x) => x.getClientRects().length)]; }"""
STRIP = """() => { let n = 0; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
  for (let i = rules.length - 1; i >= 0; i--) { const r = rules[i]; if (r.media && /print/.test(r.media.mediaText) && /print-color-adjust/.test(r.cssText)) { sh.deleteRule(i); n++; } } } return n; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None, ct=None: a.evaluate(JS, [m, pa, b, ct])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'bw.inhaber', 'display_name': 'BW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['bw.inhaber', 'km.inhaber', 'da.inhaber', 'qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'dg.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    if owner is None: raise SystemExit(1)
    envn = api('GET', '/api/me')['d']['active_environment']; sfx = str(uuid.uuid4().int)[:4]
    vins = [f'WMA15SZZ2HM8{i}{sfx}' for i in range(3)]
    csv = 'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n' + '\n'.join(f'BW-Z{i} {sfx};Dortmund;MAN;2016;{v};Lkw' for i, v in enumerate(vins))
    check(api('POST', '/api/vehicles/import', csv, 'text/csv')['s'] == 200, 'Fahrzeuge importiert')
    vs = api('GET', '/api/vehicles')['d']; vl = vs.get('vehicles') if isinstance(vs, dict) else vs
    vids = [[v for v in vl if v.get('vin') == x][0]['id'] for x in vins]
    du = f'bw.fahrer{sfx}'; r = api('POST', '/api/users', {'username': du, 'display_name': 'BW Fahrer', 'role': 'driver', 'environment': envn, 'language': 'de'})
    c0 = br.new_context(); d0 = c0.new_page(); d0.goto(B); d0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}, None]); c0.close()
    uid = (r['d'].get('user') or {}).get('id') or r['d'].get('id')
    for v in vids: api('POST', f'/api/vehicles/{v}/drivers', {'user_id': uid})
    cids = []
    for i, (pr, dr) in enumerate([('kritisch', 'nicht_fahrbereit'), ('mittel', 'eingeschraenkt'), ('niedrig', 'fahrbereit')]):
        c = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[i], 'description': f'Druckprüfung {pr} {sfx}', 'priority': pr, 'driveability': dr, 'request_key': f'bw-{sfx}-{i}'})
        check(c['s'] == 201, f'Vorgang {pr}'); cids.append(c['d']['id'])
    api('POST', f'/api/vehicles/{vids[0]}/maintenance', {'kind': 'UVV', 'last_done_date': '2025-06-01', 'interval_months': 12, 'evidence': 'Druckprüfung'})
    ROUTES = {'owner': ['#/', '#/cases', '#/cases/' + cids[0], '#/cases/' + cids[1], '#/vehicles', '#/v/' + vids[0], '#/master', '#/maintenance', '#/quality', '#/plan', '#/drivers', '#/fines', '#/contracts', '#/tires', '#/stock', '#/emergency'],
              'driver': ['#/', '#/cases/' + cids[0], '#/emergency']}
    users = {'owner': owner, 'driver': du}
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        for role, routes in ROUTES.items():
            ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': users[role], 'password': PW}, None]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}, None])
            for rt in routes:
                q.goto(B + '/' + rt); q.reload(); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(900)
                scr = q.evaluate(DETECT)
                q.emulate_media(media='print'); q.evaluate("dispatchEvent(new Event('beforeprint'))"); q.wait_for_timeout(150)
                bad = q.evaluate(DETECT)
                check(not bad, f'{lang} {w}px {role} {rt.split("/")[1] or "start"}: nichts nur über Hintergrundfarbe {bad[:3]}')
                if rt.startswith('#/cases/') and role == 'owner':
                    bw = q.evaluate("() => { const k = document.querySelector('main .chip.kritisch, main .chip.gesperrt'), n = document.querySelector('main .chip:not(.kritisch):not(.gesperrt):not(.mittel):not(.ok):not(.lead)');"
                                    " return k ? [parseFloat(getComputedStyle(k).borderTopWidth), n ? parseFloat(getComputedStyle(n).borderTopWidth) : 0] : null; }")
                    if bw: check(bw[0] >= 2 and bw[0] > bw[1], f'{lang} {w}px: kritischer Chip im Druck mit kräftigerem Rahmen ({bw})')
                if rt == '#/' and role == 'owner':
                    fb = q.evaluate("() => { const s = document.querySelector('.fleetbar span'); return s ? [getComputedStyle(s).printColorAdjust || getComputedStyle(s).webkitPrintColorAdjust] : null; }")
                    if fb: check(fb[0] == 'exact', f'{lang} {w}px: Flottenbalken wird mit Farbe gedruckt')
                if rt == '#/emergency':
                    em = q.evaluate(EMERG)
                    check(em is not None and em[0] == 'rgb(0, 0, 0)' and em[1] != '0px' and not em[2], f'{lang} {w}px {role}: Notruf 112 im Druck schwarz gerahmt, andere Link-Knöpfe ausgeblendet ({em})')
                if rt == '#/cases' and role == 'owner':
                    if w == 1366: q.pdf(path='/tmp/cfp-druck-schwarzweiss.pdf', format='A4'); check(os.path.getsize('/tmp/cfp-druck-schwarzweiss.pdf') > 5000, 'PDF der Vorgangsliste erzeugt')
                    if SHOTS: q.screenshot(path=f'{SHOTS}/druck_sw_{lang}_{w}.png', full_page=True)
                    # Gegenprobe: ohne die neuen Druckregeln findet die Prüfung die farbigen Chips wieder
                    n = q.evaluate(STRIP); again = q.evaluate(DETECT)
                    check(n >= 1 and any('chip' in x for x in again), f'{lang} {w}px: Gegenprobe ohne Druckregeln rot ({n} Regel, {again[:2]})')
                q.emulate_media(media='screen'); q.evaluate("dispatchEvent(new Event('afterprint'))")
                if rt == '#/cases' and role == 'owner':
                    q.reload(); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(600)
                    check(q.evaluate("() => { const k = document.querySelector('main .chip.kritisch'); return !k || getComputedStyle(k).borderTopColor === 'rgba(0, 0, 0, 0)'; }"), f'{lang} {w}px: Bildschirm unverändert (Chip ohne Rahmen)')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'), f'{lang} {w}px {role} {rt.split("/")[1] or "start"}: ohne Querscrollen')
            check(not errs, f'{lang} {role}: ohne Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
