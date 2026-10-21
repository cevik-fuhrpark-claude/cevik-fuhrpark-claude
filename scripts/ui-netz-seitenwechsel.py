# [CLAUDE] UI-Test langsames Netz (21.10.2026, Funde der Netzprüfung): (1) Fahrer sendet Meldung mit Fotos und wechselt während des Hochladens
# zur Abfahrtskontrolle – die Kontrolle bleibt ausgefüllt (kein Sprung zum Vorgang, Knopf zeigt keinen fremden Fortschritt); (2) Werkstatt reicht
# Fotos am Vorgang nach, Antwort auf Foto 2 verloren und danach Netz weg – Fortschritt sichtbar, Rest im Postausgang (am Vorgang); (3) Lager-
# buchung mit verlorener Antwort, danach geänderter Inhalt → wird als neue Buchung gebucht (nicht still verworfen). DE 390, UK 820, EN 1366.
# Dev-Server: CFP_URL (Standard Port 8787), frischer Server nötig. Screenshots: CFP_SHOTS.
import os, time
from PIL import Image
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
TMP='/tmp/cfp-netz-fotos'; os.makedirs(TMP, exist_ok=True)
def photos(n, tag):
    out=[]
    for i in range(n):
        p=f'{TMP}/{tag}_{i}.jpg'
        if not os.path.exists(p):
            im=Image.new('RGB',(1200,900)); px=im.load(); s=(hash((tag,i))&0xffff)+1
            for y in range(0,900,3):
                for x in range(0,1200,3):
                    s=(s*1103515245+12345)&0x7fffffff; px[x,y]=(s&255,(s>>8)&255,(s>>16)&255)
            im.save(p,quality=90)
        out.append(p)
    return out
def throttle(q, kbps=400, lat=800):
    cdp=q.context.new_cdp_session(q); cdp.send('Network.enable')
    cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':lat,'downloadThroughput':kbps*125,'uploadThroughput':kbps*125})
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,path,b=None: a.evaluate(JS,[m,path,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nz.inhaber','display_name':'NZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'nz.inhaber','password':PW})['s']==200,'Inhaber angemeldet')
    envname=api('GET','/api/me')['d']['active_environment']; site=api('GET','/api/meta')['d']['workshops'][0]['code']
    def user(u,role,**kw):
        r=api('POST','/api/users',{'username':u,'display_name':u.upper(),'role':role,'environment':envname,**kw})
        c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}]); c0.close()
        return r['d'].get('id') or r['d'].get('user',{}).get('id')
    def device(u,w,h,lang):
        ctx=br.new_context(viewport={'width':w,'height':h},locale={'de':'de-DE','uk':'uk-UA','en':'en-GB'}[lang]); q=ctx.new_page(); q.errs=[]
        q.on('pageerror',lambda e: q.errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':u,'password':PW}])['s']==200,f'{u} angemeldet')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+'/#/'); q.wait_for_timeout(800); return ctx,q
    # (1) Seitenwechsel während des Hochladens (DE 390)
    api('POST','/api/vehicles',{'plate':'NZ-S 1','vin':'WDB96340310662001','site':'Dortmund'}); vid='VIN:WDB96340310662001'
    uid=user('nz.fahrer','driver'); api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uid})
    ctx,q=device('nz.fahrer',390,844,'de')
    q.goto(B+'/#/new'); q.wait_for_selector('#d'); q.locator(f'input[name=veh][value="{vid}"]').check(force=True); q.fill('#d','Rücklicht rechts defekt (Netztest)')
    q.set_input_files('#ph',photos(3,'m')); throttle(q)
    q.click('#sb')
    for i in range(120):
        if '/3' in (q.evaluate("(document.querySelector('#sb')||{}).textContent||''")): break
        q.wait_for_timeout(500)
    q.goto(B+'/#/check'); q.wait_for_selector('.checkitem',timeout=60000); q.select_option('#v',vid)
    q.evaluate("() => { [...document.querySelectorAll('.checkitem')].forEach((r, i) => r.querySelector(`input[value=${i === 0 ? 'mangel' : 'ok'}]`).click()); }")
    q.locator('.checkitem').first.locator('input[name$="__note"]').fill('Bremslicht links ohne Funktion'); q.fill('#km','123456')
    foreign=False
    for i in range(160):
        h=q.evaluate('location.hash'); sbt=q.evaluate("(document.querySelector('#sb')||{}).textContent||''")
        if '/3' in sbt or h.startswith('#/cases/'): foreign=True; break
        files=api('GET','/api/cases?f=all')['d']['cases']; c=[x for x in files if 'Netztest' in x['description']]
        if c and len(api('GET',f"/api/cases/{c[0]['id']}")['d'].get('files',[]))==3: break
        q.wait_for_timeout(500)
    q.wait_for_timeout(800)
    check(not foreign and q.evaluate('location.hash')=='#/check','Kontrolle bleibt offen, kein fremder Fortschritt im Knopf')
    check(q.evaluate("document.querySelector('#km').value")=='123456' and q.evaluate("document.querySelectorAll('.checkitem input[type=radio]:checked').length")>=18,'Eingaben der Kontrolle erhalten')
    c=[x for x in api('GET','/api/cases?f=all')['d']['cases'] if 'Netztest' in x['description']]
    check(len(c)==1 and len(api('GET',f"/api/cases/{c[0]['id']}")['d'].get('files',[]))==3,'Meldung mit 3 Fotos angekommen')
    if SHOTS: q.screenshot(path=f'{SHOTS}/netz_kontrolle_de_390.png')
    check(not q.errs,f'keine Skriptfehler {q.errs}'); ctx.close()
    # (2) Werkstatt reicht Fotos nach (UK 820): Antwort auf Foto 2 verloren, danach Netz weg
    user('nz.ws','workshop',workshop_site=site)
    cid=api('POST','/api/cases',{'vehicle_id':vid,'description':'Bremse vorne quietscht','priority':'mittel','driveability':'fahrbereit','request_key':'nz-ws-1'})['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':'nz-ap-1','expected_version':v,'note':'prüfen','payload':{'workshop_site':site}})
    ctx,q=device('nz.ws',820,1180,'uk'); q.goto(B+'/#/cases/'+cid); q.wait_for_selector('#file',state='attached',timeout=30000)
    st={'n':0}
    def h(route):
        st['n']+=1
        if st['n']==2: route.fetch(); route.abort('failed'); return
        if st['n']>=3: route.abort('internetdisconnected'); return
        route.continue_()
    q.route('**/api/cases/*/files',h); q.set_input_files('#file',photos(4,'w'))
    prog=False
    for i in range(80):
        if q.evaluate("[...document.querySelectorAll('[role=status]')].some((x) => /\\d\\/4/.test(x.textContent))"): prog=True
        ob=q.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v))")
        if ob: break
        q.wait_for_timeout(250)
    check(prog,'Fortschritt beim Nachreichen sichtbar')
    check(len(ob)==1 and ob[0].get('photo_target')==cid and ob[0].get('photos')==3,f'Rest im Postausgang am Vorgang: {ob}')
    check(q.evaluate("document.documentElement.scrollWidth<=window.innerWidth"),'kein waagerechtes Scrollen')
    if SHOTS: q.screenshot(path=f'{SHOTS}/netz_fotos_uk_820.png')
    check(not q.errs,f'keine Skriptfehler {q.errs}'); ctx.close()
    # (3) Lagerbuchung nach verlorener Antwort geändert (EN 1366)
    it=api('POST','/api/stock',{'site':site,'name':'Oil filter X','part_number':'OF-5','unit':'Stk','initial_qty':10,'unit_price_net':'12'})['d']; iid=it.get('id') or it.get('item',{}).get('id')
    ctx,q=device('nz.ws',1366,900,'en'); q.goto(B+'/#/stock/'+iid); q.wait_for_selector('#mf')
    q.select_option('#mf [name=type]','entnahme'); q.fill('#mf [name=qty]','5')
    st2={'n':0}
    def h2(route):
        if route.request.method=='POST':
            st2['n']+=1
            if st2['n']==1: route.fetch(); route.abort('failed'); return
        route.continue_()
    q.route('**/movements',h2); q.click('#mf button.btn'); q.wait_for_timeout(1500)
    q.select_option('#mf [name=type]','zugang'); q.fill('#mf [name=qty]','8'); q.click('#mf button.btn'); q.wait_for_timeout(2000)
    d=api('GET','/api/stock/'+iid)['d']
    check(d['item']['on_hand']==13 and sorted((m['type'],m['qty']) for m in d.get('movements',[]))==[('entnahme',-5),('zugang',8),('zugang',10)],f"geänderte Buchung gebucht: {d['item']['on_hand']}")
    check(not q.errs,f'keine Skriptfehler {q.errs}'); ctx.close()
    br.close()
print('Netz/Seitenwechsel: '+('alles grün' if not fails else 'FEHLER: '+' | '.join(fails)))
raise SystemExit(1 if fails else 0)
