# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1492, Blickwinkel „Leitung druckt am A4-Drucker mit großer Systemschrift“):
# Browser-Grundschrift per CDP (Page.setFontSizes, wie „Sehr groß“ in Chrome bzw. große Android-Systemschrift) 24/28/32 px, Druckdarstellung
# in A4-Druckbreite (718 CSS-px = 210 mm − 2 × 10 mm): kein Element ragt rechts über das Blatt, kein Wort zerbricht. Vorher ragte der
# Papiervordruck der Abfahrtskontrolle bei 32 px 68 px über den Rand (Spalte „Mangel beschreiben“ abgeschnitten), HU/SP der Fahrzeugakte
# standen nebeneinander und zerbrachen „Hauptuntersuchung“, „Nachweis / Quelle“, UK „Підтвердження“. Zusätzlich: echtes A4-PDF des
# Vordrucks, HU/SP bei 16 px weiter nebeneinander, bei 32 px untereinander; Gegenprobe (neue Druckregeln entfernt → Überstand). Dev-Server: CFP_URL.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
W = 718
OVER = """(W) => { const out = [];
  for (const el of document.querySelectorAll('main *')) { if (!el.getClientRects().length) continue; const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > W + 2) out.push(el.tagName.toLowerCase() + [...el.classList].map((c) => '.' + c).join('') + ' r=' + Math.round(r.right) + ' «' + (el.textContent || '').trim().slice(0, 30) + '»'); }
  return [document.documentElement.scrollWidth, out.slice(0, 4)]; }"""
SPLIT = r"""() => { const out = []; const root = document.querySelector('main'); if (!root) return out;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const rg = document.createRange();
  while (w.nextNode()) { const n = w.currentNode; const el = n.parentElement; if (!el || !el.getClientRects().length || el.closest('.plate, code, pre, .mono, [data-raw]')) continue;
    if (getComputedStyle(el).hyphens === 'auto') continue;
    const re = /(?<![^\s(„"'])[\p{L}]{4,24}(?=$|[\s,.:;!?)“"'])/gu; let m; const x = n.textContent;
    while ((m = re.exec(x))) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const tops = new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
      if (tops.size > 1) out.push(m[0] + ' ← ' + x.trim().slice(0, 40)); } }
  return out.slice(0, 4); }"""
STRIP = """() => { let n = 0; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; }
  for (let i = rules.length - 1; i >= 0; i--) { const r = rules[i]; if (r.media && /print/.test(r.media.mediaText) && /paper-head|grid2/.test(r.cssText) && /14em|18em/.test(r.cssText)) { sh.deleteRule(i); n++; } } } return n; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None, ct=None: a.evaluate(JS, [m, pa, b, ct])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'dg.inhaber', 'display_name': 'DG Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['dg.inhaber', 'bw.inhaber', 'km.inhaber', 'da.inhaber', 'qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    if owner is None: raise SystemExit(1)
    sfx = str(uuid.uuid4().int)[:4]; vins = [f'WMA15SZZ2HM9{i}{sfx}' for i in range(2)]
    csv = 'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n' + '\n'.join(f'GS-D{i} {sfx};Dortmund;MAN;2016;{v};Lkw' for i, v in enumerate(vins))
    check(api('POST', '/api/vehicles/import', csv, 'text/csv')['s'] == 200, 'Fahrzeuge importiert')
    vl = api('GET', '/api/vehicles')['d']; vl = vl.get('vehicles') if isinstance(vl, dict) else vl
    vids = [[v for v in vl if v.get('vin') == x][0]['id'] for x in vins]
    c = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vins[0], 'description': f'Bremsleitung undicht hinten links {sfx}', 'priority': 'kritisch', 'driveability': 'nicht_fahrbereit', 'request_key': f'gs-{sfx}'})
    check(c['s'] == 201, 'Vorgang angelegt'); cid = c['d']['id']
    api('POST', f'/api/vehicles/{vids[0]}/maintenance', {'kind': 'UVV', 'last_done_date': '2025-06-01', 'interval_months': 12, 'evidence': 'Druckprüfung große Schrift'})
    ROUTES = ['', 'cases', 'cases/' + cid, 'vehicles', 'vehicles/' + vids[0], 'maintenance', 'check/paper', 'quality', 'kpi', 'costs', 'drivers', 'fines', 'contracts', 'emergency']
    def page(lang, fs):
        ctx = br.new_context(viewport={'width': W, 'height': 1000}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        cdp = ctx.new_cdp_session(q); cdp.send('Page.enable'); q.setfs = lambda: cdp.send('Page.setFontSizes', {'fontSizes': {'standard': fs, 'fixed': max(13, int(fs * 13 / 16))}}); q.setfs(); q.cdp = cdp
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}, None]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}, None])
        return ctx, q, errs
    def open_print(q, rt):
        q.emulate_media(media='screen'); q.goto(B + '/#/' + rt); q.reload(); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(700)
        q.emulate_media(media='print'); q.evaluate("dispatchEvent(new Event('beforeprint'))"); q.wait_for_timeout(150)
    for lang, fs in [('de', 32), ('uk', 24), ('en', 28), ('uk', 32)]:
        ctx, q, errs = page(lang, fs)
        check(q.evaluate("parseFloat(getComputedStyle(document.documentElement).fontSize)") == fs, f'{lang} {fs}px: Grundschrift wirkt')
        for rt in ROUTES:
            open_print(q, rt)
            check(q.evaluate("parseFloat(getComputedStyle(document.documentElement).fontSize)") == fs, f'{lang} {fs}px {rt or "start"}: Grundschrift wirkt')
            sw, over = q.evaluate(OVER, W); sp = q.evaluate(SPLIT)
            check(sw <= W + 1 and not over, f'{lang} {fs}px Druck {rt or "start"}: nichts ragt über das A4-Blatt (Breite {sw}) {over}')
            check(not sp, f'{lang} {fs}px Druck {rt or "start"}: kein Wort zerbricht {sp}')
            if rt.startswith('vehicles/'):
                cols = q.evaluate("() => { const g = [...document.querySelectorAll('main .grid2')].find((x) => x.children.length === 2); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0; }")
                check(cols == 1, f'{lang} {fs}px Druck: HU/SP untereinander ({cols} Spalte/n)')
            if rt == 'check/paper':
                if SHOTS:  # per CDP, nur sichtbarer Bereich: screenshot()/pdf() von Playwright und captureBeyondViewport setzen die Grundschrift auf 16 px zurück
                    import base64
                    img = q.cdp.send('Page.captureScreenshot', {'format': 'png'})
                    open(f'{SHOTS}/druck-gross-{lang}-{fs}.png', 'wb').write(base64.b64decode(img['data']))
                q.emulate_media(media='print'); q.setfs(); q.pdf(path=f'/tmp/cfp-druck-gross-{lang}-{fs}.pdf', format='A4', margin={'top': '10mm', 'bottom': '10mm', 'left': '10mm', 'right': '10mm'})
                check(os.path.getsize(f'/tmp/cfp-druck-gross-{lang}-{fs}.pdf') > 5000, f'{lang} {fs}px: A4-PDF des Vordrucks erzeugt')
                q.setfs(); open_print(q, rt)
                check(q.evaluate("parseFloat(getComputedStyle(document.documentElement).fontSize)") == fs, f'{lang} {fs}px: Grundschrift wirkt nach dem PDF weiter')
                fsz = q.evaluate("parseFloat(getComputedStyle(document.querySelector('table.paper')).fontSize)")
                check(fsz <= 13 * 96 / 72 + 0.1, f'{lang} {fs}px: Vordruck-Tabelle höchstens 13 pt ({fsz:.1f} px)')
        check(not errs, f'{lang} {fs}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # normale Schrift: unverändert (HU/SP nebeneinander, Vordruck-Tabelle in Grundschrift)
    for lang in ['de', 'en']:
        ctx, q, errs = page(lang, 16)
        open_print(q, 'vehicles/' + vids[0])
        cols = q.evaluate("() => { const g = [...document.querySelectorAll('main .grid2')].find((x) => x.children.length === 2); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0; }")
        check(cols == 2, f'{lang} 16px Druck: HU/SP weiter nebeneinander ({cols})')
        open_print(q, 'check/paper')
        check(q.evaluate("parseFloat(getComputedStyle(document.querySelector('table.paper')).fontSize)") == 16, f'{lang} 16px: Vordruck-Tabelle in Grundschrift')
        sw, over = q.evaluate(OVER, W); check(sw <= W + 1 and not over, f'{lang} 16px Druck Vordruck passt {over}')
        q.emulate_media(media='screen'); q.wait_for_timeout(100)
        check(q.evaluate("getComputedStyle(document.querySelector('.paper-head')).gridTemplateColumns.split(' ').length") >= 2, f'{lang} 16px Bildschirm: Kopffelder unverändert nebeneinander')
        ctx.close()
    # Gegenprobe: ohne die neuen Druckregeln ragt der Vordruck bei 32 px über das Blatt
    ctx, q, errs = page('de', 32)
    open_print(q, 'check/paper'); n = q.evaluate(STRIP); q.evaluate("document.querySelector('table.paper').style.fontSize = 'inherit'"); q.wait_for_timeout(100)
    sw, over = q.evaluate(OVER, W)
    check(n >= 2 and (sw > W + 1 or over), f'Gegenprobe: ohne Regeln ({n} entfernt) ragt der Vordruck über das Blatt (Breite {sw})')
    ctx.close(); br.close()
print('UI-Druck große Schrift:', 'FEHLER ' + str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
