# [CLAUDE] UI-Test: Konflikt-Meldungen (409) in der Oberflächensprache – Lagerartikel doppelt anlegen zeigt
# „Artikel existiert in diesem Lager bereits.“ auf Deutsch, Ukrainisch und Englisch (vorher immer deutsch).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MSG={'de':'Artikel existiert in diesem Lager bereits.','uk':'Така позиція вже є на цьому складі.','en':'This item already exists in this store.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ks.inhaber','display_name':'KS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ks.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    check(api('POST','/api/stock',{'name':'Konflikt-Probe Ölfilter','part_number':'KS-1','site':ws})['s']==201,'Artikel angelegt')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ks.inhaber','password':PW}])
        q.goto(B+'/#/stock'); q.wait_for_selector('#nf',state='attached')
        q.locator('#nf').locator('xpath=ancestor::details').locator('summary').click()
        if q.locator('#nf [name=site]').count(): q.select_option('#nf [name=site]', ws)
        q.fill('#nf [name=name]','Konflikt-Probe Ölfilter'); q.fill('#nf [name=part_number]','KS-1')
        q.locator('#nf button.btn').last.click(); q.wait_for_selector('.toast.err',timeout=10000)
        txt=q.inner_text('.toast.err')
        check(MSG[lang] in txt,f'{lang} {w}px: Meldung in der Sprache: {txt}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/konflikt_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    n=sum(1 for i in api('GET','/api/stock')['d']['items'] if i['name']=='Konflikt-Probe Ölfilter')
    check(n==1,f'nur ein Artikel vorhanden ({n})')
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
