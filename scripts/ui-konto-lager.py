# [CLAUDE] UI-Test (19.10.2026) – Funde der Fehlersuche Konto/Lager:
# 1. Mein Konto (EN, 390 px): Passwort ändern leert das Formular und schließt es; Chip „2FA“ folgt dem Zustand ohne Neuaufbau.
# 2. Lager (UK, 390 px): „Bestand reicht nicht“ nennt die verfügbare Menge; Zahlgrenzen im Zahlformat der Sprache.
# 3. Fahrer: Lagerjournal/Bestand zum Stichtag zeigen keine Formulare.
import os, hmac, hashlib, struct, time, base64
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; PW2 = 'Neues-Passwort-2026k'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
def totp(secret):
    k = base64.b32decode(secret + '=' * (-len(secret) % 8)); c = int(time.time()) // 30
    h = hmac.new(k, struct.pack('>Q', c), hashlib.sha1).digest(); o = h[-1] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1000000)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'kl.inhaber', 'display_name': 'KL Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    check(api('POST', '/api/login', {'username': 'kl.inhaber', 'password': PW})['s'] == 200, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    pid = os.getpid()
    users = {}
    for un, role, lang, extra in [('kl.fleet%d' % pid, 'fleet', 'en', {}), ('kl.ws%d' % pid, 'workshop', 'uk', {'workshop_site': site}), ('kl.drv%d' % pid, 'driver', 'en', {})]:
        u = api('POST', '/api/users', {'username': un, 'display_name': un, 'role': role, 'environment': env, **extra})
        c = br.new_context(viewport={'width': 390, 'height': 844}); pg = c.new_page(); pg.goto(B)
        pg.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        pg.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); pg.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        users[role] = pg
    # 1. Mein Konto
    q = users['fleet']; q.goto(B + '/#/more'); q.wait_for_selector('#pw', state='attached')
    q.locator('#pw').locator('xpath=ancestor::details[1]/summary').click()
    q.fill('#pw input[name=old_password]', PW); q.fill('#pw input[name=new_password]', PW2); q.locator('#pw button').click()
    q.wait_for_function("() => !document.querySelector('#pw').closest('details').open", timeout=8000)
    check(q.input_value('#pw input[name=old_password]') == '' and q.input_value('#pw input[name=new_password]') == '', 'Passwortformular geleert und geschlossen')
    check(q.locator('#pw input[name=new_password]').get_attribute('maxlength') == '200', 'Feld neues Passwort maxlength 200')
    check(q.locator('#tfchip').is_hidden(), 'Chip 2FA anfangs verborgen')
    q.locator('#tfa > summary').click(); q.wait_for_selector('#tfabox button')
    st = q.evaluate(JS, ['POST', '/api/me/totp/setup', {'password': PW2}])
    sec = (st['d'] or {}).get('secret')
    if sec:
        q.evaluate(JS, ['POST', '/api/me/totp/enable', {'code': totp(sec)}])
        q.evaluate("() => { const d = document.querySelector('#tfa'); d.open = false; d.open = true; }")
        q.wait_for_function("() => !document.querySelector('#tfchip').hidden", timeout=8000)
        check(True, 'Chip 2FA erscheint nach dem Einschalten ohne neuen Aufruf von „Mehr“')
    else: check(False, 'TOTP-Einrichtung (Antwort ohne secret: %s)' % st)
    # 2. Lager UK
    w = users['workshop']
    it = w.evaluate(JS, ['POST', '/api/stock', {'name': 'KL Filter %d' % pid, 'initial_qty': 1}])['d']['id']
    w.goto(B + '/#/stock/' + it); w.wait_for_selector('h1')
    f = w.locator('#mf'); f.locator('select[name=type]').select_option('entnahme'); f.locator('input[name=qty]').fill('5'); f.locator('button').first.click()
    w.wait_for_selector('.toast, #toast', timeout=8000); w.wait_for_timeout(300)
    msg = w.inner_text('body')
    check('доступно: 1' in msg, 'UK-Meldung nennt verfügbare Menge')
    # 3. Fahrer
    d = users['driver']
    for h in ['#/stock/journal', '#/stock/asof']:
        d.goto(B + '/' + h); d.wait_for_timeout(800)
        check(d.locator('main form, #app form').count() == 0 and 'No permission' in d.inner_text('body'), f'Fahrer {h}: kein Formular, Hinweis')
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
