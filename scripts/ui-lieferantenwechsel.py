# [CLAUDE] UI-Test Backlog 860 (Blickwinkel „Werkstatt wechselt den Lieferanten für Bremsteile“): Wareneingang zeigt je Position den
# letzten Lieferanten mit Datum und den letzten Einkaufspreis; bei anderem Lieferanten und abweichendem Preis je ein Hinweis-Chip.
# DE/UK/EN bei 390/820/1366 px (nichts wird gebucht). Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SUP={'de':'Anderer Lieferant als zuletzt','uk':'Інший постачальник','en':'Different supplier than last time'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lw.inhaber','display_name':'LW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lw.inhaber','password':PW})['s']==200,'Anmeldung')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    r=api('POST','/api/stock',{'site':site,'name':f'Bremsbelagsatz VA {pid}','part_number':f'29087-{pid}'})
    check(r['s']==201,'Artikel angelegt'); iid=r['d']['id']
    check(api('POST','/api/stock/receipt',{'site':site,'supplier':'Bremsen Alt GmbH','lines':[{'item_id':iid,'qty':'4','unit_price_net':'95,00'}]})['s']==201,'Zugang alter Lieferant')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lw.inhaber','password':PW}])
        q.goto(B+'/#/stock/receipt'); q.wait_for_selector('#rclines .rci',timeout=15000)
        if q.query_selector('#rcsite'): q.select_option('#rcsite',site)
        q.select_option('#rclines .rci',iid)
        tx=q.inner_text('#rclines [data-rclast]')
        check('Bremsen Alt GmbH' in tx and '95' in tx,f'{lang} {w}px: letzter Lieferant und Preis ({tx[:90]})')
        q.fill('#rcsup','Bremsen Neu KG'); q.fill('#rclines .rcp','104,50' if lang!='en' else '104.50')
        q.wait_for_selector('[data-rclsup]',timeout=5000); q.wait_for_selector('[data-rclpct]',timeout=5000)
        check(SUP[lang] in q.inner_text('[data-rclsup]'),f'{lang} {w}px: Hinweis anderer Lieferant')
        pct=q.inner_text('[data-rclpct]'); check('+10' in pct,f'{lang} {w}px: Preisabweichung ({pct})')
        q.fill('#rcsup','bremsen  alt gmbh'); check(not q.query_selector('[data-rclsup]'),f'{lang} {w}px: gleicher Lieferant (Schreibweise) ohne Hinweis')
        q.fill('#rcsup','Bremsen Neu KG'); q.fill('#rclines .rcp','104,50' if lang!='en' else '104.50')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lw_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
