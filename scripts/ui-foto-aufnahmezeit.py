# [CLAUDE] UI-Test (05.11.2026, Backlog 1020) – Blickwinkel „Fahrer schickt ein Foto aus der Galerie statt mit der Kamera“:
# Vorgang mit Schadenzeitpunkt heute; über „Fotos/PDF hinzufügen“ wird (1) ein älteres Galeriefoto (EXIF-Aufnahme vor 20 Tagen, 2400×1800,
# wird im Browser verkleinert – EXIF muss vorher gelesen werden) und (2) ein Foto ohne EXIF hochgeladen. Unter (1) steht „📷 TT.MM.JJJJ HH:MM“
# und „vor dem Schaden aufgenommen“, unter (2) nichts davon. Gespeichert: taken_at nur an (1). DE 390, UK 820, EN 1366 px,
# ohne Querscrollen/Skriptfehler, Bildunterschrift in Kachelbreite. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, io, datetime
from playwright.sync_api import sync_playwright
from PIL import Image
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BEFORE = {'de': 'vor dem Schaden aufgenommen', 'uk': 'знято до пошкодження', 'en': 'taken before the damage'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def jpeg(path, color, taken=None):
    im = Image.new('RGB', (2400, 1800), color)
    for x in range(0, 2400, 40):  # Kanten, damit der Unschärfe-Hinweis nicht greift
        for y in range(0, 1800, 4): im.putpixel((x, y), (255, 255, 255))
    b = io.BytesIO()
    if taken:
        ex = Image.Exif(); ex.get_ifd(0x8769)[0x9003] = taken; im.save(b, 'JPEG', quality=85, exif=ex)
    else: im.save(b, 'JPEG', quality=85)
    open(path, 'wb').write(b.getvalue())
today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=1))).date()
old = today - datetime.timedelta(days=20)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'fa.inhaber', 'display_name': 'FA Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['fa.inhaber', 'lw.inhaber', 'as.inhaber', 'pa.inhaber', 'le.inhaber', 'inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, f'Anmeldung Inhaber ({owner})')
    tmp = os.environ.get('TMPDIR', '/tmp'); tag = uuid.uuid4().hex[:6]
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        vin = 'WDB9634032F' + str(uuid.uuid4().int)[:6]
        api('POST', '/api/vehicles', {'vin': vin, 'plate': 'FA-T ' + str(uuid.uuid4().int)[:3], 'site': 'Dortmund'})
        r = api('POST', '/api/cases', {'vehicle_id': 'VIN:' + vin, 'description': 'Spiegel abgefahren ' + tag, 'priority': 'mittel', 'driveability': 'fahrbereit', 'occurred_at': today.isoformat(), 'request_key': str(uuid.uuid4())})
        check(r['s'] == 201, f'{lang}: Vorgang mit Schadenzeitpunkt ({r["s"]})'); cid = r['d']['id']
        p1 = os.path.join(tmp, f'galerie-{tag}-{i}.jpg'); p2 = os.path.join(tmp, f'ohne-exif-{tag}-{i}.jpg')
        jpeg(p1, (150, 60, 40), old.strftime('%Y:%m:%d') + ' 14:03:27'); jpeg(p2, (40, 90, 150))
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': owner, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/cases/' + cid); q.reload(); q.wait_for_selector('#file', state='attached', timeout=15000)
        q.set_input_files('#file', [p1, p2])
        q.wait_for_selector('.thumbs figure.thumb:nth-of-type(2)', timeout=30000); q.wait_for_timeout(400)
        figs = q.locator('.thumbs figure.thumb')
        caps = [figs.nth(k).locator('figcaption').inner_text() for k in range(figs.count())]
        want = (old.strftime('%d/%m/%Y') if lang == 'en' else old.strftime('%d.%m.%Y')) + ' 14:03'
        check(len(caps) == 2, f'{lang}/{w}: zwei Fotos ({len(caps)})')
        check(figs.nth(0).locator('[data-taken]').count() == 1 and want in caps[0], f'{lang}/{w}: Aufnahmezeit am Galeriefoto ({caps[0]!r})')
        check(BEFORE[lang] in caps[0].replace('\n', ' '), f'{lang}/{w}: „{BEFORE[lang]}“')
        # kein Umbruch mitten im Wort (Rauchtest WORDSPLIT): jedes Wort des Hinweises steht in einer Zeile
        chip = figs.nth(0).locator('[data-taken-before]'); split = chip.evaluate("(e) => { const r = document.createRange(); const t = e.firstChild; let bad = 0; let pos = 0; for (const wd of t.textContent.split(' ')) { r.setStart(t, pos); r.setEnd(t, pos + wd.length); if (r.getClientRects().length > 1) bad++; pos += wd.length + 1; } return bad; }")
        check(split == 0, f'{lang}/{w}: Hinweis ohne Worttrennung ({split})')
        check(len(caps) > 1 and figs.nth(1).locator('[data-taken]').count() == 0 and BEFORE[lang] not in caps[1], f'{lang}/{w}: Foto ohne EXIF ohne Angabe')
        fl = api('GET', '/api/cases/' + cid)['d']['files']
        check([f.get('taken_at') for f in fl] == [old.isoformat() + 'T14:03', None], f'{lang}: gespeichert {[f.get("taken_at") for f in fl]}')
        check(all(f['size'] < 1500000 for f in fl), f'{lang}: verkleinert hochgeladen ({[f["size"] for f in fl]})')
        wid = q.evaluate("Math.max(...[...document.querySelectorAll('.thumbs figure.thumb figcaption')].map((e)=>e.scrollWidth - e.clientWidth))")
        check(wid <= 1, f'{lang}/{w}: Unterschrift in Kachelbreite (Überstand {wid}px)')
        check(q.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{lang}/{w}: ohne Querscrollen')
        title = figs.nth(0).get_attribute('title') or ''
        check(want in title, f'{lang}/{w}: Aufnahmezeit im Titel ({title[:70]!r})')
        if SHOTS: q.locator('.thumbs').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/foto-aufnahmezeit-{lang}-{w}.png')
        check(not errs, f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: ' + str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
