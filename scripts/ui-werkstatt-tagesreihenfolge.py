# [CLAUDE] UI-Test (27.10.2026, Backlog 457, Blickwinkel „Leitung gibt fünf Aufträge für denselben Tag frei – sieht die Werkstatt die Tagesreihenfolge?“):
# drei Aufträge mit Termin heute (niedrig zuerst gemeldet, dann mittel, dann niedrig + gesperrt). Werkstatt-Startseite „Heute geplant“ und
# Werkstattplan (heutiger Tag) zeigen dieselbe feste Reihenfolge gesperrt → mittel → niedrig, auch nach einem späteren Kommentar am
# ältesten Auftrag; Hinweis zur Reihenfolge (#wsdayorder, #wpdayorder) sichtbar. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Hinweis zum Termin','uk':'Примітці до терміну','en':'Note on the date'}
TODAY=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date().isoformat()
WANT=['WT-AB 3','WT-AB 2','WT-AB 1']
ORDER_JS="""(sel) => { const out = []; let el = document.querySelector(sel); while (el && !(el.classList && el.classList.contains('list'))) el = el.nextElementSibling;
  if (!el) return out; for (const a of el.querySelectorAll('a.row')) { const m = a.textContent.match(/WT-AB \\d/); if (m) out.push(m[0]); } return out; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wt.inhaber','display_name':'WT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    users=[]
    for lang in ['de','uk','en']:
        un='wt.ws.'+lang; users.append((lang,un))
        u=api('POST','/api/users',{'username':un,'display_name':'WT Werkstatt '+lang.upper(),'role':'workshop','environment':'production','workshop_site':'DORTMUND','language':lang})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    def cmd(cid,action,payload,note):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload,'note':note})
    ids=[]
    for i,(prio,desc) in enumerate([('niedrig','Spiegel locker'),('mittel','Tür klemmt'),('niedrig','Bremse quietscht')]):
        vin=f'WDB9634031L40007{i}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'WT-AB {i+1}','site':'Dortmund'})
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':prio,'driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        ids.append(c['d']['id']); a.wait_for_timeout(20)
    for cid in ids: check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND','planned_date':TODAY},'freigegeben')['s']==200,'Freigabe mit Termin heute')
    check(cmd(ids[2],'set_safety_lock',{},'Bremse prüfen')['s']==200,'Sperre WT-AB 3')
    check(cmd(ids[0],'comment',{},'Später angesehen')['s']==200,'Kommentar am ältesten Auftrag')
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#wsdayorder',timeout=15000); q.wait_for_timeout(400)
        check(HINT[lang] in q.locator('#wsdayorder').inner_text(),f'{lang} {wd}px: Startseite Hinweis zur Reihenfolge')
        got=q.evaluate(ORDER_JS,'#wsdayorder')
        check(got==WANT,f'{lang} {wd}px: Heute geplant {got}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Startseite ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wsday_{lang}_{wd}.png',full_page=True)
        q.goto(B+'/#/plan'); q.wait_for_selector('#wpdayorder',timeout=15000); q.wait_for_timeout(300)
        got2=q.evaluate("""(js) => { const h = [...document.querySelectorAll('h2')].find((x) => x.querySelector('.chip.ok')); if (!h) return null; h.id = 'wptoday'; return true; }""",None)
        got2=q.evaluate(ORDER_JS,'#wptoday') if got2 else None
        check(got2==WANT,f'{lang} {wd}px: Werkstattplan heute {got2}')
        check(HINT[lang] in q.locator('#wpdayorder').inner_text(),f'{lang} {wd}px: Plan Hinweis zur Reihenfolge')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Plan ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wpday_{lang}_{wd}.png',full_page=False)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
