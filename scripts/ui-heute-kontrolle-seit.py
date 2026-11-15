# [CLAUDE] UI-Test (15.11.2026, Backlog 1505, Blickwinkel „Werkstatt meldet am Freitagabend drei Lkw fertig, Leitung kontrolliert am Montag“):
# „Heute zu tun“ der Leitung nennt bei „Abschlusskontrolle“ je Vorgang Werkstatt und Zeitpunkt der Meldung zur Kontrolle (älteste zuerst).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, re
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'qc.inhaber','display_name':'QC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='qc.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber','ar.inhaber','fa.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(api('GET','/api/me')['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000
    u=api('POST','/api/users',{'username':f'qc.ws{R}','display_name':'QC Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':'de'})
    check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
    wctx=br.new_context(); w=wctx.new_page(); w.goto(B)
    w.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); w.evaluate(JS,['POST','/api/login',{'username':f'qc.ws{R}','password':PW}])
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'qc-{action}-{cid}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    plates=[]
    for n in range(3):
        pl=f'QC-K {R%900}{n}'; vin=f'WDB96{R:05d}K{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt '+pl)
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel locker (Test Kontrolle seit)','priority':'mittel','driveability':'fahrbereit','request_key':f'qc-{R}-{n}'})
        cid=c['d']['id']
        ok=cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200 and cmd(w,cid,'start_repair')==200 and cmd(w,cid,'record_work',{'hours':1,'description':'Spiegel'})==200
        ok=ok and w.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'qc-i-{R}-{n}','items':items}])['s']==201
        check(ok and cmd(w,cid,'request_quality_check',{},'fertig')==200,'zur Kontrolle gemeldet '+pl); plates.append((pl,cid))
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/'); q.wait_for_selector(f'a.row[href="#/cases/{plates[0][1]}"]',timeout=20000,state='attached')
        for pl,cid in plates:
            txts=q.eval_on_selector_all(f'a.row[href="#/cases/{cid}"]','els=>els.map(e=>e.textContent)')
            hit=[t for t in txts if pl in t and re.search(r'\d{1,2}[./]\d{1,2}[./]\d{4},? \d{1,2}:\d{2}',t)]
            check(bool(hit),f'{lang}/{wd}: {pl} mit Werkstatt und Zeitpunkt {txts}')
            check(bool(hit) and ' · ' in hit[0] and hit[0].count(' · ')>=3,f'{lang}/{wd}: Zeile {hit[:1]}')
        det=q.locator(f'details:has(a.row[href="#/cases/{plates[0][1]}"])').first
        if not det.evaluate('e=>e.open'): det.locator('summary').click(); q.wait_for_timeout(200)
        if SHOTS: det.screenshot(path=f'{SHOTS}/qc-{lang}-{wd}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
