# [CLAUDE] UI-Test (21.10.2026): kleines Handy 320 px und vergrößerte Schrift (100/150 %, DE/UK) – Abfahrtskontrolle mit lesbarem
# Prüfpunkt-Text (vorher Raster 1fr/auto: 67 px bzw. 0 px breit), Tabbar „Mehr“ im Bild, Glocke sichtbar, kein Querscrollen auf
# Startseite/Kontrolle; Aktionsformular-Überschrift nicht unter der Kopfzeile (scroll-padding).
import asyncio, os, time
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
UN = f'kh.fahrer{int(time.time()) % 100000}'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
SCALE = """(pct) => { let s = document.getElementById('tscale'); if (!s) { s = document.createElement('style'); s.id = 'tscale'; document.head.appendChild(s); } s.textContent = `html{font-size:${pct}% !important}`; }"""
MEASURE = """() => { const W = innerWidth; const items = [...document.querySelectorAll('.checkitem > span:first-child')].map((e) => e.getBoundingClientRect().width);
  const tabs = [...document.querySelectorAll('.tabbar a')].map((a) => a.getBoundingClientRect().right); const bell = document.querySelector('.topbar a.tbicon:last-of-type');
  return { sw: document.documentElement.scrollWidth - W, minText: items.length ? Math.min(...items) : null, n: items.length, tabRight: tabs.length ? Math.max(...tabs) : 0, W,
    bellRight: bell ? bell.getBoundingClientRect().right : 0, tabH: (document.querySelector('.tabbar') || { offsetHeight: 0 }).offsetHeight, pad: parseFloat(getComputedStyle(document.body).paddingBottom) }; }"""
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'kh.inh', 'display_name': 'KH'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'kh.inh', 'password': PW})
        vin = 'WDB96340310887001'; vid = 'VIN:' + vin
        await api('POST', '/api/vehicles', {'plate': 'KH-AB 320', 'vin': vin, 'site': 'Dortmund'})
        u = await api('POST', '/api/users', {'username': UN, 'display_name': 'Kleinhandy Fahrer', 'role': 'driver', 'environment': 'production'})
        if u['s'] != 201: _r(f'FEHLER: Fahrer anlegen {u}')
        ctx = await br.new_context(viewport={'width': 320, 'height': 568}, is_mobile=True, device_scale_factor=2); q = await ctx.new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        await q.evaluate(JS, ['POST', '/api/login', {'username': UN, 'password': PW}])
        for lang in ['de', 'uk']:
            await q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
            for pct in [100, 150]:
                for route in ['#/', f'#/check/{vid}']:
                    await q.goto(B + '/' + route); await q.reload(); await q.wait_for_timeout(1200); await q.evaluate(SCALE, pct); await q.wait_for_timeout(300)
                    m = await q.evaluate(MEASURE)
                    bad = []
                    if m['sw'] > 0: bad.append(f"Querscrollen {m['sw']} px")
                    if m['tabRight'] > m['W'] + 1: bad.append(f"Tabbar bis {m['tabRight']:.0f} px")
                    if m['bellRight'] > m['W'] + 1: bad.append(f"Glocke bis {m['bellRight']:.0f} px")
                    if m['tabH'] > m['pad'] + 1: bad.append(f"Tabbar {m['tabH']} px höher als Abstand {m['pad']} px")
                    if 'check' in route and (not m['n'] or m['minText'] < 100): bad.append(f"Prüfpunkt-Text {m['minText']} px")
                    if pct == 150 and 'check' in route: await q.screenshot(path=f'/tmp/cfp-kleines-handy-{lang}.png', full_page=False)
                    _r(f'FEHLER: {lang} {pct}% {route}: ' + '; '.join(bad) if bad else f"ok: {lang} {pct}% {route} (Text ≥ {m['minText'] or 0:.0f} px, Tabbar {m['tabH']} px)")
        # Tippziele ≥ 44 px: Zurück-Link im Vorgang, Filterknöpfe (Vorgänge, Hinweise)
        c = await q.evaluate(JS, ['POST', '/api/cases', {'vehicle_id': vid, 'description': 'Spiegel lose (Tippziel)', 'priority': 'niedrig', 'driveability': 'fahrbereit', 'request_key': UN + '-c'}])
        if c['s'] != 201: _r(f'FEHLER: Meldung {c}')
        await q.evaluate(SCALE, 100)
        for route, sel in [(f"#/cases/{c['d']['id']}", '.backlink'), ('#/cases', '.seg-tabs a')]:
            await q.goto(B + '/' + route); await q.wait_for_timeout(1200)
            hs = await q.evaluate(f"() => [...document.querySelectorAll('{sel}')].map((e) => e.getBoundingClientRect().height)")
            _r(f'ok: Tippziel {sel} ≥ 44 px ({min(hs):.0f})' if hs and min(hs) >= 44 else f'FEHLER: Tippziel {sel} {hs}')
        await br.close()
asyncio.run(main())
