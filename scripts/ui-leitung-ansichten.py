# [CLAUDE] UI-Test (19.10.2026, aus der Fehlersuche übernommen) – Leitung/Inhaber am PC (1440 px):
# 1. Kostenbericht/Kennzahlen: ungültiger Zeitraum („Von“ nach „Bis“) sperrt die Seite nicht – Formular bleibt, Meldung als Hinweis.
# 2. km-Nachtrag mit Begründung: Hinweis in der Oberflächensprache (EN), Zahl/Datum je Sprache.
# 3. Außer Betrieb genommenes Fahrzeug: kein Formular „Fahrer zuordnen“.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'WDB96340310888001'

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        q = await (await br.new_context(viewport={'width': 1440, 'height': 900}, locale='de-DE')).new_page(); await q.goto(B)
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'la.inhaber', 'display_name': 'LA Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'la.inhaber', 'password': PW})
        await api('PATCH', '/api/me', {'language': 'de'})
        await api('POST', '/api/vehicles', {'plate': 'LA-AN 1', 'vin': VIN, 'site': 'Dortmund'})
        for view, form in [('costs', '#cr'), ('kpi', '#kf2')]:
            await q.goto(B + '/#/' + view); await q.wait_for_selector(form)
            await q.fill(form + ' [name=from]', '2026-10'); await q.fill(form + ' [name=to]', '2026-01')
            await q.eval_on_selector(form, 'f => f.requestSubmit()'); await q.wait_for_timeout(1200)
            ok = await q.locator(form).count() > 0
            _r(f'ok: {view} – Formular nach ungültigem Zeitraum weiter da' if ok else f'FEHLER: {view} – Seite nach ungültigem Zeitraum gesperrt')
        await api('PATCH', '/api/me', {'language': 'en'})
        await api('POST', f'/api/vehicles/VIN:{VIN}/odometer', {'km': 100000})
        await q.goto(B + '/#/'); await q.reload(); await q.wait_for_timeout(500)
        await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_selector('#kf', state='attached')
        await q.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
        await q.fill('#kf [name=km]', '90000')
        await q.eval_on_selector('#kf', 'f => f.requestSubmit()'); await q.wait_for_timeout(1200)  # erst Rückfrage: Begründung nötig
        await q.fill('#kf [name=note]', 'Tacho swap')
        await q.eval_on_selector('#kf', 'f => f.requestSubmit()'); await q.wait_for_timeout(1500)
        toasts = await q.eval_on_selector_all('.toast', 'es => es.map(e => e.textContent)')
        print('Hinweise:', toasts)
        _r('ok: km-Hinweis in EN' if any('Deviation saved with reason' in x and '100,000' in x for x in toasts) else 'FEHLER: km-Hinweis nicht in EN')
        await api('POST', f'/api/vehicles/VIN:{VIN}/active', {'active': False, 'reason': 'Verkauf'})
        await q.goto(B + '/#/'); await q.goto(B + f'/#/vehicles/VIN:{VIN}'); await q.wait_for_timeout(1200)
        _r('ok: kein „Fahrer zuordnen“ bei außer Betrieb' if await q.locator('#df').count() == 0 else 'FEHLER: Zuordnungsformular bei außer Betrieb')
        await br.close()

asyncio.run(main())
