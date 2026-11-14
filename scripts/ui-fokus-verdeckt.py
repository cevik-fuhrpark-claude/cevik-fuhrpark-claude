# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1494, Blickwinkel „Disposition bedient PC/Tablet nur per Tastatur, mit großer Schrift bzw. Lese-Erweiterung“, WCAG 2.4.11/2.4.12):
# Per Tab und Shift+Tab durch Startseite, Vorgangsliste, Meldeformular und Vorgang – kein fokussiertes Element liegt (auch nur teilweise) unter der festen
# Kopfzeile oder der unteren Tabbar (Stichprobe von 15 Punkten je Element per elementFromPoint). Handy 390 px (16 px), Handy 320 px mit 24 px Grundschrift
# und WCAG-Textabständen, Tablet 820 px, PC 1366 px (Tabbar = Seitenleiste → unten kein Abstand; bei 32 px Grundschrift scrollt die Kopfzeile mit → 0), DE/UK/EN.
# Abstände kommen aus --topbar-h/--tabbar-h (barGaps in public/app.js); zusätzlich geometrische Prüfung (Überlappung in px).
# Gegenprobe: alte feste Abstände (4rem/110 px) → Shift+Tab lässt den oberen Rand unter der Kopfzeile.
import os, uuid, base64
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SP = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }"
OLD = "html { scroll-padding-top: 4rem !important; scroll-padding-bottom: 110px !important; }"
M = """() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); if (!r.width || !r.height) return null;
  const tb = document.querySelector('.topbar'), bb = document.querySelector('.tabbar');
  if ((tb && tb.contains(a)) || (bb && bb.contains(a)) || a.classList.contains('skip')) return null;
  let geo = 0; if (tb && getComputedStyle(tb).position !== 'static') geo = Math.max(geo, tb.getBoundingClientRect().bottom - r.top);
  if (bb) { const q = bb.getBoundingClientRect(); if (q.height && q.width >= innerWidth * 0.6) geo = Math.max(geo, r.bottom - q.top); }
  let n = 0, cov = 0;
  for (let i = 1; i <= 5; i++) for (let k = 1; k <= 3; k++) { const x = r.left + r.width * k / 4, y = r.top + r.height * i / 6;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue; n++;
    const e = document.elementFromPoint(x, y); if (e && ((tb && tb.contains(e)) || (bb && bb.contains(e)))) cov++; }
  if (!n) return null;
  return { el: a.tagName + ' ' + (a.innerText || a.value || a.getAttribute('aria-label') || '').slice(0, 30).replace(/\\n/g, ' '), cov, n, geo: Math.max(0, Math.round(geo)) }; }"""
V = """() => { const cs = getComputedStyle(document.documentElement); const tb = document.querySelector('.topbar'); return [cs.getPropertyValue('--topbar-h').trim(), cs.getPropertyValue('--tabbar-h').trim(),
  getComputedStyle(tb).position === 'static' ? 0 : Math.round(tb.getBoundingClientRect().height)]; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fv.inhaber', 'display_name': 'FV Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['fv.inhaber', 'za.inhaber', 'dg.inhaber', 'bw.inhaber', 'km.inhaber', 'da.inhaber', 'qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    if owner is None: raise SystemExit(1)
    run_id = str(uuid.uuid4().int)[:4]; vid = None
    for i in range(10):
        r = api('POST', '/api/vehicles', {'plate': f'FV-{run_id[:2]} {100 + i}', 'vin': f'WDB96340310{run_id}{10 + i}', 'site': 'Dortmund'})
        if r['s'] in (200, 201): vid = vid or 'VIN:' + f'WDB96340310{run_id}{10 + i}'
    cid = None
    for i in range(8):
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + f'WDB96340310{run_id}{10 + i}', 'description': f'Bremse hinten links quietscht {i}', 'priority': 'mittel', 'driveability': 'fahrbereit', 'request_key': f'fv-{run_id}-{i}'})
        cid = cid or (r['d'] or {}).get('id')
    check(cid is not None, 'Testvorgänge angelegt')
    pages = ['#/', '#/cases', '#/new', f'#/cases/{cid}']
    def run(lang, w, h, fs, sp=False, extra=None, dirs=('Tab', 'Shift+Tab'), pg_list=pages, steps=45):
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page()
        cdp = ctx.new_cdp_session(q); cdp.send('Page.enable'); cdp.send('Page.setFontSizes', {'fontSizes': {'standard': fs, 'fixed': max(13, int(fs * 13 / 16))}})
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        bad = []; vals = None
        for pg in pg_list:
            q.goto(B + '/' + pg); q.reload(); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(400)
            if sp: q.add_style_tag(content=SP)
            if extra: q.add_style_tag(content=extra)
            q.wait_for_timeout(150); vals = q.evaluate(V)
            for d in dirs:
                if d == 'Shift+Tab': q.evaluate('window.scrollTo(0, document.body.scrollHeight)'); q.evaluate('document.activeElement && document.activeElement.blur()')
                else: q.evaluate('window.scrollTo(0, 0)')
                for _ in range(steps):
                    q.keyboard.press(d); q.wait_for_timeout(50); r = q.evaluate(M)
                    if r and (r['cov'] or r['geo'] >= 1): bad.append(f"{pg.split('/')[1] or 'start'} {d}: {r['el']} ({r['cov']}/{r['n']} Punkte, {r['geo']} px verdeckt)")
                    if not q.url.endswith(pg[1:]) and not q.url.endswith(pg): break
                if SHOTS and pg == '#/cases' and d == 'Shift+Tab' and w in (320, 390, 820, 1366) and not extra:
                    img = cdp.send('Page.captureScreenshot', {'format': 'png'})
                    open(f'{SHOTS}/fokus-{lang}-{w}-{fs}{"-abstand" if sp else ""}.png', 'wb').write(base64.b64decode(img['data']))
        ctx.close(); return bad, vals
    for lang, w, h, fs, sp in [('de', 390, 844, 16, False), ('uk', 320, 700, 24, True), ('en', 360, 740, 16, True), ('de', 820, 1180, 16, False), ('en', 1366, 768, 16, False), ('uk', 1366, 768, 32, False)]:
        bad, vals = run(lang, w, h, fs, sp)
        tag = f'{lang} {w}px {fs}px{" +Abstände" if sp else ""}'
        check(not bad, f'{tag}: kein fokussiertes Element unter Kopfzeile/Tabbar' + ('' if not bad else ' – ' + '; '.join(dict.fromkeys(bad))[:400]))
        check(vals[0] == f'{vals[2]}px' or abs(float(vals[0][:-2]) - vals[2]) <= 1, f'{tag}: --topbar-h = Höhe der festen Kopfzeile, 0 wenn sie mitscrollt ({vals[0]} / {vals[2]} px)')
        if w >= 900: check(vals[1] == '0px', f'{tag}: Tabbar ist Seitenleiste → --tabbar-h 0 ({vals[1]})')
        else: check(float(vals[1][:-2]) >= 56, f'{tag}: --tabbar-h = Höhe der unteren Tabbar ({vals[1]})')
    # Gegenprobe: alte feste Abstände → Shift+Tab lässt Elemente teilweise unter der Kopfzeile (68 px > 4rem)
    bad, _ = run('de', 390, 844, 16, False, OLD, dirs=('Shift+Tab',), pg_list=['#/cases', f'#/cases/{cid}'])
    check(bool(bad), f'Gegenprobe: mit 4rem/110 px liegt ein Fokus teilweise unter der Kopfzeile ({len(bad)} Funde)')
    br.close()
print('UI-Fokus nicht verdeckt:', 'FEHLER ' + str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
