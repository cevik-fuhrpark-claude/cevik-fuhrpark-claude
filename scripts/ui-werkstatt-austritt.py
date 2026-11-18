# [CLAUDE] UI-Test Backlog 1583 (Backlog 195, Blickwinkel „Mechaniker scheidet aus – sein Arbeitsstand steht noch am Auftrag“):
# Werkstatt-Konto erfasst an einem Auftrag in Reparatur einen Arbeitsstand und vermerkt eine Lagerbestellung; der Inhaber deaktiviert das Konto
# in der Benutzerverwaltung → Hinweis nennt die Auftragsnummer und den Bestellvermerk; danach wieder aktiviert (nächster Durchlauf).
# DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WST={'de':'Aufträge mit Arbeitsstand dieses Kontos: 1','uk':'Замовлення зі станом робіт від цього облікового запису: 1','en':'Orders with a work status by this account: 1'}
ORD={'de':'Offene Bestellvermerke dieses Kontos im Lager: 1','uk':'Відкриті позначки замовлення цього облікового запису на складі: 1','en':'Open stock order notes by this account: 1'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wa.inhaber','display_name':'WA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production'); pid=os.getpid()
    vin=f'WDB96{pid%100000:05d}W158300'; plate=f'WA-AB {pid%10000}'
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'})['s'] in (201,409),'Fahrzeug')
    veh=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['id']=='VIN:'+vin][0]
    c=api('POST','/api/cases',{'vehicle_id':veh['id'],'description':'Bremse hinten links schleift (Test Austritt)','priority':'mittel','driveability':'eingeschraenkt','request_key':f'wa-{pid}'})
    check(c['s']==201,f'Vorgang {c["s"]}'); cid=c['d']['id']
    def cmd(page,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'wa-{action}-{pid}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    check(cmd(a,'approve_repair',{'workshop_site':'DORTMUND'},'Bremse prüfen')==200,'freigegeben')
    u=api('POST','/api/users',{'username':f'wa.ws{pid}','display_name':'WA Mechaniker','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    check(u['s'] in (200,201),'Werkstattkonto '+str(u['s'])); UID=u['d']['id']
    wc=br.new_context(); wp=wc.new_page(); wp.goto(B); wp.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wp.evaluate(JS,['POST','/api/login',{'username':f'wa.ws{pid}','password':PW}])
    check(cmd(wp,'start_repair')==200,'Reparatur begonnen')
    check(cmd(wp,'set_work_state',{},'Rad HL abgebaut – nicht bewegen (Test)')==200,'Arbeitsstand erfasst')
    it=wp.evaluate(JS,['POST','/api/stock',{'name':f'Bremsbelag Test {pid}','unit':'Stk'}]); check(it['s']==201,f'Lagerartikel {it["s"]}')
    o=wp.evaluate(JS,['PUT',f'/api/stock/{it["d"]["id"]}/order',{'qty':4}]); check(o['s']==200,f'Bestellvermerk {o}')
    wc.close()
    no=api('GET',f'/api/cases/{cid}')['d']['case']['case_no']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wa.inhaber','password':PW}])
        q.goto(B+'/#/users'); q.wait_for_selector(f'[data-act="{UID}"]',state='attached',timeout=15000)
        q.evaluate(f"()=>{{ const b = document.querySelector('[data-act=\"{UID}\"]'); for (let d = b.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; b.scrollIntoView(); }}")
        q.click(f'[data-act="{UID}"]'); q.wait_for_selector('.toast',timeout=15000); tx=q.inner_text('.toast')
        check(WST[lang] in tx and no in tx,f'{lang} {w}px: Arbeitsstand mit Auftragsnummer ({tx[:140]})')
        check(ORD[lang] in tx,f'{lang} {w}px: Bestellvermerk')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wa_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('PATCH',f'/api/users/{UID}',{'active':True})['s']==200,f'{lang} {w}px: wieder aktiv')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
