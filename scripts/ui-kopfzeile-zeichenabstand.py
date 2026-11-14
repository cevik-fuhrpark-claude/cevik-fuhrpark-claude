# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1493, Blickwinkel „Inhaberin mit Leseschwäche nutzt eine Lese-Erweiterung mit größeren Zeichenabständen“, WCAG 1.4.12):
# Textabstände laut WCAG (Zeilenhöhe 1,5, Zeichenabstand 0,12em, Wortabstand 0,16em, Absatzabstand 2em) und Browser-Grundschrift 16/24 px (CDP Page.setFontSizes),
# Breiten 320–820 px, DE/UK/EN: Die Umgebungswahl der Kopfzeile zeigt ihren Text ganz (volle Eigenbreite – vorher „Produc“/„Робочі“, EN schon ohne Erweiterung
# an 320/430 px), nichts ragt aus der Kopfzeile (vorher Glocke bei 24 px an 320/360 px außerhalb), „CEVIK“ bleibt stehen (außer im Extremfall 24 px + Abstände
# an ≤ 360 px), bei 16 px ohne Erweiterung bleibt die Kopfzeile einzeilig; Fahrerin ohne Umgebungswahl unverändert; PC mit Seitenleiste. Gegenprobe: alte Regeln → Text abgeschnitten.
import os, base64
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SP = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }"
OLD = ".topbar { flex-wrap: nowrap !important; justify-content: normal !important; } .topbar .spacer { display: block !important; } .topbar .brand { flex: 0 1 auto !important; min-width: 0 !important; } .topbar select { flex: 0 1 auto !important; }"
M = """() => { const t = document.querySelector('.topbar'); const s = t.querySelector('select'); let sel = null;
  if (s) { const c = s.cloneNode(true); c.value = s.value; c.style.cssText = 'position:absolute;visibility:hidden;width:auto;min-width:0;flex:none'; s.parentNode.appendChild(c);
    sel = [Math.round(s.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().width)]; c.remove(); }
  const br = t.querySelector('.brand'); const rg = document.createRange(); rg.setStart(br.firstChild, 0); rg.setEnd(br.firstChild, 5);
  const cut = rg.getBoundingClientRect().right > br.getBoundingClientRect().right + 0.5;
  const out = [...t.children].filter((e) => e.getClientRects().length).some((e) => e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5);
  return { sel, cut, out, over: t.scrollWidth > t.clientWidth + 1, h: Math.round(t.getBoundingClientRect().height), page: document.documentElement.scrollWidth > innerWidth + 1 }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'za.inhaber', 'display_name': 'ZA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['za.inhaber', 'dg.inhaber', 'bw.inhaber', 'km.inhaber', 'da.inhaber', 'qr.inhaber', 'wa.inhaber', 'sh.inhaber', 'ra.inhaber', 'az.inhaber', 'tk.inhaber', 'hm.inhaber', 'fm.inhaber', 'sk.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    if owner is None: raise SystemExit(1)
    envn = api('GET', '/api/me')['d']['active_environment']
    import uuid; du = 'za.fahrer' + str(uuid.uuid4().int)[:4]
    r = api('POST', '/api/users', {'username': du, 'display_name': 'ZA Fahrerin', 'role': 'driver', 'environment': envn, 'language': 'de'})
    c0 = br.new_context(); d0 = c0.new_page(); d0.goto(B); d0.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}]); c0.close()
    def run(user, lang, w, fs, sp, extra=None):
        ctx = br.new_context(viewport={'width': w, 'height': 800}); q = ctx.new_page()
        cdp = ctx.new_cdp_session(q); cdp.send('Page.enable'); cdp.send('Page.setFontSizes', {'fontSizes': {'standard': fs, 'fixed': max(13, int(fs * 13 / 16))}})
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        q.goto(B + '/#/'); q.reload(); q.wait_for_selector('main h1', timeout=15000); q.wait_for_timeout(500)
        if sp: q.add_style_tag(content=SP)
        if extra: q.add_style_tag(content=extra)
        q.wait_for_timeout(150); res = q.evaluate(M)
        if SHOTS and w in (320, 390) and fs == 16:
            img = cdp.send('Page.captureScreenshot', {'format': 'png', 'clip': {'x': 0, 'y': 0, 'width': w, 'height': 140, 'scale': 1}})
            open(f'{SHOTS}/kopfzeile-{lang}-{w}-{"abstand" if sp else "normal"}.png', 'wb').write(base64.b64decode(img['data']))
        ctx.close(); return res
    for lang in ['de', 'uk', 'en']:
        for w in [320, 360, 390, 430, 600, 820]:
            for fs in [16, 24]:
                for sp in [False, True]:
                    r = run(owner, lang, w, fs, sp); tag = f'{lang} {w}px {fs}px{" +Abstände" if sp else ""}'
                    check(r['sel'] and r['sel'][0] >= r['sel'][1] - 1, f'{tag}: Umgebungswahl in voller Breite {r["sel"]}')
                    check(not r['out'] and not r['over'] and not r['page'], f'{tag}: nichts ragt aus der Kopfzeile/Seite')
                    if not (sp and fs == 24 and w <= 360): check(not r['cut'], f'{tag}: „CEVIK“ ungekürzt')
                    if fs == 16 and not sp: check(r['h'] <= 70, f'{tag}: Kopfzeile einzeilig ({r["h"]} px)')
    for lang, w in [('de', 320), ('uk', 390), ('en', 1366)]:
        r = run(du, lang, w, 16, True)
        check(r['sel'] is None and not r['out'] and not r['cut'] and r['h'] <= 70, f'Fahrerin {lang} {w}px +Abstände: Kopfzeile einzeilig, nichts abgeschnitten')
    r = run(owner, 'de', 1366, 16, False)
    check(r['sel'] and r['sel'][0] >= r['sel'][1] - 1 and r['h'] <= 70 and not r['cut'], 'PC 1366 px mit Seitenleiste unverändert')
    # Gegenprobe: alte Regeln (Auswahl schrumpft) → Text in EN 430 px ohne Erweiterung abgeschnitten
    r = run(owner, 'en', 430, 16, False, OLD)
    check(r['sel'] and r['sel'][0] < r['sel'][1] - 1, f'Gegenprobe: mit den alten Regeln schrumpft die Umgebungswahl ({r["sel"]})')
    br.close()
print('UI-Kopfzeile Zeichenabstand:', 'FEHLER ' + str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
