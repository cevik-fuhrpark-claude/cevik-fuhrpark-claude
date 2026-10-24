# [CLAUDE] UI-Test (24.10.2026, Backlog 232, Teilagent „Werkstatt bucht Teile für zwei Aufträge“): zwei offene „Teil erfassen“-Formulare
# wählen denselben Lagerartikel (Bestand 1). Nach der Buchung im ersten Auftrag wird der zweite abgewiesen; die Auswahl zeigt danach
# „(0 Stk/шт./pcs)“, der Artikel ist gesperrt, das Formular steht auf „Ohne Lager“ mit übernommenem Namen/Teilenummer und Hinweis.
# Danach lässt sich das Teil ohne Lager speichern. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UNIT={'de':'Stk','uk':'шт.','en':'pcs'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'za.inhaber','display_name':'ZA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'za.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310995911'; api('POST','/api/vehicles',{'plate':'ZA-AB 1','vin':'WDB96340310995911','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'za.ws','display_name':'ZA Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wsapi=lambda m,pa,b=None: pg.evaluate(JS,[m,pa,b])
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        it=wsapi('POST','/api/stock',{'name':f'ZA Scheibe {n}','part_number':f'ZA-{n}','initial_qty':1})
        cids=[]
        for k in range(2):
            cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'ZA {lang} {w} {k}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'za-{os.getpid()}-{n}-{k}'})['d']['id']
            v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
            api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'zaa-{os.getpid()}-{n}-{k}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
            v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
            wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'zas-{os.getpid()}-{n}-{k}','expected_version':v})
            cids.append(cid)
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]; pages=[]
        for cid in cids:
            q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
            if not pages: q.evaluate(JS,['POST','/api/login',{'username':'za.ws','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_part]',timeout=15000)
            q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel select',timeout=15000)
            q.select_option('#stocksel select',it['d']['id']); q.fill('#af [name=quantity]','1'); pages.append(q)
        A,Bp=pages
        A.click('#af button:not([type=button])'); A.wait_for_selector('#af',state='detached',timeout=15000)
        Bp.click('#af button:not([type=button])'); Bp.wait_for_selector('#stockshort',timeout=15000)
        st=Bp.evaluate("""(id)=>{const s=document.querySelector('#stocksel select');const o=[...s.options].find(x=>x.value===id);const f=document.querySelector('#freepart');
          return {label:o.textContent, dis:o.disabled, val:s.value, name:f.querySelector('[name=name]').value, pn:f.querySelector('[name=part_number]').value,
          nameDis:f.querySelector('[name=name]').disabled, hint:document.querySelector('#stockshort').textContent}}""", it['d']['id'])
        check(st['label'].endswith(f"(0 {UNIT[lang]})"),f"{tag}: Auswahl zeigt neuen Bestand ({st['label']})")
        check(st['dis'] and st['val']=='',f'{tag}: Artikel gesperrt, „Ohne Lager“ gewählt')
        check(st['name']==f'ZA Scheibe {n}' and st['pn']==f'ZA-{n}' and not st['nameDis'],f'{tag}: Name/Teilenummer übernommen')
        check(('0' in st['hint']) and len(st['hint'])>40 and '..' not in st['hint'],f'{tag}: Hinweis am Feld (ohne doppelten Punkt)')
        if SHOTS: Bp.screenshot(path=f'{SHOTS}/lager_zwei_{lang}_{w}.png',full_page=True)
        check(Bp.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        Bp.click('#af button:not([type=button])'); Bp.wait_for_selector('#af',state='detached',timeout=15000)
        parts=wsapi('GET',f'/api/cases/{cids[1]}')['d']
        names=[x.get('name') for x in parts.get('parts',[])]
        check(f'ZA Scheibe {n}' in names,f'{tag}: Teil ohne Lager gespeichert ({names})')
        check(wsapi('GET',f"/api/stock/{it['d']['id']}")['d']['item']['on_hand']==0,f'{tag}: Bestand bleibt 0')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
