# [CLAUDE] UI-Test (06.11.2026): Backlog 1102 (Blickwinkel „Fahrer mit älterem Handy fügt eine lange Nachricht in die Beschreibung ein“).
# Hinweismuster werden in einer Leerlaufphase vorgewärmt (erste Taste ohne Stillstand), ab 1000 Zeichen erst nach einer Tipp-Pause geprüft,
# „change“ prüft sofort, Seitenwechsel während der Pause ohne Fehler. CPU 4× gedrosselt ≈ älteres Handy. Braucht einen Dev-Server (scripts/dev-server.mjs).
import os, time
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SH = os.environ.get('CFP_SHOTS') or '/tmp'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SFX = str(int(time.time()))[-6:]
FILLER = 'Hallo, kurze Info zur Tour von heute morgen, die Ladung war ordentlich verteilt und die Papiere sind vollständig. ' * 10
fails = []
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'lb.inhaber', 'display_name': 'LB Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    r = api('POST', '/api/login', {'username': 'lb.inhaber', 'password': PW})
    if r['s'] != 200: raise SystemExit('Anmeldung Inhaber fehlgeschlagen (frischer Dev-Server nötig?)')
    v = api('POST', '/api/vehicles', {'plate': 'DO-LB ' + SFX[-4:], 'vin': 'WDB963403107' + SFX[-5:], 'site': 'Dortmund'}); vid = v['d']['id']
    un = 'lb.fahrer' + SFX
    u = api('POST', '/api/users', {'username': un, 'display_name': 'LB Fahrer', 'role': 'driver', 'environment': 'production'})
    c = br.new_context(); pg = c.new_page(); pg.goto(B); pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}]); c.close()
    uid = [x for x in api('GET', '/api/users')['d']['users'] if x['username'] == un][0]['id']
    api('POST', f'/api/vehicles/{vid}/drivers', {'user_id': uid})
    for lang in ['de', 'uk', 'en']:
        for w, h in [(390, 844), (820, 1180), (1366, 900)]:
            ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []
            q.on('pageerror', lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            q.goto(B + '/#/new/' + vid); q.reload(); q.wait_for_selector('#d', timeout=30000)
            cdp = ctx.new_cdp_session(q); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4.0})
            q.wait_for_timeout(1500)
            # 1) erste Taste nach dem Vorwärmen ohne Stillstand
            first = q.evaluate("""()=>{const d=document.querySelector('#d'); const t0=performance.now(); d.value='R'; d.dispatchEvent(new Event('input')); return performance.now()-t0;}""")
            if first > 120: fails.append((lang, w, 'erste Taste ms', round(first)))
            # 2) kurzer Text: Hinweis sofort
            q.evaluate("""()=>{const d=document.querySelector('#d'); d.value='Keine Luft mehr im Reifen vorne links'; d.dispatchEvent(new Event('input'));}""")
            if q.is_hidden('#flat'): fails.append((lang, w, 'kurz: Hinweis nicht sofort'))
            # 3) langer Text: je Taste kein Stillstand, Hinweis nach der Pause
            ms = q.evaluate("""(t)=>{const d=document.querySelector('#d'); d.value=''; d.dispatchEvent(new Event('input')); let mx=0; for (const s of [t, t+'x', t+'xy']) { const t0=performance.now(); d.value=s; d.dispatchEvent(new Event('input')); mx=Math.max(mx, performance.now()-t0); } return [mx, document.querySelector('#flat').hidden];}""", FILLER + 'Keine Luft mehr im Reifen vorne links. ')
            if ms[0] > 50: fails.append((lang, w, 'lang: ms je Taste', round(ms[0])))
            if not ms[1]: fails.append((lang, w, 'lang: Hinweis schon vor der Pause'))
            q.wait_for_timeout(1500)
            if q.is_hidden('#flat'): fails.append((lang, w, 'lang: Hinweis nach der Pause fehlt'))
            # 4) change (Diktat/Feld verlassen) prüft sofort
            q.evaluate("""(t)=>{const d=document.querySelector('#d'); d.value=t; d.dispatchEvent(new Event('change'));}""", FILLER + 'Alles in Ordnung.')
            if not q.is_hidden('#flat'): fails.append((lang, w, 'change: Hinweis nicht sofort weg'))
            q.evaluate("""(t)=>{const d=document.querySelector('#d'); d.value=t; d.dispatchEvent(new Event('input'));}""", FILLER + 'Keine Luft mehr im Reifen vorne links. ')
            q.wait_for_timeout(1500)
            sw = q.evaluate('document.documentElement.scrollWidth')
            if sw > w: fails.append((lang, w, 'scrollWidth', sw))
            q.locator('#flat').scroll_into_view_if_needed(); q.screenshot(path=f'{SH}/lange_beschreibung_{lang}_{w}.png')
            # 5) Seitenwechsel während der Pause: kein Fehler
            q.evaluate("""(t)=>{const d=document.querySelector('#d'); d.value=t+'z'; d.dispatchEvent(new Event('input'));}""", FILLER)
            q.goto(B + '/#/'); q.wait_for_timeout(1200)
            if errs: fails.append((lang, w, 'Seitenfehler', errs[:2]))
            ctx.close()
    br.close()
if fails:
    print('FEHLER:', fails); raise SystemExit(1)
print('UI lange Beschreibung: grün (3 Sprachen × 3 Breiten)')
