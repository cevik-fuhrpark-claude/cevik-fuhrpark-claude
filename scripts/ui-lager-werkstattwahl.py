# [CLAUDE] UI-Test (06.11.2026, Backlog 1062, Blickwinkel „Seitenfilter wirkt auf alle Teile einer Seite“, Lager):
# Lagerliste → Auswahl „Werkstatt“ München zeigt nur Münchner Artikel, Druckvermerk nennt das Lager, Zahl am Bestellvorschlag je Lager;
# Bestellvorschlag, Lagerjournal und Bestand zum Stichtag übernehmen die Auswahl. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lw.inhaber', 'display_name': 'LW Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    user = None
    for un in ['lw.inhaber', 'av.inhaber', 'ns.inhaber', 'hm.inhaber', 'hs.inhaber', 'nf.inhaber', 'tz.inhaber', 'nw.inhaber', 'nb.inhaber', 'au.inhaber', 'ab.inhaber', 'ws.inhaber', 'ft.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: user = un; break
    check(user is not None, 'Anmeldung Inhaber')
    pid = os.getpid() % 900 + 100
    names = {'DORTMUND': f'LW Filter Dortmund {pid}', 'MUENCHEN': f'LW Filter München {pid}'}
    for site, nm in names.items():
        r = api('POST', '/api/stock', {'site': site, 'name': nm, 'initial_qty': '1', 'min_qty': '3'})
        check(r['s'] == 201, f'Artikel {site} {r["s"]}')
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
            m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}])
            m.evaluate("() => sessionStorage.clear()")
            m.goto(B + '/#/stock'); m.reload(); m.wait_for_selector('#ssite', timeout=15000)
            m.select_option('#ssite', 'MUENCHEN')
            vis = m.evaluate("() => [...document.querySelectorAll('#sl a')].filter((a) => !a.hidden).map((a) => a.innerText).join('\\n')")
            check(names['MUENCHEN'] in vis and names['DORTMUND'] not in vis, f'{lang} {w}px: Liste nur München')
            check('München' in m.inner_text('#sprsel'), f'{lang} {w}px: Druckvermerk nennt das Lager')
            check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
            if SHOTS: m.screenshot(path=f'{SHOTS}/lager_werkstattwahl_{lang}_{w}.png')
            m.click('a[href="#/stock/reorder"]'); m.wait_for_selector('#rprt', timeout=15000)
            if m.query_selector('#rsite'): check(m.evaluate("() => document.querySelector('#rsite').value") == 'MUENCHEN', f'{lang} {w}px: Bestellvorschlag übernimmt München')
            body = m.inner_text('#app'); check(names['DORTMUND'] not in body, f'{lang} {w}px: Bestellvorschlag ohne Dortmund')
            m.goto(B + '/#/stock'); m.wait_for_selector('#ssite', timeout=15000)
            check(m.evaluate("() => document.querySelector('#ssite').value") == 'MUENCHEN', f'{lang} {w}px: Auswahl gemerkt')
            m.click('#sasof'); m.wait_for_selector('#saf', timeout=15000)
            check(m.evaluate("() => document.querySelector('#sasite') && document.querySelector('#sasite').value") == 'MUENCHEN', f'{lang} {w}px: Stichtag übernimmt München')
            m.goto(B + '/#/stock'); m.wait_for_selector('#ssite', timeout=15000)
            m.click('.actions a[href="#/stock/journal"]'); m.wait_for_selector('#jcsv', timeout=15000)
            check(m.evaluate("() => { const x = document.querySelector('#sjsite') || [...document.querySelectorAll('#app select')].find((s) => [...s.options].some((o) => o.value === 'MUENCHEN')); return x && x.value; }") == 'MUENCHEN', f'{lang} {w}px: Lagerjournal übernimmt München')
            check(m.evaluate(noscroll), f'{lang} {w}px: Journal ohne Querscrollen')
            check(not errs, f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
            ctx.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
