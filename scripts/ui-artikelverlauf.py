# [CLAUDE] UI-Test: Lagerliste mit Lagerwert (Bestand × Preis, unbewertet statt 0 €); Artikelakte mit mehr als 200 Buchungen → Hinweis + „Im Lagerjournal anzeigen“ → Journal nur dieses Artikels
# (Artikel-Chip, alle 201 Buchungen), „Alle Artikel“ hebt die Eingrenzung auf, Lagerliste setzt sie zurück. DE/UK/EN bei 390/820/1366 px,
# Artikelakte druckbar (Vermerk, ohne Formulare). Kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BULK = """async ([id, n]) => { for (let k = 0; k < n; k++) { const r = await fetch(`/api/stock/${id}/movements`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: JSON.stringify({ type: 'zugang', qty: '1', note: 'Verlauf ' + k }) }); if (!r.ok) return r.status; } return 0; }"""
JOURNAL={'de':'Lagerjournal','uk':'Журнал складу','en':'Stock journal'}
VAL={'de':'Lagerwert','uk':'вартість складу','en':'stock value'}
UNV={'de':'unbewertet','uk':'неоцінено','en':'unvalued'}
ALL={'de':'Alle Artikel','uk':'Усі артикули','en':'All items'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'av.inhaber','display_name':'AV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'av.inhaber','password':PW})
    u=api('POST','/api/users',{'username':'av.werkstatt','display_name':'AV Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    if u['s'] in (200,201): api('POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'av.werkstatt','password':PW})
    big=api('POST','/api/stock',{'name':'Verlaufsartikel UI','part_number':'VA-UI','unit':'Stk','initial_qty':1})['d']['id']
    small=api('POST','/api/stock',{'name':'Kleiner Artikel UI','unit':'Stk','initial_qty':2})['d']['id']
    api('POST','/api/stock',{'name':'Mindestartikel UI','unit':'Stk','initial_qty':1,'min_qty':5})
    api('POST','/api/stock',{'name':'Preisartikel UI','unit':'Stk','initial_qty':4,'unit_price_net':2.5})
    check(a.evaluate(BULK,[big,200])==0,'200 Zugänge gebucht')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'av.werkstatt','password':PW}])
        # Lagerwert der angezeigten Artikel: nur mit Preis, sonst „unbewertet“/„–“ (nie 0 €)
        q.goto(B+'/#/stock'); q.wait_for_selector('#sfsum:not([hidden])')
        check('10,00' in q.inner_text('#sfsum') and VAL[lang] in q.inner_text('#sfsum') and '3 '+UNV[lang] in q.inner_text('#sfsum'),f'{lang} {w}px: Lagerwert mit unbewerteten Artikeln ({q.inner_text("#sfsum")!r})')
        q.fill('#q','Kleiner'); q.wait_for_timeout(100)
        check(VAL[lang]+' –' in q.inner_text('#sfsum') and '0,00' not in q.inner_text('#sfsum'),f'{lang} {w}px: nur unbewertete Artikel → „–“ statt 0 € ({q.inner_text("#sfsum")!r})')
        q.fill('#q','Preisartikel'); q.wait_for_timeout(100)
        check('10,00' in q.inner_text('#sfsum') and UNV[lang] not in q.inner_text('#sfsum'),f'{lang} {w}px: Suche grenzt Lagerwert ein')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lagerwert_{lang}_{w}.png')
        q.goto(B+'/#/stock/reorder'); q.wait_for_selector('#rosum')
        check(q.inner_text('#rosum').split(':',1)[1].strip().startswith('–') and '0,00' not in q.inner_text('#rosum'),f'{lang} {w}px: Bestellvorschlag ohne Preis „–“ statt 0 € ({q.inner_text("#rosum")!r})')
        q.goto(B+'/#/stock/'+small); q.wait_for_selector('#histjournal')
        check(q.locator('#histtrunc').count()==0,f'{lang} {w}px: wenige Buchungen ohne Hinweis')
        q.goto(B+'/#/stock/'+big); q.wait_for_selector('#histtrunc')
        check('200' in q.inner_text('#histtrunc'),f'{lang} {w}px: Hinweis „letzte 200 Buchungen“')
        check(q.locator('table.stack tbody tr').count()==200,f'{lang} {w}px: 200 Zeilen im Verlauf')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Artikelakte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/artikelverlauf_{lang}_{w}.png')
        # Artikelakte drucken: Knopf vorhanden; im Druckmodus Vermerk (Person, Werkstatt, Teilenummer), Verlauf sichtbar, Buchungsformular/Knöpfe nicht
        check(q.locator('#itemprt').count()==1,f'{lang} {w}px: Knopf „Drucken / PDF“ in der Artikelakte')
        q.emulate_media(media='print')
        ph=q.locator('.print-only').first
        check(ph.is_visible() and 'AV Werkstatt' in ph.inner_text() and 'VA-UI' in ph.inner_text(),f'{lang} {w}px: Druckvermerk mit Person und Teilenummer ({ph.inner_text()!r})')
        check(not q.locator('#mf').is_visible() and not q.locator('#itemprt').is_visible() and q.locator('table.stack').is_visible(),f'{lang} {w}px: Ausdruck ohne Buchungsformular, mit Verlauf')
        if SHOTS: q.screenshot(path=f'{SHOTS}/artikel_druck_{lang}_{w}.png')
        q.emulate_media(media='screen')
        q.click('#histjournal'); q.wait_for_selector('#jitem')
        check(JOURNAL[lang] in q.inner_text('h1') and 'Verlaufsartikel UI' in q.inner_text('#jitem'),f'{lang} {w}px: Journal mit Artikel-Chip')
        zl=[x for x in q.locator('ul.small li').all_inner_texts() if '201' in x]
        check(len(zl)==1 and '–' in zl[0] and '0,00' not in zl[0],f'{lang} {w}px: Journal-Summe nur unbewerteter Zugänge „–“ statt 0 € ({zl!r})')
        rows=q.locator('table.printsm tbody tr')
        check(rows.count()==201 and all('Verlaufsartikel UI' in x for x in rows.all_inner_texts()[:5]),f'{lang} {w}px: alle 201 Buchungen nur dieses Artikels ({rows.count()})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Journal ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/artikeljournal_{lang}_{w}.png')
        # „Alle Artikel“ hebt die Eingrenzung auf (Zeitraum bleibt)
        q.click('#jitemclr'); q.wait_for_function("()=>!document.querySelector('#jitem')")
        check(ALL[lang] not in q.inner_text('main') and 'Kleiner Artikel UI' in q.inner_text('main'),f'{lang} {w}px: „Alle Artikel“ zeigt wieder alle')
        # Lagerliste setzt den Filter zurück
        q.goto(B+'/#/stock/'+big); q.wait_for_selector('#histjournal'); q.click('#histjournal'); q.wait_for_selector('#jitem')
        q.goto(B+'/#/stock'); q.wait_for_selector('#inv'); q.goto(B+'/#/stock/journal'); q.wait_for_selector('#jf')
        check(q.locator('#jitem').count()==0,f'{lang} {w}px: über die Lagerliste geöffnet ohne Artikelfilter')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f'{len(fails)} Fehler' if fails else 'Artikelverlauf: alles grün')
raise SystemExit(1 if fails else 0)
