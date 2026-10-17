# [CLAUDE] UI-Test: Artikelakte – bei Entnahme eines Artikels mit hinterlegtem Preis ist das Preisfeld aus und der Hinweis
# „mit dem hinterlegten Artikelpreis bewertet“ sichtbar; die gebuchte Entnahme trägt den Artikelpreis. Artikel ohne Preis: Feld bleibt.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'hinterlegten Artikelpreis','uk':'збереженою ціною','en':'stored price'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lp.inhaber','display_name':'LP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    r=api('POST','/api/stock',{'site':site,'name':'Entnahmepreis-Test Filter','unit_price_net':5,'initial_qty':100}); check(r['s']==201,'Artikel mit Preis'); pid=r['d']['id']
    r=api('POST','/api/stock',{'site':site,'name':'Entnahmepreis-Test ohne Preis','initial_qty':100}); check(r['s']==201,'Artikel ohne Preis'); nid=r['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lp.inhaber','password':PW}])
        q.goto(B+f'/#/stock/{pid}'); q.wait_for_selector('#mf',timeout=15000)
        check(q.is_visible('#mf [name=unit_price_net]') and not q.is_visible('#mfpricehint'),f'{lang}/{w}: Zugang mit Preisfeld')
        q.select_option('#mf [name=type]','entnahme')
        check(not q.is_visible('#mf [name=unit_price_net]') and HINT[lang] in q.inner_text('#mfpricehint'),f'{lang}/{w}: Entnahme ohne Preisfeld, Hinweis')
        if SHOTS: q.locator('#mf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/lp_{lang}_{w}.png')
        q.fill('#mf [name=qty]','1'); q.click('#mf button.btn'); q.wait_for_timeout(800)
        mv=q.evaluate(JS,['GET',f'/api/stock/{pid}',None])['d']['movements']
        check(mv and mv[0]['type']=='entnahme' and mv[0]['unit_price_net']==5,f'{lang}/{w}: Entnahme mit Artikelpreis gebucht')
        q.goto(B+f'/#/stock/{nid}'); q.wait_for_selector('#mf',timeout=15000); q.select_option('#mf [name=type]','entnahme')
        check(q.is_visible('#mf [name=unit_price_net]') and q.locator('#mfpricehint').count()==0,f'{lang}/{w}: ohne Artikelpreis bleibt das Feld')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Entnahmepreis: alles grün')
raise SystemExit(1 if fails else 0)
