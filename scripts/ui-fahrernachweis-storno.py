# [CLAUDE] UI-Test (19.10.2026): Fahrernachweis stornieren – Tippfehler „gültig bis“ (2036) per „Stornieren“ mit Begründung,
# danach gilt der richtige Nachweis; Storno im Verlauf sichtbar (DE/UK), Handy 390 px ohne Querscrollen.
import asyncio, os
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B=os.environ.get('CFP_URL', 'http://localhost:8787'); PW='Sicheres-Passwort-2026'; 
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); q = await (await br.new_context(viewport={'width':390,'height':900})).new_page(); await q.goto(B)
        api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
        s = await api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dr.inh','display_name':'DR'})
        if s['s'] == 200: await api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW}); await api('POST','/api/login',{'username':'dr.inh','password':PW})
        d = await api('POST','/api/drivers',{'display_name':'Anna Probe'}); D=d['d']['id']
        t = await api('POST',f'/api/drivers/{D}/documents',{'kind':'fahrerkarte','valid_until':'2036-10-01','evidence':'Karte Tippfehler'})
        await api('POST',f'/api/drivers/{D}/documents',{'kind':'fahrerkarte','valid_until':'2026-10-01','evidence':'Karte richtig'})
        for lang in ['de','uk']:
            await api('PATCH','/api/me',{'language':lang}); await q.goto(B+'/#/'); await q.reload(); await q.goto(B+f'/#/drivers/{D}'); await q.wait_for_timeout(1200)
            if lang=='de':
                q.once('dialog', lambda dl: asyncio.ensure_future(dl.accept('Tippfehler im Jahr')))
                await q.locator(f"[data-dcancel=\"{t['d']['id']}\"]").click(); await q.wait_for_timeout(1500)
            await q.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            n = await q.locator('[data-ddoc-cancelled]').count(); sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            cur = await q.locator('table').first.inner_text()
            _r(f'ok: {lang} Storno sichtbar, richtiger Nachweis gilt, ohne Querscrollen' if n == 1 and sw <= 0 and 'Karte richtig' in cur and 'Tippfehler' not in cur else f'FEHLER: {lang} n={n} sw={sw} {cur!r}')
        await br.close()
asyncio.run(main())
