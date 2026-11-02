# [CLAUDE] UI-Test Backlog 862 (Blickwinkel „Werkstatt-Tablet: Mechaniker sucht ein Teil per Teilenummer“): Lagerliste findet die
# Teilenummer „A 000 420 12 20“ auch als „A0004201220“; bei „Teil erfassen“ (Werkstatt) und im Wareneingang steht ab 8 Artikeln ein
# Suchfeld über der Artikelauswahl, ein einziger Treffer wird vorgewählt (Preisfeld gesperrt wie bei Handauswahl), kein Treffer → Hinweis.
# DE/UK/EN bei 390/820/1366 px (nichts wird gebucht). Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HIT={'de':'1 Artikel gefunden','uk':'Знайдено 1 артикул','en':'1 item found'}
NONE={'de':'Kein Artikel gefunden','uk':'Артикул не знайдено','en':'No item found'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ts.inhaber','display_name':'TS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ts.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin=f'WDB9634031{pid%10000000:07d}'[:17]; api('POST','/api/vehicles',{'plate':f'TS-AB {pid%9000+1}','vin':vin,'site':'Dortmund'}); vid='VIN:'+vin
    u=api('POST','/api/users',{'username':f'ts.ws{pid}','display_name':'TS Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wsapi=lambda m,pa,b=None: pg.evaluate(JS,[m,pa,b])
    tgt=wsapi('POST','/api/stock',{'name':f'Bremsbeläge VA {pid}','part_number':f'A 000 420 {pid%100:02d} 20','initial_qty':'4','unit_price_net':'95,00'})
    check(tgt['s']==201,'Zielartikel angelegt'); tid=tgt['d']['id']; compact=f'A000420{pid%100:02d}20'
    for k in range(9): wsapi('POST','/api/stock',{'name':f'Füllartikel {k} {pid}','part_number':f'F-{pid}-{k}','initial_qty':'2'})
    cid=api('POST','/api/cases',{'vehicle_id':vid,'description':'TS Teilesuche','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'ts-{pid}'})['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'tsa-{pid}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
    v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'tss-{pid}','expected_version':v})['s']==200,'Reparatur begonnen')
    for lang in ['de','uk','en']:
      wsapi('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'ts.ws{pid}','password':PW}])
        # Lagerliste
        q.goto(B+'/#/stock'); q.wait_for_selector('#sl a',timeout=15000); q.fill('#q',compact); q.wait_for_timeout(200)
        vis=q.evaluate("()=>[...document.querySelectorAll('#sl a')].filter(a=>!a.hidden).map(a=>a.dataset.id)")
        check(vis==[tid],f'{tag}: Lagerliste findet Teilenummer ohne Leerzeichen ({len(vis)})')
        # Teil erfassen im Auftrag
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_part]',timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#stocksel [data-stockq]',timeout=15000)
        q.fill('#stocksel [data-stockq]',compact.lower())
        st=q.evaluate("""()=>{const s=document.querySelector('#stocksel select');const f=s.closest('form');return {val:s.value,n:s.options.length,
          pr:f.querySelector('[name=unit_price_net]').disabled,nm:f.querySelector('#freepart [name=name]').disabled,info:document.querySelector('#stocksel [data-stockqn]').textContent}}""")
        check(st['val']==tid and st['n']==2,f"{tag}: Teil buchen – einziger Treffer vorgewählt ({st['n']} Optionen)")
        check(st['pr'] and st['nm'],f'{tag}: Preis/Freitext gesperrt wie bei Handauswahl')
        check(HIT[lang] in st['info'],f"{tag}: Trefferzahl ({st['info']})")
        if SHOTS: q.screenshot(path=f'{SHOTS}/ts_teil_{lang}_{w}.png',full_page=True)
        q.fill('#stocksel [data-stockq]','Füllartikel')
        st=q.evaluate("()=>{const s=document.querySelector('#stocksel select');return {val:s.value,n:s.options.length}}")
        check(st['val']==tid and st['n']==11,f"{tag}: gewählter Artikel bleibt beim Weitersuchen erhalten ({st['n']})")
        q.select_option('#stocksel select','')
        q.fill('#stocksel [data-stockq]','XYZ-gibt-es-nicht')
        check(NONE[lang] in q.inner_text('#stocksel [data-stockqn]'),f'{tag}: Hinweis kein Treffer')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Teil buchen ohne Querscrollen')
        # Wareneingang
        q.goto(B+'/#/stock/receipt'); q.wait_for_selector('#rclines [data-stockq]',timeout=15000)
        q.fill('#rclines [data-stockq]','000-420')
        val=q.eval_on_selector('#rclines .rci','s=>s.value')
        check(val==tid,f'{tag}: Wareneingang – Treffer vorgewählt')
        q.wait_for_selector('#rclines [data-rclast]',timeout=5000)
        check('95' in q.inner_text('#rclines [data-rclast]'),f'{tag}: letzter Preis zur vorgewählten Position')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Wareneingang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ts_we_{lang}_{w}.png',full_page=True)
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
