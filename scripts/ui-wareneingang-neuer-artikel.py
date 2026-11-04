# [CLAUDE] UI-Test (04.11.2026, Backlog 991, Blickwinkel „Wareneingang vom Lieferschein: Position mit Teilenummer, die es im Lager nicht gibt“):
# Werkstatt erfasst im Wareneingang Lieferant/Lieferschein und eine Position, die Suche der nächsten Position findet nichts → „neu anlegen“
# hervorgehoben, Teilenummer aus der Suche vorbelegt, Enter legt an und wählt (übrige Eingaben bleiben); anders geschriebene vorhandene
# Teilenummer → Verweis wählt den vorhandenen Artikel; gleiche Bezeichnung+Nummer → 409 wählt den vorhandenen; Buchen bucht alle.
# DE 390, UK 820, EN 1366; kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787); Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8787'); PW = 'Sicheres-Passwort-2026'; SHOTS = os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
noscroll = '()=>document.documentElement.scrollWidth<=innerWidth+1'
fails = []
def check(c, m):
    print(('  ✔ ' if c else '  ✘ ') + m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br = p.chromium.launch(); a = br.new_page(); a.goto(B)
    api = lambda m, pa, b=None: a.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'wn.inhaber', 'display_name': 'WN Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    owner = None
    for un in ['wn.inhaber', 'we.inhaber', 'tv.inhaber', 'sr.inhaber', 'th.inhaber', 'tk.inhaber', 'as.inhaber', 'pv.inhaber']:
        if api('POST', '/api/login', {'username': un, 'password': PW})['s'] == 200: owner = un; break
    check(owner is not None, 'Anmeldung Inhaber')
    envname = api('GET', '/api/me')['d']['active_environment']; tag = uuid.uuid4().hex[:4]
    wsu = f'wn.ws.{tag}'
    u = api('POST', '/api/users', {'username': wsu, 'display_name': 'WN Werkstatt', 'role': 'workshop', 'environment': envname, 'workshop_site': 'DORTMUND'})
    c0 = br.new_context(); q0 = c0.new_page(); q0.goto(B); q0.evaluate(JS, ['POST', '/api/invite/accept', {'token': u['d']['invite_token'], 'password': PW}])
    wsapi = lambda m, pa, b=None: q0.evaluate(JS, [m, pa, b])
    for k in range(8): wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Füllartikel {tag} {k}', 'part_number': f'F{tag}{k}'})  # Suchfeld ab 8 Artikeln
    for i, (lang, w, h) in enumerate([('de', 390, 844), ('uk', 820, 1180), ('en', 1366, 900)]):
        print('—', lang, w)
        n = str(uuid.uuid4().int)[:6]
        ia = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Ölfilter {n}', 'part_number': f'W{n}'})['d']['id']
        ib = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Bremsbelag {n}', 'part_number': f'A{n}01'})['d']['id']
        ic = wsapi('POST', '/api/stock', {'site': 'DORTMUND', 'name': f'Keilriemen {n}', 'part_number': f'K{n}'})['d']['id']
        wsapi('PATCH', '/api/me', {'language': lang})
        ctx = br.new_context(viewport={'width': w, 'height': h}); q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS, ['POST', '/api/login', {'username': wsu, 'password': PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B + '/#/stock/receipt'); q.wait_for_selector('#rcf', timeout=15000); T = q.evaluate(TR)
        L = lambda k, sel: f'#rclines .rcl:nth-child({k}) {sel}'
        q.fill('#rcsup', f'Teile Süd {n}'); q.fill('#rcdoc', f'LS-{n}')
        q.select_option(L(1, 'select'), ia); q.fill(L(1, '.rcq'), '3')
        check(q.inner_text(L(1, '[data-rcnew]')).strip() == '+ ' + T['rcn_open'], f'{lang}: Knopf „neu anlegen“ je Position')
        # Position 2: Teilenummer vom Lieferschein, die es nicht gibt
        q.click('#rcadd'); q.fill(L(2, '.stockq'), f'X {n} 77')
        check(q.locator(L(2, '[data-rcnhot]')).count() == 1, f'{lang}: Suche ohne Treffer hebt „neu anlegen“ hervor')
        q.click(L(2, '[data-rcnew]'))
        check(q.input_value(L(2, '[data-rcnpn]')) == f'X {n} 77' and q.input_value(L(2, '[data-rcnname]')) == '', f'{lang}: Teilenummer aus der Suche übernommen')
        check(T['rcn_hint'].split('{ws}')[0] in q.inner_text(L(2, '[data-rcnf]')), f'{lang}: Hinweis „ohne Bestand“')
        q.click(L(2, '[data-rcnsave]')); q.wait_for_timeout(300)
        check(q.locator(L(2, '[data-rcnf]:not([hidden])')).count() == 1 and q.locator('#rcdone').count() == 0, f'{lang}: ohne Bezeichnung nicht angelegt, nichts gebucht')
        q.fill(L(2, '[data-rcnname]'), f'Spannrolle {n}'); q.press(L(2, '[data-rcnname]'), 'Enter')
        q.wait_for_selector(L(2, '[data-rcnok]:not([hidden])'), timeout=10000)
        new_id = q.input_value(L(2, 'select'))
        check(bool(new_id) and new_id not in (ia, ib, ic) and T['rcn_done'] in q.inner_text(L(2, '[data-rcnok]')), f'{lang}: angelegt und gewählt')
        check(q.locator('#rcdone').count() == 0, f'{lang}: Enter hat nicht den Wareneingang gebucht')
        check(q.input_value(L(1, 'select')) == ia and q.input_value(L(1, '.rcq')) == '3' and q.input_value('#rcsup') == f'Teile Süd {n}' and q.input_value('#rcdoc') == f'LS-{n}', f'{lang}: übrige Eingaben bleiben')
        check(q.locator(f'{L(1, "select")} option[value="{new_id}"]').count() == 1, f'{lang}: neuer Artikel auch in anderen Positionen wählbar')
        q.fill(L(2, '.rcq'), '2'); q.fill(L(2, '.rcp'), '12,40' if lang != 'en' else '12.40')
        # Position 3: vorhandene Teilenummer in anderer Schreibweise → Verweis
        q.click('#rcadd'); q.click(L(3, '[data-rcnew]')); q.fill(L(3, '[data-rcnname]'), f'Belag vorn {n}'); q.fill(L(3, '[data-rcnpn]'), f'A-{n}-01')
        check(q.locator(L(3, f'[data-rcnuse="{ib}"]')).count() == 1, f'{lang}: anders geschriebene Teilenummer → vorhandener Artikel angeboten')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wareneingang-neu-{lang}-{w}.png', full_page=True)
        check(q.evaluate(noscroll), f'{lang}: ohne Querscrollen (Anlegen offen)')
        q.click(L(3, f'[data-rcnuse="{ib}"]'))
        check(q.input_value(L(3, 'select')) == ib and T['rcn_taken'] in q.inner_text(L(3, '[data-rcnok]')), f'{lang}: vorhandener Artikel gewählt')
        q.fill(L(3, '.rcq'), '4')
        # Position 4: gleiche Bezeichnung + Nummer (anders geschrieben) → 409 → vorhandener Artikel
        q.click('#rcadd'); q.click(L(4, '[data-rcnew]')); q.fill(L(4, '[data-rcnname]'), f'keilriemen  {n}'); q.fill(L(4, '[data-rcnpn]'), '')
        q.fill(L(4, '[data-rcnpn]'), f'K {n}'); q.evaluate("(s) => { const d = document.querySelector(s); d.hidden = true; }", L(4, '[data-rcndup]'))
        q.click(L(4, '[data-rcnsave]')); q.wait_for_selector(L(4, '[data-rcnok]:not([hidden])'), timeout=10000)
        check(q.input_value(L(4, 'select')) == ic, f'{lang}: 409 wählt vorhandenen Artikel (kein zweiter)')
        q.fill(L(4, '.rcq'), '1')
        check(T['rcpt_count'].replace('{n}', '4') in q.inner_text('#rcsum'), f'{lang}: Zähler 4 Positionen')
        q.click('#rcbook'); q.wait_for_selector('#rcdone', timeout=10000)
        check(T['rcpt_done'].replace('{n}', '4') in q.inner_text('#rcdone'), f'{lang}: alle Positionen gebucht')
        dn = wsapi('GET', f'/api/stock/{new_id}')['d']['item']
        check(dn['on_hand'] == 2 and dn['unit_price_net'] == 12.4 and dn['part_number'] == f'X {n} 77' and dn['site'] == 'DORTMUND', f'{lang}: neuer Artikel mit Bestand/Preis aus dem Wareneingang')
        allk = [x for x in wsapi('GET', '/api/stock')['d']['items'] if n in x['name']]
        check(len(allk) == 4, f'{lang}: keine doppelten Artikel ({len(allk)})')
        check(not errs, f'{lang}: keine Skriptfehler {errs[:1]}'); ctx.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: ' + ' | '.join(fails))
raise SystemExit(1 if fails else 0)
