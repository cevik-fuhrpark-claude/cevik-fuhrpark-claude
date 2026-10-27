# [CLAUDE] UI-Test (27.10.2026, Backlog 454, Blickwinkel „derselbe Auftrag steht in ‚Heute geplant‘ und ‚Neu – bitte übernehmen‘“):
# Werkstatt-Startseite: Auftrag mit Termin heute, noch nicht übernommen, steht oben unter „Heute geplant“ und unten im Arbeitsschritt
# „Neu – bitte übernehmen“ – dort mit „↑ steht auch oben: Heute geplant“; ein Satz nennt „Offene Aufträge insgesamt: 2“ (nicht 3);
# ein Auftrag ohne Hervorhebung trägt keinen Zusatz. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ALSO={'de':'steht auch oben: Heute geplant','uk':'є також вище: Заплановано на сьогодні','en':'also listed above: Planned for today'}
TOTAL={'de':'insgesamt: 2.','uk':'усього: 2.','en':'in total: 2.'}
TODAY=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date().isoformat()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wd.inhaber','display_name':'WD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wd.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    users=[]
    for lang in ['de','uk','en']:
        un='wd.ws.'+lang; users.append((lang,un))
        u=api('POST','/api/users',{'username':un,'display_name':'WD Werkstatt '+lang.upper(),'role':'workshop','environment':'production','workshop_site':'DORTMUND','language':lang})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    api('POST','/api/vehicles',{'vin':'WDB9634031L400054','plate':'WD-AB 1','site':'Dortmund'})
    api('POST','/api/vehicles',{'vin':'WDB9634031L400055','plate':'WD-AB 2','site':'Dortmund'})
    def mk(vin,desc,plan):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        pl={'workshop_site':'DORTMUND'}
        if plan: pl['planned_date']=TODAY
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v,'payload':pl,'note':'freigegeben'})
        check(r['s']==200,f'Freigabe {desc} {r["s"]}')
    mk('WDB9634031L400054','Tür klemmt',True); mk('WDB9634031L400055','Scheibenwischer',False)
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#wsdupnote',timeout=15000); q.wait_for_timeout(400)
        note=q.locator('#wsdupnote').inner_text()
        check(TOTAL[lang] in note,f'{lang} {wd}px: Gesamtzahl 2 im Hinweis ({note[-40:]})')
        marks=q.locator('[data-alsoabove]')
        check(marks.count()==1 and ALSO[lang] in marks.first.inner_text(),f'{lang} {wd}px: genau ein Auftrag mit „steht auch oben“')
        rows=q.locator('.list a.row').filter(has_text='WD-AB 1')
        check(rows.count()==2,f'{lang} {wd}px: Auftrag erscheint oben und im Arbeitsschritt ({rows.count()})')
        check(rows.nth(1).locator('[data-alsoabove]').count()==1 and rows.nth(0).locator('[data-alsoabove]').count()==0,f'{lang} {wd}px: Zusatz nur unten')
        check(q.locator('.list a.row').filter(has_text='WD-AB 2').locator('[data-alsoabove]').count()==0,f'{lang} {wd}px: anderer Auftrag ohne Zusatz')
        m=marks.first
        check(m.evaluate('e=>{const s=e.closest(".sub"); return s.scrollWidth<=s.clientWidth+1}'),f'{lang} {wd}px: Zusatz nicht abgeschnitten')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wsdup_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
