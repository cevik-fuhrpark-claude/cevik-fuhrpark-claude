# [CLAUDE] UI-Test Backlog 1015: Lager → neuer Artikel mit Anfangs-/Mindestbestand mit Einheit („5 Stück“, „2 Stk.“) angelegt; fremde Einheit
# („5 kg“ bei Stk) mit Hinweis in der App-Sprache, Artikel nicht angelegt; Werkstatt DE/UK/EN 390/820/1366 px. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WANT = {'de': 'Einheit passt nicht', 'uk': 'одиниця не відповідає', 'en': 'nit'}
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
pid = os.getpid()
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'le.inhaber', 'display_name': 'LE Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    if api('POST', '/api/login', {'username': 'le.inhaber', 'password': PW})['s'] != 200:
        ok = False
        for un in ['gm.inhaber', 'li.inhaber', 'kk.inhaber', 'mr.inhaber', 'i.inhaber']:
            if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: ok = True; break
        check(ok, 'Anmeldung Inhaber')
    env = api('GET', '/api/me')['d']['active_environment']; site = api('GET', '/api/meta')['d']['workshops'][0]['code']
    for i, lang in enumerate(['de', 'uk', 'en']):
      for j, (w, h) in enumerate([(390, 844), (820, 1180), (1366, 900)]):
        tag = f'{lang} {w}px'; un = f'le.ws{pid}{i}{j}'
        u = api('POST', '/api/users', {'username': un, 'display_name': 'LE WS', 'role': 'workshop', 'environment': env, 'workshop_site': site})
        c = br.new_context(viewport={'width': w, 'height': h}, service_workers='block'); q = c.new_page(); q.goto(B)
        q.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
        q.evaluate(JS, ['POST', '/api/login', {'username': un, 'password': PW}]); q.evaluate(JS, ['PATCH', '/api/me', {'language': lang}])
        errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B + '/#/stock'); q.reload(); q.wait_for_selector('#nf', state='attached', timeout=20000)
        q.evaluate("()=>{ const d=document.querySelector('#nf').closest('details'); if(d) d.open=true; }")
        bad = f'Filter X {pid}{i}{j}'; good = f'Filter {pid}{i}{j}'
        q.fill('#nf input[name=name]', bad); q.fill('#nf input[name=initial_qty]', '5 kg')
        q.click('#nf button.btn'); q.wait_for_selector('.toast.err', timeout=8000); msg = q.inner_text('.toast.err')
        check(WANT[lang] in msg, f'{tag}: fremde Einheit erklärt ({msg[:70]!r})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-artikel-{lang}-{w}.png')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach((x)=>x.remove())")
        q.fill('#nf input[name=name]', good); q.fill('#nf input[name=initial_qty]', '5 Stück'); q.fill('#nf input[name=min_qty]', '2 Stk.')
        q.click('#nf button.btn')
        for _ in range(40):
            items = q.evaluate(JS, ['GET', '/api/stock', None])['d']['items']; it = [x for x in items if x['name'] == good]
            if it: break
            q.wait_for_timeout(250)
        check(len(it) == 1 and it[0]['on_hand'] == 5 and it[0]['min_qty'] == 2, f'{tag}: Artikel mit Bestand 5 / Mindestbestand 2 angelegt')
        check(not [x for x in items if x['name'] == bad], f'{tag}: abgewiesener Artikel nicht angelegt')
        check(not q.evaluate("() => document.documentElement.scrollWidth > innerWidth + 1"), f'{tag}: ohne Querscrollen')
        check(not errs, f'{tag}: ohne Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print('FEHLER: ' + ' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
