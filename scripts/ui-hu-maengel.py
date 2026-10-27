# [CLAUDE] UI-Test (27.10.2026, Backlog 435, Blickwinkel „HU-Prüfbericht mit erheblichen bzw. geringen Mängeln“):
# HU/SP-Formular „Durchführung erfassen“ zeigt einen Hinweis zum Fälligkeitsfeld, der mit dem gewählten Ergebnis wechselt (erhebliche Mängel
# und schlechter → keine Plakette, Feld leer lassen; geringe Mängel → Plakette erteilt, Mängel beheben). In „Bisherige Durchführungen“ steht
# bei der letzten Prüfung mit geringen Mängeln ein Hinweis mit Link „Schaden melden“. DE/UK/EN bei 390/820/1366 px, kein Querscrollen,
# keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'hm.inhaber', 'display_name': 'HM Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    user = None
    for un in ['hm.inhaber', 'hs.inhaber', 'nf.inhaber', 'tz.inhaber', 'nw.inhaber', 'nb.inhaber', 'au.inhaber', 'ab.inhaber', 'ws.inhaber', 'ft.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: user = un; break
    check(user is not None, 'Anmeldung Inhaber')
    today = datetime.date.today(); d0 = (today - datetime.timedelta(days=12)).isoformat(); d1 = (today - datetime.timedelta(days=4)).isoformat()
    pid = os.getpid() % 900 + 100
    for i, lang in enumerate(['de', 'uk', 'en']):
        vin = f'WDB96340310{pid:03d}{i + 5:03d}'; vid = 'VIN:' + vin
        api('POST', '/api/vehicles', {'plate': f'HM-G {pid}{i}', 'vin': vin, 'site': 'Dortmund'})
        r = api('POST', f'/api/vehicles/{vid}/husp/HU/complete', {'done_date': d0, 'evidence': 'HU-Bericht UI 1', 'result': 'erhebliche_maengel'})
        check(r['s'] == 200, f'{lang}: HU mit erheblichen Mängeln {r["s"]}')
        r = api('POST', f'/api/vehicles/{vid}/husp/HU/complete', {'done_date': d1, 'evidence': 'HU-Nachprüfung UI 2', 'result': 'geringe_maengel'})
        check(r['s'] == 200, f'{lang}: Nachprüfung mit geringen Mängeln {r["s"]}')
        api('PATCH', '/api/me', {'language': lang})
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
            m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}])
            m.goto(B + '/#/vehicles/' + vid); m.reload()
            try: m.wait_for_selector('[data-hsdue="HU"]', timeout=15000)
            except Exception:
                if SHOTS: m.screenshot(path=f'{SHOTS}/hu_maengel_fehler.png')
                print(m.inner_text('body')[:600]); raise
            T = m.evaluate("async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }")
            f = m.locator('form[data-hsdone]').first
            f.locator('xpath=ancestor::details[1]/summary').click()
            hint = f.locator('[data-hsreshint]')
            check(hint.inner_text().strip() == T['husp_done_hint'], f'{lang} {w}px: Grundhinweis zum Fälligkeitsfeld')
            f.locator('select[name=result]').select_option('erhebliche_maengel')
            check(hint.inner_text().strip() == T['husp_bad_hint'], f'{lang} {w}px: Hinweis erhebliche Mängel')
            if SHOTS and w == 390: hint.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/hu_maengel_form_{lang}_{w}.png')
            f.locator('select[name=result]').select_option('geringe_maengel')
            check(hint.inner_text().strip() == T['husp_minor_hint'], f'{lang} {w}px: Hinweis geringe Mängel')
            f.locator('select[name=result]').select_option('')
            check(hint.inner_text().strip() == T['husp_done_hint'], f'{lang} {w}px: zurück zum Grundhinweis')
            m.locator('#mhist > summary').click()
            mn = m.locator('#mhist [data-resminor]')
            check(mn.count() == 1 and T['res_minor_hint'] in mn.inner_text(), f'{lang} {w}px: Hinweis geringe Mängel an der letzten Durchführung ({mn.count()})')
            check(mn.locator(f'a[href="#/new/{vid}"]').count() == 1, f'{lang} {w}px: Link „Schaden melden“')
            check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
            if SHOTS: mn.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/hu_maengel_akte_{lang}_{w}.png')
            check(not errs, f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
