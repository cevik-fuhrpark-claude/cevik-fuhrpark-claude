# [CLAUDE] UI-Test (18.10.2026, aus der Fehlersuche übernommen): Netzabbruch beim Foto-Upload des direkten Sendens – Foto wird nachgereicht.
# Nachstellung: Meldung online gesendet, Netz bricht beim Foto-Upload ab -> Fotos verloren (kein Postausgang), nur Hinweis "nicht hochgeladen".
# Im Postausgang-Weg werden Fotos in diesem Fall seit 17.10. aufbewahrt und nachgereicht; im direkten Weg (viewNew / viewDepartureCheck) nicht.
import asyncio, os, base64, tempfile
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN = 'VIN:WDB96340310779999'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fjcWfAAAAAElFTkSuQmCC')
FOTO = os.path.join(tempfile.gettempdir(), 'fs-e-foto.png'); open(FOTO, 'wb').write(PNG)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fe.inhaber', 'display_name': 'FE Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        await api('POST', '/api/login', {'username': 'fe.inhaber', 'password': PW})
        await api('POST', '/api/vehicles', {'plate': 'FE-FO 3', 'vin': VIN[4:], 'site': 'Dortmund'})
        dev = await br.new_context(viewport={'width': 390, 'height': 844}); q = await dev.new_page(); await q.goto(B)
        await q.evaluate(JS, ['POST', '/api/login', {'username': 'fe.inhaber', 'password': PW}])
        toasts = []
        await q.goto(B + '/#/new'); await q.wait_for_selector('#d')
        await q.locator(f'input[name=veh][value="{VIN}"]').check(force=True); await q.fill('#d', 'Delle Tür links FOTO-TEST')
        await q.set_input_files('#ph', FOTO)
        async def ab(route): await route.abort()
        await q.route('**/api/cases/*/files', ab)   # Netz bricht nach dem Anlegen der Meldung ab
        await q.click('#sb'); await q.wait_for_timeout(2000)
        t = await q.evaluate("[...document.querySelectorAll('.toast')].map(x=>x.textContent)")
        await q.unroute('**/api/cases/*/files', ab)
        await q.goto(B + '/#/'); await q.wait_for_timeout(2500)   # Netz wieder da, Postausgang würde jetzt senden
        c = [x for x in (await api('GET', '/api/cases?f=all'))['d']['cases'] if 'FOTO-TEST' in x['description']][0]
        files = (await api('GET', f"/api/cases/{c['id']}"))['d'].get('files', [])
        ob = await q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).map(([k,v])=>JSON.parse(v).length).reduce((a,b)=>a+b,0)")
        print('Hinweis:', t, '| Postausgang:', ob, '| Fotos am Vorgang nach Reconnect:', len(files))
        _r('FEHLER: Foto bei Netzabbruch im direkten Senden verloren (kein Nachreichen)' if not files else 'ok')
        await br.close()

asyncio.run(main())
