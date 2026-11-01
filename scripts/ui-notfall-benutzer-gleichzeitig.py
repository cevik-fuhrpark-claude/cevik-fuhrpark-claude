# [CLAUDE] UI-Test (01.11.2026, Backlog 812, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“):
# 1) Notfallnummer: Leitung A hat „Bearbeiten“ offen, Leitung B ändert inzwischen die Rufnummer. A ändert Bezeichnung und Wochentage und
#    speichert. Vorher: Meldung „zwischenzeitlich geändert“, Eingaben verloren. Jetzt: Formular lädt neu, Bezeichnung und Wochentage von A
#    bleiben, Rufnummer von B steht drin und ist markiert; zweites Speichern übernimmt beides.
# 2) Benutzer bearbeiten: A korrigiert den Namen, B hat inzwischen die Rolle geändert. Vorher setzte A die Rolle still zurück.
#    Jetzt: 409, Formular öffnet mit der neuen Rolle (markiert) und dem Namen von A; Speichern übernimmt beides. DE 390 / UK 820 / EN 1366 px.
import asyncio, os, random
def _r(m):
    print(m)
    if m.startswith('FEHLER'): raise SystemExit(1)
from playwright.async_api import async_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; OUT = os.environ.get('CFP_SHOTS', '')
JS = """async ([m, path, body]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
RUN = f'{random.randint(0, 999):03d}'
OTHER = {'de': 'Von der anderen Person geändert', 'uk': 'Змінено іншою особою', 'en': 'Changed by the other person'}

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        adm = await (await br.new_context()).new_page(); await adm.goto(B)
        api = lambda m, pa, b=None: adm.evaluate(JS, [m, pa, b])
        s = await api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'tz.inhaber', 'display_name': 'TZ Inhaber'})
        if s['s'] == 200: await api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
        _r('ok: Inhaber angemeldet' if (await api('POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}))['s'] == 200 else 'FEHLER: Anmeldung')
        for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
            await api('PATCH', '/api/me', {'language': lang})
            c = await api('POST', '/api/emergency/contacts', {'kind': 'dispo', 'label': f'Dispo 812 {RUN} {lang}', 'phone': f'0231 812{RUN}{i}'})
            cid = (c['d'] or {}).get('id')
            if not cid:
                lst = (await api('GET', '/api/emergency/contacts'))['d']['contacts']; cid = next((x['id'] for x in lst if x['label'] == f'Dispo 812 {RUN} {lang}'), None)
            _r(f'ok: {lang} Notfallnummer angelegt' if cid else f'FEHLER: Anlage {c}')
            u = await api('POST', '/api/users', {'username': f'tz.gl812.{RUN}.{lang}', 'display_name': f'Fahrer 812 {lang}', 'role': 'driver', 'environment': 'test'})
            uid = (u['d'] or {}).get('id')
            _r(f'ok: {lang} Benutzer angelegt' if uid else f'FEHLER: Benutzer {u}')
            ctx = await br.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            q = await ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
            q.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await q.goto(B); await q.evaluate(JS, ['POST', '/api/login', {'username': 'tz.inhaber', 'password': PW}])
            # --- 1) Notfallnummer
            await q.goto(B + '/#/emergency/edit'); await q.reload()
            await q.wait_for_selector(f'[data-emedit="{cid}"]', timeout=20000)
            await q.click(f'[data-emedit="{cid}"]')
            await q.wait_for_selector('#emf [name=expected_updated_at]', state='attached', timeout=20000)
            up = await q.input_value('#emf [name=expected_updated_at]')
            rb = await api('PATCH', f'/api/emergency/contacts/{cid}', {'kind': 'dispo', 'label': f'Dispo 812 {RUN} {lang}', 'phone': f'0231 999{RUN}{i}', 'expected_updated_at': up})
            _r(f'ok: {lang} Leitung B hat die Rufnummer geändert' if rb['s'] == 200 else f'FEHLER: B {rb}')
            await q.fill('#emf [name=label]', f'Dispo 812 {RUN} {lang} Nacht')
            await q.check('#emf [data-emwd="1"]'); await q.check('#emf [data-emwd="2"]')
            await q.click('#emf button.btn:not(.secondary)')
            await q.wait_for_selector('#emf [data-ctlost]', timeout=20000)
            txt = await q.inner_text('#emf [data-ctlost]')
            _r(f'ok: {lang} Notfallnummer: Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis {txt}')
            lb = await q.input_value('#emf [name=label]'); ph = await q.input_value('#emf [name=phone]')
            wd = await q.evaluate("() => [...document.querySelectorAll('#emf [data-emwd]')].filter((x) => x.checked).map((x) => x.dataset.emwd).join('')")
            _r(f'ok: {lang} eigene Bezeichnung und Wochentage behalten, Rufnummer von B übernommen' if lb.endswith('Nacht') and ph == f'0231 999{RUN}{i}' and wd == '12' else f'FEHLER: {lang} Formular {lb} {ph} {wd}')
            mark = await q.evaluate("() => document.querySelector('#emf [name=phone]').classList.contains('ct-other') && !document.querySelector('#emf [name=label]').classList.contains('ct-other')")
            _r(f'ok: {lang} nur Rufnummer markiert' if mark else f'FEHLER: {lang} Markierung')
            await q.wait_for_timeout(400)  # Hinweis wird nach dem Wiederherstellen der Scrollposition eingeblendet
            vis = await q.evaluate("() => { const r = document.querySelector('#emf [data-ctlost]').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight, scrollY]; }")
            _r(f'ok: {lang} Konflikthinweis im sichtbaren Bereich' if vis[0] >= 0 and vis[1] <= vis[2] else f'FEHLER: {lang} Hinweis nicht sichtbar {vis}')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen (Notfallnummer)' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT: await q.screenshot(path=f'{OUT}/notfall-gleichzeitig-{lang}-{w}.png')
            await q.click('#emf button.btn:not(.secondary)')
            row = {}
            for _ in range(40):
                await q.wait_for_timeout(250)
                row = next((x for x in (await api('GET', '/api/emergency/contacts'))['d']['contacts'] if x['id'] == cid), {})
                if row.get('label', '').endswith('Nacht'): break
            ok2 = row.get('label', '').endswith('Nacht') and row.get('phone') == f'0231 999{RUN}{i}' and (row.get('hours') or {}).get('days') == '12'
            _r(f'ok: {lang} zweites Speichern: Bezeichnung, Wochentage und Rufnummer erhalten' if ok2 else f'FEHLER: {lang} gespeichert {row}')
            await api('POST', f'/api/emergency/contacts/{cid}/archive')
            # --- 2) Benutzer bearbeiten
            await q.goto(B + '/#/users'); await q.wait_for_selector(f'[data-ue="{uid}"]', timeout=20000)
            await q.click(f'[data-ue="{uid}"]'); await q.wait_for_selector('#uef', timeout=10000)
            rb = await api('PATCH', f'/api/users/{uid}', {'role': 'viewer'})
            _r(f'ok: {lang} Leitung B hat die Rolle geändert' if rb['s'] == 200 else f'FEHLER: B Rolle {rb}')
            await q.fill('#uen', f'Fahrer 812 {lang} Weber')
            await q.click('#uef button.btn:not(.secondary)')
            await q.wait_for_selector('#uef [data-ctlost]', timeout=20000)
            txt = await q.inner_text('#uef [data-ctlost]')
            _r(f'ok: {lang} Benutzer: Hinweis nennt Feld der anderen Person' if OTHER[lang] in txt else f'FEHLER: {lang} Hinweis Benutzer {txt}')
            nm = await q.input_value('#uen'); rl = await q.input_value('#uer')
            mark = await q.evaluate("() => document.querySelector('#uer').classList.contains('ct-other') && !document.querySelector('#uen').classList.contains('ct-other')")
            _r(f'ok: {lang} eigener Name behalten, neue Rolle steht drin und ist markiert' if nm.endswith('Weber') and rl == 'viewer' and mark else f'FEHLER: {lang} Benutzerformular {nm} {rl} {mark}')
            ur = next((x for x in (await api('GET', '/api/users'))['d']['users'] if x['id'] == uid), {})
            _r(f'ok: {lang} Rolle der anderen Person nicht zurückgesetzt' if ur.get('role') == 'viewer' else f'FEHLER: {lang} Rolle {ur.get("role")}')
            sw = await q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            _r(f'ok: {lang} {w}px ohne Querscrollen (Benutzer)' if sw <= 0 else f'FEHLER: Querscrollen {sw}')
            if OUT: await q.screenshot(path=f'{OUT}/benutzer-gleichzeitig-{lang}-{w}.png')
            await q.click('#uef button.btn:not(.secondary)')
            for _ in range(40):
                await q.wait_for_timeout(250)
                ur = next((x for x in (await api('GET', '/api/users'))['d']['users'] if x['id'] == uid), {})
                if ur.get('display_name', '').endswith('Weber'): break
            _r(f'ok: {lang} zweites Speichern: Name und Rolle erhalten' if ur.get('display_name', '').endswith('Weber') and ur.get('role') == 'viewer' else f'FEHLER: {lang} Benutzer gespeichert {ur}')
            _r(f'ok: {lang} keine Skriptfehler' if not errs else f'FEHLER: {errs}')
            await ctx.close()
        await br.close()
asyncio.run(main())
