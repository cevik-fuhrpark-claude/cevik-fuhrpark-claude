# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „Lager über den Auftrag“): „Teil erfassen“ mit Lagerartikel, der einen Artikelpreis hat →
# Preisfeld und „Schätzung“ gesperrt (fester Preis ist kein Schätzwert); ohne Lagerartikel wieder wählbar. DE/UK/EN, 390/820/1366 px,
# ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ls.inhaber','display_name':'LS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ls.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310775901'; api('POST','/api/vehicles',{'plate':'LS-AB 1','vin':'WDB96340310775901','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'ls.ws','display_name':'LS Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wsapi=lambda m,pa,b=None: pg.evaluate(JS,[m,pa,b])
    it=wsapi('POST','/api/stock',{'name':'LS Filter','unit_price_net':'5','initial_qty':50}); check(it['s']==201,'Lagerartikel mit Preis')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'LS Filter {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'ls-{os.getpid()}-{n}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'lsa-{os.getpid()}-{n}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
        wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'lss-{os.getpid()}-{n}','expected_version':v})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ls.ws','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_part]',timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel select',timeout=15000)
        q.select_option('#stocksel select',it['d']['id'])
        dis=q.evaluate("()=>{const f=document.querySelector('#af');return [f.querySelector('[name=estimate]').disabled, f.querySelector('[name=unit_price_net]').disabled]}")
        check(dis==[True,True],f'{lang} {w}px: Preis und Schätzung gesperrt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager_schaetzung_{lang}_{w}.png',full_page=True)
        q.select_option('#stocksel select','')
        check(not q.evaluate("()=>document.querySelector('#af [name=estimate]').disabled"),f'{lang} {w}px: ohne Lagerartikel wieder wählbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
