# [CLAUDE] UI-Test (04.11.2026, Backlog 990, Blickwinkel „Mechaniker tippt die Teilenummer vom Karton ab, statt den Artikel aus dem Lager
# zu wählen“): Bei „Teil erfassen“ (Werkstatt) zeigt eine frei eingetippte Teilenummer eines vorrätigen Artikels – auch ohne Leerzeichen und
# während die Lagersuche auf andere Artikel gefiltert ist – den Hinweis „aus dem Lager entnehmen“; ein Tipp wählt den Artikel (Preis/Freitext
# gesperrt wie bei Handauswahl), fremde Nummer ohne Hinweis. DE/UK/EN bei 390/820/1366 px (nichts wird gebucht). Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'im Lager vorrätig','uk':'є на складі','en':'is in stock'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tl.inhaber','display_name':'TL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin=f'WDB9634031{pid%10000000:07d}'[:17]; api('POST','/api/vehicles',{'plate':f'TL-AB {pid%9000+1}','vin':vin,'site':'Dortmund'}); vid='VIN:'+vin
    u=api('POST','/api/users',{'username':f'tl.ws{pid}','display_name':'TL Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wsapi=lambda m,pa,b=None: pg.evaluate(JS,[m,pa,b])
    tgt=wsapi('POST','/api/stock',{'name':f'Bremsbeläge VA {pid}','part_number':f'A 000 420 {pid%100:02d} 20','initial_qty':'4','unit_price_net':'95,00'})
    check(tgt['s']==201,'Zielartikel angelegt'); tid=tgt['d']['id']; compact=f'A000420{pid%100:02d}20'
    for k in range(9): wsapi('POST','/api/stock',{'name':f'Füllartikel {k} {pid}','part_number':f'F-{pid}-{k}','initial_qty':'2'})
    cid=api('POST','/api/cases',{'vehicle_id':vid,'description':'TL Teilesuche','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'tl-{pid}'})['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'tla-{pid}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
    v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'tls-{pid}','expected_version':v})['s']==200,'Reparatur begonnen')
    for lang in ['de','uk','en']:
      wsapi('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'tl.ws{pid}','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_part]',timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel [data-stockq]',timeout=15000)
        q.fill('#stocksel [data-stockq]','Füllartikel')
        pn=q.locator('#freepart [name=part_number]'); box=q.locator('#pninstock')
        pn.fill('B-777-'+str(pid)); pn.dispatch_event('input'); q.wait_for_timeout(50)
        check(box.is_hidden(),f'{tag}: fremde Nummer ohne Hinweis')
        pn.fill(''); pn.type(compact); q.wait_for_timeout(50)
        check(box.is_visible() and TXT[lang] in box.inner_text() and q.locator(f'#pninstock [data-pnpick="{tid}"]').count()==1,f'{tag}: „{compact}“ → Hinweis mit Knopf')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: box.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tl_teil_{lang}_{w}.png')
        q.click(f'#pninstock [data-pnpick="{tid}"]'); q.wait_for_timeout(50)
        st=q.evaluate("""()=>{const s=document.querySelector('#stocksel select');const f=s.closest('form');return {val:s.value,
          pr:f.querySelector('[name=unit_price_net]').disabled,nm:f.querySelector('#freepart [name=name]').disabled,hid:document.querySelector('#pninstock').hidden}}""")
        check(st['val']==tid,f'{tag}: Knopf wählt den Lagerartikel (auch bei gefilterter Suche)')
        check(st['pr'] and st['nm'] and st['hid'],f'{tag}: Preis/Freitext gesperrt, Hinweis weg')
        q.select_option('#stocksel select',''); q.wait_for_timeout(50)
        check(box.is_hidden() or q.locator('#freepart [name=part_number]').is_disabled() is False,f'{tag}: Auswahl zurückgenommen ohne Fehler')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
