# [CLAUDE] UI-Test (22.10.2026, Backlog 132): großer Bestand am Handy – Lagerjournal mit > 100 Buchungen als Kartenliste nur sichtbare
# Karten layouten (content-visibility, nicht im Druck, nicht am PC), Lagersuche ab 300 Artikeln entprellt (Druck/CSV direkt nach dem Tippen
# mit der Suche), QR-Bogen mit allen Fahrzeugen und Zeilenrechtecken im SVG. 390/820/1366 px, DE/UK/EN, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (legt ~330 Artikel, 260 Buchungen, 40 Fahrzeuge an).
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SEED = """async () => { const h = { 'content-type': 'application/json', 'x-cfp': '1' };
  const post = (p, b) => fetch(p, { method: 'POST', headers: h, body: JSON.stringify(b) }).then((r) => r.json());
  const it = await post('/api/stock', { name: 'GB Kabelbinder', unit: 'Stk', initial_qty: 10000, unit_price_net: '0,5', site: 'DORTMUND' });
  for (let i = 0; i < 260; i += 20) await Promise.all(Array.from({ length: 20 }, (_, k) => post('/api/stock/' + it.id + '/movements', { type: 'entnahme', qty: 1 + ((i + k) % 3), note: 'GB-Buchung ' + (i + k) })));
  for (let i = 0; i < 320; i += 20) await Promise.all(Array.from({ length: 20 }, (_, k) => post('/api/stock', { name: (i + k) % 10 === 3 ? 'GB Bremsbelag ' + (i + k) : 'GB Filter ' + (i + k), part_number: 'GB-' + (i + k), unit: 'Stk', initial_qty: 1, site: 'DORTMUND' })));
  for (let i = 0; i < 40; i += 10) await Promise.all(Array.from({ length: 10 }, (_, k) => post('/api/vehicles', { plate: 'GB-QR ' + (100 + i + k), vin: 'WDB9634031088' + String(1000 + i + k), site: 'Dortmund' })));
  return it.id; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gb.inhaber','display_name':'GB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    a.evaluate(SEED)
    nveh=len(api('GET','/api/vehicles')['d']['vehicles'])
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in ([(390,844),(820,1180),(1366,900)] if lang=='de' else [(390,844)]):
        c=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gb.inhaber','password':PW}])
        tag=f'{lang} {w}px'
        # Lagerjournal: > 100 Zeilen → bigstack; am Handy content-visibility auto, im Druck/PC sichtbar; letzte Karte erreichbar
        q.goto(B+'/#/stock/journal'); q.wait_for_selector('table.stack tbody tr')
        n=q.locator('table.stack tbody tr').count(); check(n>=260,f'{tag}: Journal {n} Zeilen')
        check(q.locator('table.stack.bigstack').count()==1,f'{tag}: Klasse bigstack')
        cv=q.evaluate("getComputedStyle(document.querySelector('table.bigstack tbody tr')).contentVisibility")
        check(cv==('auto' if w<=600 else 'visible'),f'{tag}: content-visibility {cv}')
        q.evaluate("window.scrollTo(0, document.body.scrollHeight)"); q.wait_for_timeout(300)
        last=q.locator('table.bigstack tbody tr').last; check(last.is_visible() and 'GB' in last.inner_text(),f'{tag}: letzte Karte sichtbar')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Journal ohne Querscrollen')
        if SHOTS and lang=='de': q.screenshot(path=f'{SHOTS}/grossbestand-journal-{w}.png')
        q.emulate_media(media='print'); check(q.evaluate("getComputedStyle(document.querySelector('table.bigstack tbody tr')).contentVisibility")=='visible',f'{tag}: Druck ohne content-visibility'); q.emulate_media(media='screen')
        # Lagersuche: > 300 Artikel → entprellt; Ergebnis nach kurzer Pause, CSV direkt nach dem Tippen enthält nur die Treffer
        q.goto(B+'/#/stock'); q.wait_for_selector('#sl a')
        total=q.locator('#sl a').count(); check(total>300,f'{tag}: {total} Artikel')
        q.fill('#q','bremsbelag'); q.wait_for_timeout(400)
        shown=q.locator('#sl a:not([hidden])').count(); check(shown==32,f'{tag}: Suche „bremsbelag“ → {shown} (32 erwartet)')
        check(str(shown) in q.locator('#sfsum').inner_text(),f'{tag}: Summenzeile nennt Treffer')
        q.fill('#q','gb filter 1')
        with q.expect_request(lambda r: r.url.endswith('/api/stock/export')) as rq:
            with q.expect_download() as dl: q.click('#scsv')
        ids=(rq.value.post_data_json or {}).get('ids',[])
        exp=q.locator('#sl a:not([hidden])').count()
        check(len(ids)==exp and 0<exp<total,f'{tag}: CSV direkt nach dem Tippen mit Suche ({len(ids)} = {exp})')
        if SHOTS and lang=='de': q.screenshot(path=f'{SHOTS}/grossbestand-lager-{w}.png')
        # QR-Bogen: alle Fahrzeuge, Pfad aus Rechtecken
        q.goto(B+'/#/vehicles/qr'); q.wait_for_selector('.qrcard')
        q.click('[data-qk=all]'); q.wait_for_selector('.qrcard')
        cards=q.locator('.qrcard').count(); check(cards==nveh,f'{tag}: QR-Bogen {cards}/{nveh} Fahrzeuge')
        d=q.locator('.qrcard svg path').first.get_attribute('d') or ''
        check(bool(re.fullmatch(r'(M\d+,\d+h\d+v1h-\d+z)+',d)) and re.search(r'h([2-9]|\d\d)v1',d) is not None,f'{tag}: QR-Pfad aus Zeilenrechtecken')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: QR-Bogen ohne Querscrollen')
        if SHOTS and lang=='de': q.screenshot(path=f'{SHOTS}/grossbestand-qr-{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER:',len(fails)) if fails else print('Alles grün')
raise SystemExit(1 if fails else 0)
