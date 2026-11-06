# [CLAUDE] UI-Test (06.11.2026, Backlog 1073, Blickwinkel „Werkstatt bekommt zwei Aufträge für denselben Lkw am selben Tag“):
# Am selben Lkw läuft ein zweiter Werkstattauftrag → das Formular „Technisch freigeben“ nennt ihn (#relother mit Vorgangsnummer, Link, Status)
# vor dem Abholvermerk; ohne weiteren Auftrag kein Hinweis. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Weiterer Werkstattauftrag','uk':'Інше замовлення майстерні','en':'Another workshop order'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zw.inhaber','display_name':'ZW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'zw.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber','ae.inhaber','na.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    u=api('POST','/api/users',{'username':f'zw.ws{R}','display_name':'ZW Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    wctx=br.new_context(); q=wctx.new_page(); q.goto(B)
    q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); check(q.evaluate(JS,['POST','/api/login',{'username':f'zw.ws{R}','password':PW}])['s']==200,'Werkstatt angemeldet')
    def cmd(page,cid,action,payload=None,note=None):
        global n; n+=1
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'zw-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    vin=f'WDB97{R:05d}E000100'; pl=f'ZW-A {R%900}1'
    check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    def to_qc(k,pick):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Spiegel locker {k} (Test zweiter Auftrag)','priority':'mittel','driveability':'fahrbereit','request_key':f'zw-{R}-{k}'})
        cid=c['d']['id']
        ok=cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200 and cmd(q,cid,'start_repair')==200 and cmd(q,cid,'record_work',{'hours':1,'description':'Spiegel'})==200
        ok=ok and q.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'zw-i-{R}-{k}','items':items}])['s']==201
        ok=ok and cmd(q,cid,'request_quality_check',({'pickup_note':pick} if pick else {}),'fertig')==200
        check(ok,f'Vorgang {k} bis Abschlusskontrolle'); return cid
    def second(k):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Beleuchtung hinten links {k} (Test zweiter Auftrag)','priority':'niedrig','driveability':'fahrbereit','request_key':f'zw-b-{R}-{k}'})
        cid=c['d']['id']; check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Leuchte tauschen')==200 and cmd(q,cid,'start_repair')==200,f'zweiter Auftrag {k} in Reparatur')
        return cid, api('GET',f'/api/cases/{cid}')['d']['case']['case_no']
    def open_form(m,cid):
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('button[data-act="technical_release"]',timeout=15000)
        m.click('button[data-act="technical_release"]'); m.wait_for_selector('#pu_note',timeout=5000)
    # Gegenprobe: kein weiterer Auftrag → kein Hinweis
    c0=to_qc('0','')
    m=a; open_form(m,c0); check(m.locator('#relother').count()==0,'ohne weiteren Auftrag kein Hinweis')
    check(cmd(a,c0,'technical_release',{'confirm':True},'Kontrolle ok')==200,'erste Freigabe')
    k=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        k+=1
        cid=to_qc(str(k),''); bid,bno=second(k)
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        open_form(m,cid)
        t=m.inner_text('#relother') if m.locator('#relother').count() else ''
        check(HINT[lang] in t and bno in t,f'{lang} {w}px: Formular nennt zweiten Auftrag {bno}')
        check(m.locator(f'#relother a[href="#/cases/{bid}"]').count()==1,f'{lang} {w}px: Link zum zweiten Auftrag')
        check(m.evaluate(noscroll),f'{lang} {w}px: Freigabe-Formular ohne Querscrollen')
        if SHOTS: m.locator('#relother').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/zweiter_auftrag_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
