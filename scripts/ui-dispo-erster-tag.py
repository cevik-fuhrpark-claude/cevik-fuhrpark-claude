# [CLAUDE] UI-Test (26.10.2026, Blickwinkel „Disposition, erster Tag“, Backlog 368/369):
# Dispo-Startseite: „Rückkehr: ungeklärt“ auch bei laufender Reparatur mit künftigem Werkstatttermin (Termin = Beginn, nicht Fertigstellung),
# nicht bei freigegebenem Auftrag mit künftigem Termin; Link „Neue Meldungen, Eingang noch nicht bestätigt (n)“ → Vorgangsliste mit Reiter
# (Name für Nicht-Leitung) und nur den unbestätigten Meldungen. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UNK={'de':'Rückkehr: ungeklärt','uk':'Повернення: не з’ясовано','en':'Return: unclear'}
NEW={'de':'Neue Meldungen, Eingang noch nicht bestätigt','uk':'Нові повідомлення, отримання ще не підтверджено','en':'New reports, receipt not yet confirmed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
fut=(datetime.date.today()+datetime.timedelta(days=5)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'et.inhaber','display_name':'ET Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'et.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def inv(b):
        u=api('POST','/api/users',b); c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    inv({'username':'et.dispo','display_name':'ET Dispo','role':'dispatch','environment':'production','home_site':'Essen'})
    inv({'username':'et.werkstatt','display_name':'ET WS','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    V={}
    for pl,vin in [('ET-FR 1','WDB9634031L200001'),('ET-RE 2','WDB9634031L200002'),('ET-NE 3','WDB9634031L200003')]:
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':'Essen'}); V[pl]='VIN:'+vin
    def mk(cl,pl,desc):
        r=cl('POST','/api/cases',{'vehicle_id':V[pl],'description':desc,'priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        return r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    def cmd(cl,cid,action,payload={},note=None):
        ver=cl('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':ver,'payload':payload}
        if note: b['note']=note
        return cl('POST',f'/api/cases/{cid}/commands',b)
    c1=mk(api,'ET-FR 1','Spiegel'); c2=mk(api,'ET-RE 2','Rückleuchte')
    check(cmd(api,c1,'approve_repair',{'workshop_site':'DORTMUND','planned_date':fut},'frei')['s']==200,'Auftrag 1 freigegeben mit künftigem Termin')
    check(cmd(api,c2,'approve_repair',{'workshop_site':'DORTMUND','planned_date':fut},'frei')['s']==200,'Auftrag 2 freigegeben mit künftigem Termin')
    wctx=br.new_context(); w=wctx.new_page(); w.goto(B); wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b]); wapi('POST','/api/login',{'username':'et.werkstatt','password':PW})
    check(cmd(wapi,c2,'start_repair')['s']==200,'Auftrag 2 in Reparatur')
    dctx=br.new_context(); d=dctx.new_page(); d.goto(B); dapi=lambda m,pa,b=None: d.evaluate(JS,[m,pa,b]); dapi('POST','/api/login',{'username':'et.dispo','password':PW})
    c3=mk(dapi,'ET-NE 3','Telefonische Meldung: Wischer'); dctx.close()
    for lang in ['en','uk','de']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'et.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang,'home_site':'Essen'}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dsitebar',timeout=15000); q.wait_for_timeout(600)
        rows=q.locator('.list a.row').all_inner_texts()
        fr=[x for x in rows if 'ET-FR 1' in x]; re_=[x for x in rows if 'ET-RE 2' in x]
        check(fr and UNK[lang] not in fr[0],f'{lang} {wd}px: freigegeben mit künftigem Termin ohne „ungeklärt“')
        check(re_ and UNK[lang] in re_[0],f'{lang} {wd}px: in Reparatur → „ungeklärt“ trotz Termin')
        lk=q.locator('#dunrec')
        check(lk.count()==1 and NEW[lang]+' (1)' in lk.inner_text(),f'{lang} {wd}px: Link neue Meldungen (1)')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Start ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dispo1_{lang}_{wd}.png',full_page=True)
        lk.click(); q.wait_for_selector('.seg-tabs a.on',timeout=15000); q.wait_for_timeout(600)
        check(NEW[lang] in q.inner_text('.seg-tabs a.on'),f'{lang} {wd}px: Reiter-Name für Disposition')
        lst=q.inner_text('#app')
        check('ET-NE 3' in lst and 'ET-FR 1' not in lst,f'{lang} {wd}px: Liste nur unbestätigte')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Liste ohne Querscrollen')
        if SHOTS and wd==390: q.screenshot(path=f'{SHOTS}/dispo1_liste_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    wctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
