# [CLAUDE] UI-Test (19.10.2026, aus der Fehlersuche übernommen) – Fahrer am Handy (390 px):
# 1. Schadensmeldung: Enter im Fahrzeug-Suchfeld sendet nicht ab, ein durch den Filter ausgeblendetes, vorausgewähltes Fahrzeug wird abgewählt
#    (vorher ging die Meldung an das verdeckte Fahrzeug).
# 2. Abfahrtskontrolle: bei mehreren zugeordneten Fahrzeugen keine stille Vorauswahl (vorher das letzte), bei genau einem vorausgewählt.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
V1, V2 = 'WDB96340310777001', 'WDB96340310777002'

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fa.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'FA-AW 1', 'vin': V1, 'site': 'Dortmund'})
        await api('POST', '/api/vehicles', {'plate': 'FA-AW 2', 'vin': V2, 'site': 'Dortmund'})
        async def drv(name, vins):
            r = await api('POST', '/api/users', {'username': name, 'display_name': 'Fahrer ' + name, 'role': 'driver', 'environment': 'production'})
            for v in vins: await api('POST', f'/api/vehicles/VIN:{v}/drivers', {'user_id': r['d']['id']})
            q = await (await br.new_context(viewport={'width': 390, 'height': 844}, locale='de-DE')).new_page(); await q.goto(B)
            await q.evaluate(JS, ['POST', '/api/invite/accept', {'token': r['d']['invite_token'], 'password': PW}])
            await q.goto(B + '/#/'); await q.wait_for_timeout(800)
            return q
        # 1. ein Fahrzeug zugeordnet → vorausgewählt; Suche nach dem anderen + Enter
        q = await drv('fa.fahrer.eins', [V1])
        await q.goto(B + '/#/new'); await q.wait_for_selector('#d'); await q.wait_for_timeout(300)
        pre = await q.evaluate("(document.querySelector('input[name=veh]:checked')||{}).value")
        _r('ok: Vorauswahl bei genau einem Fahrzeug' if pre == 'VIN:' + V1 else f'FEHLER: Vorauswahl erwartet VIN:{V1}, erhalten {pre}')
        await q.fill('#d', 'Ladebordwand klemmt')
        await q.fill('#vq', 'AW 2'); await q.press('#vq', 'Enter'); await q.wait_for_timeout(1500)
        cases = (await q.evaluate(JS, ['GET', '/api/cases?f=all']))['d']['cases']
        _r('ok: Enter im Suchfeld sendet nicht' if not any('Ladebordwand' in c['description'] for c in cases) else 'FEHLER: Enter im Suchfeld hat die Meldung gesendet')
        chk = await q.evaluate("(document.querySelector('input[name=veh]:checked')||{}).value || ''")
        _r('ok: ausgeblendetes Fahrzeug abgewählt' if chk == '' else f'FEHLER: ausgeblendetes Fahrzeug bleibt gewählt ({chk})')
        # 2. Abfahrtskontrolle mit zwei zugeordneten Fahrzeugen
        q2 = await drv('fa.fahrer.zwei', [V1, V2])
        await q2.goto(B + '/#/check'); await q2.wait_for_selector('#v'); await q2.wait_for_timeout(300)
        v = await q2.eval_on_selector('#v', 'e => e.value')
        _r('ok: keine stille Vorauswahl bei zwei Fahrzeugen' if v == '' else f'FEHLER: Kontrolle vorausgewählt auf {v}')
        await q.goto(B + '/#/check'); await q.wait_for_selector('#v'); await q.wait_for_timeout(300)
        v1 = await q.eval_on_selector('#v', 'e => e.value')
        _r('ok: Kontrolle bei genau einem Fahrzeug vorausgewählt' if v1 == 'VIN:' + V1 else f'FEHLER: Kontrolle-Vorauswahl {v1}')
        await br.close()

asyncio.run(main())
