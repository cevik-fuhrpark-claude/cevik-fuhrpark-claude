# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 788, Blickwinkel „Werkstatt-Tablet mit fremder Sprache (UK) und Fotos“): Der Verlauf eines
# Vorgangs nennt erledigte Schritte in der Vergangenheitsform („Reparatur freigegeben“, UK „Ремонт дозволено“) statt mit der
# Knopf-Beschriftung („Reparatur freigeben“ las sich wie eine Aufforderung an die Werkstatt). Fahrer meldet mit zwei Fotos, Inhaber gibt frei,
# Werkstatt (Kontosprache UK, ebenso DE/EN) übernimmt, beginnt, bucht Arbeitszeit und wartet auf Teile; Prüfung in DE/UK/EN bei 390/820/1366 px.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, name]) => { const b = new Uint8Array(400); crypto.getRandomValues(b); b.set([0xff,0xd8,0xff,0xe0]);
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-cfp': '1', 'x-filename': encodeURIComponent(name) }, body: b }); return r.status; }"""
PAST={'de':['Reparatur freigegeben','Auftrag übernommen','Reparatur begonnen','Arbeitszeit erfasst'],
      'uk':['Ремонт дозволено','Замовлення прийнято','Ремонт розпочато','Час роботи записано'],
      'en':['Repair approved','Order accepted','Repair started','Hours logged']}
IMP={'de':['Reparatur freigeben','Auftrag übernehmen','Reparatur beginnen','Arbeitszeit erfassen'],
     'uk':['Дозволити ремонт','Прийняти замовлення','Почати ремонт','Записати час роботи'],
     'en':['Approve repair','Accept order','Start repair','Log hours']}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vv.inhaber','display_name':'VV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:5]
    def mk(un,role,lang,**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return un
    drv=mk('vv.fahrer'+sfx,'driver','uk')
    ws={l:mk(f'vv.ws.{l}{sfx}','workshop',l,workshop_site='DORTMUND') for l in ['de','uk','en']}
    vin='WDB9634031L4'+sfx
    api('POST','/api/vehicles',{'vin':vin,'plate':'VV-AB '+sfx[:4],'site':'Dortmund'})
    dc=br.new_context(); d=dc.new_page(); d.goto(B); d.evaluate(JS,['POST','/api/login',{'username':drv,'password':PW}])
    c=d.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Дзеркало праворуч розбите','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())}])
    check(c['s']==201,'Meldung des Fahrers'); cid=c['d']['id']
    check(all(d.evaluate(UP,[f'/api/cases/{cid}/files',f])==201 for f in ['фото1.jpg','фото2.jpg']),'zwei Fotos beim Melden'); dc.close()
    def cmd(caller,act,payload=None,note=None):
        v=caller('GET',f'/api/cases/{cid}')['d']['case']['version']
        return caller('POST',f'/api/cases/{cid}/commands',{'action':act,'command_id':str(uuid.uuid4()),'expected_version':v,'note':note,'payload':payload or {}})['s']
    check(cmd(api,'approve_repair',{'workshop_site':'DORTMUND'},'Замінити дзеркало')==200,'Reparatur freigegeben')
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':ws['uk'],'password':PW}])
    wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    check(cmd(wapi,'acknowledge')==200 and cmd(wapi,'start_repair')==200,'Werkstatt übernimmt und beginnt')
    check(cmd(wapi,'record_work',{'hours':'1,5','description':'Дзеркало демонтовано'})==200,'Arbeitszeit gebucht'); wc.close()
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':ws[lang],'password':PW}])
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('ol.timeline',timeout=15000); q.wait_for_timeout(300)
        labels=q.eval_on_selector_all('ol.timeline li > b','e=>e.map(x=>x.textContent.trim())')
        for past,imp in zip(PAST[lang],IMP[lang]):
            check(past in labels and imp not in labels,f'{lang} {wd}px: Verlauf „{past}“ statt „{imp}“')
        if lang=='uk': check(q.locator('[data-act="record_work"]').inner_text().strip()==IMP['uk'][3],f'{lang} {wd}px: Knopf bleibt „{IMP["uk"][3]}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('ol.timeline').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/verlauf-vergangenheit-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
