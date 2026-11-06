# [CLAUDE] UI-Test (06.11.2026, Backlog 1060, Blickwinkel „Leitung Bayern zieht vor der Betriebskontrolle den Auslesungs-Verlauf des eigenen Standorts“):
# Auslesungen → Standort Bayern → „Verlauf“ zeigt nur Fahrer/Lkw dieses Standorts (vorher ganze Flotte), Auswahl auch auf der Verlaufsseite,
# Hinweis auf ausgeblendete Fahrer ohne Standort; Backlog 1061: Fahrer-Nachweise übernehmen den Standort der Fahrerliste. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
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
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'av.inhaber', 'display_name': 'AV Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    user = None
    for un in ['av.inhaber', 'ns.inhaber', 'hm.inhaber', 'hs.inhaber', 'nf.inhaber', 'tz.inhaber', 'nw.inhaber', 'nb.inhaber', 'au.inhaber', 'ab.inhaber', 'ws.inhaber', 'ft.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: user = un; break
    check(user is not None, 'Anmeldung Inhaber')
    d0 = (datetime.date.today() - datetime.timedelta(days=15)).isoformat()
    pid = os.getpid() % 900 + 100
    names = {}
    for site, n in [('Dortmund', 1), ('Bayern', 2)]:
        names[site] = f'AV Fahrer {site} {pid}'
        r = api('POST', '/api/drivers', {'display_name': names[site], 'personnel_no': f'AV-{pid}-{n}', 'site': site})
        check(r['s'] in (200, 201), f'Fahrer {site} {r["s"]}')
        if r['s'] in (200, 201):
            api('POST', '/api/tacho/downloads', {'kind': 'fahrerkarte', 'driver_id': r['d']['id'], 'downloaded_on': d0, 'evidence': 'UI-Test'})
            api('POST', f"/api/drivers/{r['d']['id']}/license-checks", {'checked_on': d0, 'result': 'in_ordnung'})
    for lang in ['de', 'uk', 'en']:
        api('PATCH', '/api/me', {'language': lang})
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            ctx = br.new_context(viewport={'width': w, 'height': h}); m = ctx.new_page(); errs = []; m.on('pageerror', lambda e: errs.append(str(e)))
            m.goto(B); m.evaluate(JS, ['POST', '/api/login', {'username': user, 'password': PW}])
            m.goto(B + '/#/tacho'); m.reload(); m.wait_for_selector('#tsite', timeout=15000)
            opt = m.evaluate("() => [...document.querySelectorAll('#tsite option')].map((o) => o.value).find((v) => v.toLowerCase() === 'bayern')")
            check(bool(opt), f'{lang} {w}px: Standort Bayern wählbar')
            m.evaluate("() => { document.querySelector('#tsite').dataset.alt = '1'; }")
            m.select_option('#tsite', opt); m.wait_for_function("() => { const x = document.querySelector('#tsite'); return x && !x.dataset.alt && x.value.toLowerCase() === 'bayern'; }", timeout=15000)
            m.click('#thlink'); m.wait_for_selector('#thf', timeout=15000)
            m.wait_for_selector('#thsite', timeout=15000)
            body = m.inner_text('#app')
            check(m.evaluate("() => document.querySelector('#thsite').value.toLowerCase()") == 'bayern', f'{lang} {w}px: Verlauf übernimmt Standort Bayern')
            check(names['Bayern'] in body, f'{lang} {w}px: Bayern-Fahrer im Verlauf')
            check(names['Dortmund'] not in body, f'{lang} {w}px: Dortmunder Fahrer nicht im Verlauf')
            m.select_option('#thsite', '')
            m.wait_for_function("(n) => document.querySelector('#thsite') && document.querySelector('#thsite').value === '' && document.querySelector('#app').innerText.includes(n)", arg=names['Dortmund'], timeout=15000)
            check(names['Dortmund'] in m.inner_text('#app'), f'{lang} {w}px: „Alle“ zeigt wieder alle Fahrer')
            check(m.evaluate(noscroll), f'{lang} {w}px: ohne Querscrollen')
            check(not errs, f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
            if SHOTS: m.screenshot(path=f'{SHOTS}/auslesung_verlauf_standort_{lang}_{w}.png')
            # Backlog 1061: Fahrer-Nachweise übernehmen den Standort der Fahrerliste
            m.goto(B + '/#/drivers'); m.wait_for_selector('#dsite', timeout=15000)
            # alte Auswahl markieren und auf die neu gezeichnete warten (sonst überholt der Seitenwechsel das Neuzeichnen)
            m.evaluate("() => { document.querySelector('#dsite').dataset.alt = '1'; }")
            m.select_option('#dsite', opt); m.wait_for_function("() => { const x = document.querySelector('#dsite'); return x && !x.dataset.alt && x.value.toLowerCase() === 'bayern'; }", timeout=15000)
            m.goto(B + '/#/drivers/records'); m.wait_for_selector('#drf', timeout=15000)
            try: m.wait_for_selector('#drsite', timeout=15000)
            except Exception:
                print(m.inner_text('#app')[:800]); raise
            body = m.inner_text('#app')
            check(m.evaluate("() => document.querySelector('#drsite').value.toLowerCase()") == 'bayern', f'{lang} {w}px: Fahrer-Nachweise übernehmen Standort Bayern')
            check(names['Bayern'] in body and names['Dortmund'] not in body, f'{lang} {w}px: Fahrer-Nachweise nur Bayern')
            check(m.evaluate(noscroll), f'{lang} {w}px: Fahrer-Nachweise ohne Querscrollen')
            check(not errs, f'{lang} {w}px: Fahrer-Nachweise keine Skriptfehler {errs[:1]}')
            if SHOTS and w == 390: m.screenshot(path=f'{SHOTS}/fahrer_nachweise_standort_{lang}_{w}.png')
            ctx.close()
    api('PATCH', '/api/me', {'language': 'de'})
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
