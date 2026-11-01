# [CLAUDE] UI-Test (01.11.2026, Backlog 815, Blickwinkel „Werkstatt bucht Teile, Lager im anderen Standort“): Artikel in Dortmund unter
# Mindestbestand, derselbe Artikel (andere Schreibweise) in München vorrätig. Leitung: Bestellvorschlag zeigt „Vorrätig in anderen Lagern“
# mit Menge und Verweis, Artikelakte zeigt den Kasten #otherstock, Verweis öffnet den Artikel in München. Werkstatt Dortmund sieht keine
# Angabe zu anderen Lagern. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Vorrätig in anderen Lagern','uk':'Є на інших складах','en':'In stock at other sites'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'al.inhaber','display_name':'AL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'al.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    ws=[w['code'] for w in api('GET','/api/meta')['d']['workshops']]; w1,w2=ws[0],ws[1]
    u=api('POST','/api/users',{'username':'al.ws','display_name':'AL Werkstatt','role':'workshop','environment':env,'workshop_site':w1})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    A=api('POST','/api/stock',{'site':w1,'name':'Ölfilter AL','part_number':'OF-AL','min_qty':4,'initial_qty':1})['d']['id']
    M=api('POST','/api/stock',{'site':w2,'name':'ölfilter al','part_number':'of-al','min_qty':2,'initial_qty':6})['d']['id']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'al.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/stock/reorder'); q.reload(); q.wait_for_selector('[data-otherstock]',timeout=15000)
        tx=q.inner_text('[data-otherstock]')
        check(TXT[lang] in tx and '6' in tx,f'{lang} {w}px: Bestellvorschlag nennt anderes Lager ({tx!r})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Bestellvorschlag ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/anderes_lager_vorschlag_{lang}_{w}.png',full_page=True)
        q.goto(B+f'/#/stock/{A}'); q.wait_for_selector('#otherstock',timeout=15000)
        check(TXT[lang] in q.inner_text('#otherstock'),f'{lang} {w}px: Artikelakte zeigt Kasten')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Artikelakte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/anderes_lager_akte_{lang}_{w}.png',full_page=True)
        q.click(f'#otherstock a[href="#/stock/{M}"]'); q.wait_for_function(f"location.hash==='#/stock/{M}'"); q.wait_for_selector('#trp',timeout=10000)
        check(True,f'{lang} {w}px: Verweis öffnet Artikel im anderen Lager mit Umlagerung')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    # Werkstatt: keine Angabe zu anderen Lagern
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'al.ws','password':PW}])
    q.goto(B+'/#/stock/reorder'); q.reload(); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(800)
    check(q.locator('[data-otherstock]').count()==0,'Werkstatt: Bestellvorschlag ohne andere Lager')
    q.goto(B+f'/#/stock/{A}'); q.wait_for_selector('#mf',state='attached',timeout=15000)
    check(q.locator('#otherstock').count()==0,'Werkstatt: Artikelakte ohne andere Lager')
    ctx.close(); br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
