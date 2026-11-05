# [CLAUDE] UI-Test (05.11.2026, Backlog 1021, Folge aus 1020): Foto laut Kamera älter als der Schadenzeitpunkt bzw. heute.
# Meldeformular: älteres Galeriefoto (EXIF vor 20 Tagen) ohne Schadenzeitpunkt → Hinweis „Foto vom … – Schadenzeitpunkt angeben“;
# Schadenzeitpunkt vor dem Foto → kein Hinweis; danach → „vor dem angegebenen Schadenzeitpunkt“; Schnellwahl „heute“ → wieder Hinweis;
# Foto ohne EXIF → kein Hinweis; Schadenzeitpunkt bleibt leer (nichts vorbelegt). Abfahrtskontrolle: dasselbe Foto → „nicht von heute“.
# DE 390, UK 820, EN 1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, io, datetime
from playwright.sync_api import sync_playwright
from PIL import Image
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WORD = {'de': {'new': 'Schadenzeitpunkt angeben', 'occ': 'vor dem angegebenen', 'chk': 'nicht von heute'},
        'uk': {'new': 'вкажіть час пошкодження', 'occ': 'раніше за вказаний', 'chk': 'не сьогоднішнє'},
        'en': {'new': 'please enter when the damage occurred', 'occ': 'before the stated time', 'chk': 'not from today'}}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def jpeg(path, taken=None):
    im = Image.new('RGB', (1200, 900), (150, 120, 90))
    for x in range(0, 1200, 30):
        for y in range(0, 900, 3): im.putpixel((x, y), (255, 255, 255))
    b = io.BytesIO()
    if taken:
        ex = Image.Exif(); ex.get_ifd(0x8769)[0x9003] = taken; im.save(b, 'JPEG', quality=85, exif=ex)
    else: im.save(b, 'JPEG', quality=85)
    open(path, 'wb').write(b.getvalue())
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['fa.inhaber', 'lw.inhaber', 'as.inhaber', 'pa.inhaber', 'le.inhaber', 'inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, f'Anmeldung Inhaber ({owner})')
    today = datetime.date.fromisoformat(a.evaluate("new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    old = today - datetime.timedelta(days=20)
    tmp = os.environ.get('TMPDIR', '/tmp'); tag = uuid.uuid4().hex[:6]
    p1 = os.path.join(tmp, f'alt-{tag}.jpg'); p2 = os.path.join(tmp, f'ohne-{tag}.jpg')
    jpeg(p1, old.strftime('%Y:%m:%d') + ' 09:12:00'); jpeg(p2)
    for lang, w, h in [('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]:
        print('—', lang, w)
        vin = 'WDB9634032F' + str(uuid.uuid4().int)[:6]
        api('POST', '/api/vehicles', {'vin': vin, 'plate': 'FA-A ' + str(uuid.uuid4().int)[:3], 'site': 'Dortmund'})
        want = old.strftime('%d/%m/%Y') if lang == 'en' else old.strftime('%d.%m.%Y')
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/new/VIN:' + vin); q.reload(); q.wait_for_selector('#ph', state='attached', timeout=15000)
        note = q.locator('[data-photoold]')
        def shown(): q.wait_for_timeout(500); return note.is_visible(), (note.text_content() or '')
        q.set_input_files('#ph', [p2]); v, t = shown(); check(not v, f'{lang}/{w}: Foto ohne EXIF – kein Hinweis')
        q.set_input_files('#ph', [p2, p1]); v, t = shown()
        check(v and want in t and WORD[lang]['new'] in t, f'{lang}/{w}: ohne Schadenzeitpunkt → Hinweis ({t[:80]!r})')
        check(q.input_value('#occd') == '', f'{lang}/{w}: Schadenzeitpunkt nicht vorbelegt')
        if SHOTS: note.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/foto-alt-neu-{lang}-{w}.png')
        q.fill('#occd', (old - datetime.timedelta(days=2)).isoformat()); v, t = shown(); check(not v, f'{lang}/{w}: Schaden vor dem Foto → kein Hinweis')
        q.fill('#occd', (today - datetime.timedelta(days=5)).isoformat()); v, t = shown()
        check(v and want in t and WORD[lang]['occ'] in t, f'{lang}/{w}: Foto vor dem Schadenzeitpunkt → Hinweis ({t[:80]!r})')
        q.fill('#occd', ''); q.locator('[data-occd="0"]').first.click(); v, t = shown()
        check(v and WORD[lang]['occ'] in t, f'{lang}/{w}: Schnellwahl „heute“ → Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang}/{w}: ohne Querscrollen (Meldung)')
        q.goto(B + '/#/check'); q.wait_for_selector('#ph', state='attached', timeout=15000); q.select_option('#v', 'VIN:' + vin)
        note = q.locator('[data-photoold]')
        q.set_input_files('#ph', [p1]); v, t = shown()
        check(v and want in t and WORD[lang]['chk'] in t, f'{lang}/{w}: Abfahrtskontrolle → „nicht von heute“ ({t[:80]!r})')
        q.set_input_files('#ph', [p2]); v, t = shown(); check(not v, f'{lang}/{w}: Abfahrtskontrolle ohne EXIF – kein Hinweis')
        q.set_input_files('#ph', [p1]); shown()
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang}/{w}: ohne Querscrollen (Kontrolle)')
        if SHOTS: note.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/foto-alt-kontrolle-{lang}-{w}.png')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
