# [CLAUDE] UI-Test: Kosten mit ausschließlich unbewerteten Positionen → „Belegt“ zeigt „–“ statt 0,00 € (Vorgang, Fahrzeugakte, Kostenbericht:
# Summe, Fahrzeug, Monat); Hilfe nennt die Regel. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888801'; VID='VIN:'+VIN
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ku.inhaber','display_name':'KU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ku.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'KU-UV 1','vin':VIN,'site':'Dortmund'})
    ws_site=api('GET','/api/meta')['d']['workshops'][0]['code']
    u=api('POST','/api/users',{'username':'ku.werkstatt','display_name':'KU Werkstatt','role':'workshop','environment':'production','workshop_site':ws_site})
    if u['s'] in (200,201): api('POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ku.inhaber','password':PW})
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Kostentest: Spiegel ohne Preis','priority':'niedrig','driveability':'fahrbereit','request_key':'ku-1'})
    cid=c['d']['id']
    def cmd(action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'ku-{action}','expected_version':v,'note':note,'payload':payload or {}})
    check(cmd('approve_repair',{'workshop_site':ws_site},'Kostentest')['s']==200,'Reparatur freigegeben')
    api('POST','/api/login',{'username':'ku.werkstatt','password':PW})
    check(cmd('start_repair')['s']==200,'Reparatur begonnen')
    r=cmd('add_part',{'name':'Spiegel ohne Preis','quantity':1})
    check(r['s']==200,f'Teil ohne Preis erfasst ({r["s"]})')
    api('POST','/api/login',{'username':'ku.inhaber','password':PW})
    HELP={'de':'steht bei „Belegt“ „–“ statt 0 €','uk':'стоїть «–» замість 0 €','en':'“Documented” shows “–” instead of €0'}
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ku.inhaber','password':PW}])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('dl.kv')
        dd=q.locator('section.panel:has(h3) dl.kv dd').first.inner_text()
        check(dd.strip()=='–',f'{lang} {w}px: Vorgang „Belegt“ = „–“ ({dd!r})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/kosten_vorgang_{lang}_{w}.png')
        q.goto(B+'/#/costs'); q.wait_for_selector('#cr')
        tot=q.locator('section.panel dl.kv dd b').first.inner_text()
        check(tot.strip()=='–',f'{lang} {w}px: Kostenbericht Summe „–“ ({tot!r})')
        row=q.locator('details.row summary').first.inner_text()
        check('KU-UV' in row and '0,00' not in row and '0.00' not in row and '–' in row,f'{lang} {w}px: Fahrzeugzeile „–“ statt 0,00 € ({row!r})')
        q.locator('details.row summary').first.click()
        mon=q.locator('details.row dl.kv dd').first.inner_text()
        check(mon.startswith('–') and '0,00' not in mon and '0.00' not in mon,f'{lang} {w}px: Monatszeile „–“ ({mon!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/kosten_bericht_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_timeout(400)
        vc=q.evaluate("""()=>{const h=[...document.querySelectorAll('section.panel h3')].find(x=>x.nextElementSibling&&x.nextElementSibling.matches('dl.kv')&&x.parentElement.querySelector('dd'));return h?h.parentElement.querySelector('dd').innerText:null}""")
        check(vc is not None and vc.strip()=='–',f'{lang} {w}px: Fahrzeugakte „Belegt“ = „–“ ({vc!r})')
        if w==390:
          q.goto(B+'/#/help'); q.wait_for_timeout(300)
          check(HELP[lang] in q.inner_text('body'),f'{lang}: Hilfe nennt die Regel')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
