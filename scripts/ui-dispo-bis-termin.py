# [CLAUDE] UI-Test (28.10.2026, Backlog 459, Blickwinkel „Lkw hat nächste Woche einen Werkstatttermin – darf die Disposition ihn bis
# dahin einplanen?“): Werkstattauftrag mit Termin in 4 Tagen (übernommen, Hinweis zum Termin, nicht begonnen) und einer mit Termin heute.
# Startseite der Disposition: erster steht unter „Bis zum Werkstatttermin einplanbar“ mit „einplanbar bis <Vortag>“ und Hinweis, nicht
# unter „Nicht einplanen“; zweiter weiter unter „Nicht einplanen“. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Bis zum Werkstatttermin einplanbar','uk':'Можна планувати до дати майстерні','en':'Can be planned until the workshop date'}
UNTIL={'de':'einplanbar bis','uk':'можна планувати до','en':'can be planned until'}
NP={'de':'Nicht einplanen','uk':'Не планувати','en':'Do not plan'}
TODAY=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
day=lambda n: (TODAY+datetime.timedelta(days=n)).isoformat()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bt.inhaber','display_name':'BT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('bt.ws','workshop',workshop_site='DORTMUND')
    users=[]
    for lang in ['de','uk','en']: mkuser('bt.dispo.'+lang,'dispatch',lang); users.append((lang,'bt.dispo.'+lang))
    wc=br.new_context(); w=wc.new_page(); w.goto(B); w.evaluate(JS,['POST','/api/login',{'username':'bt.ws','password':PW}])
    wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    def cmd(f,cid,action,payload,note=None):
        v=f('GET',f'/api/cases/{cid}')['d']['case']['version']
        body={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
        if note: body['note']=note
        return f('POST',f'/api/cases/{cid}/commands',body)
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    def _case(vin,desc):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND'},'freigegeben')['s']==200,'Freigabe '+desc)
        check(cmd(wapi,cid,'start_repair',{})['s']==200,'Beginn '+desc); return cid
    def planned(vin,desc,d,note=None):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; check(cmd(api,cid,'approve_repair',{'workshop_site':'DORTMUND','planned_date':d},'Termin')['s']==200,'Freigabe '+desc)
        if note:
            check(cmd(wapi,cid,'acknowledge',{})['s']==200,'Übernahme '+desc)
            check(cmd(wapi,cid,'set_planned_date',{'planned_date':d,'planned_note':note})['s']==200,'Hinweis zum Termin')
        return cid
    for i,pl in enumerate(['BT-WT 1','BT-WT 2']): api('POST','/api/vehicles',{'vin':f'WDB9634031L40007{i}','plate':pl,'site':'Dortmund'})
    planned('WDB9634031L400070','Ölwechsel und Bremsen prüfen',day(4),'Lkw bis 7 Uhr bringen, Abholung 16 Uhr')
    planned('WDB9634031L400071','Spiegel locker',day(0))
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dupc',timeout=15000); q.wait_for_timeout(400)
        check(TITLE[lang] in q.locator('#dupc').inner_text(),f'{lang} {wd}px: Abschnitt')
        rows=q.locator('[data-dupc]')
        check(rows.count()==1 and 'BT-WT 1' in rows.first.inner_text(),f'{lang} {wd}px: nur BT-WT 1 ({rows.count()})')
        dd=(TODAY+datetime.timedelta(days=3)).strftime('%d/%m/%Y' if lang=='en' else '%d.%m.%Y')
        txt=rows.first.inner_text()
        check(UNTIL[lang] in txt and dd in txt and '7 Uhr' in txt,f'{lang} {wd}px: Vortag {dd} und Hinweis zum Termin')
        check(rows.first.evaluate('e=>{const s=e.querySelector(".sub"); return s.scrollWidth<=s.clientWidth+1}'),f'{lang} {wd}px: Unterzeile nicht abgeschnitten')
        # BT-WT 1 erscheint nicht in der Liste direkt unter „Nicht einplanen“
        inNp=q.evaluate('''([np,pl])=>{const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.trim()===np); if(!h) return null; const l=h.nextElementSibling; return [...l.querySelectorAll('a.row')].map(a=>a.textContent).join('|')}''',[NP[lang],'BT-WT 1'])
        check(inNp is not None and 'BT-WT 2' in inNp and 'BT-WT 1' not in inNp,f'{lang} {wd}px: Nicht einplanen = nur BT-WT 2 ({inNp and inNp[:80]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dupc_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
