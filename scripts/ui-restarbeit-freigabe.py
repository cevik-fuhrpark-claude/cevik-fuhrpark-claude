# [CLAUDE] UI-Test: Restarbeit nach technischer Freigabe noch erledigen (Knopf + Formular) und Arbeitsdatum mit Grenzen im Formular
# „Arbeit erfassen“ (max = heute, min = 12 Monate vor dem Meldetag – wie der Server). Synthetische Daten.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, zoneinfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888861'; VID='VIN:'+VIN
TODAY=datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Berlin')).date().isoformat()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rf.inhaber','display_name':'RF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'RF-UI 1','vin':VIN,'site':'Dortmund'})
    meta=api('GET','/api/meta')['d']; ws_site=meta['workshops'][0]['code']; items=[{'key':c['key'],'result':'ok'} for c in meta['checklist']]
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'rf-{n[0]}','expected_version':v,'note':note,'payload':payload or {}})['s']
    def new(desc):
        cid=api('POST','/api/cases',{'vehicle_id':VID,'description':desc,'priority':'niedrig','driveability':'fahrbereit','request_key':'rf-'+desc[:12]})['d']['id']
        return cid,[cmd(cid,'approve_repair',{'workshop_site':ws_site},'Test'),cmd(cid,'start_repair'),cmd(cid,'record_work',{'hours':1,'description':'Arbeit'})]
    rel,st=new('Restarbeit-Freigabe Halter')
    st.append(cmd(rel,'add_open_item',{'description':'Kennzeichenhalter nachziehen'}))
    n[0]+=1; st.append(api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':rel,'request_key':f'rf-i{n[0]}','items':items})['s'])
    st.append(cmd(rel,'request_quality_check',{},'Repariert')); st.append(cmd(rel,'technical_release',{'confirm':True},'Kontrolle ok'))
    check(st==[200,200,200,200,201,200,200],f'freigegebener Vorgang mit Restarbeit {st}')
    wk,st=new('Arbeitsdatum-Grenzen Licht'); check(st==[200,200,200],f'Vorgang in Reparatur {st}')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rf.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{rel}'); ok=True
        try: q.wait_for_selector('[data-resolve]',timeout=15000); q.click('[data-resolve]'); q.wait_for_selector('textarea',timeout=8000)
        except Exception: ok=False
        check(ok,f'{lang}/{w}: Restarbeit nach Freigabe erledigbar (Knopf + Formular)')
        if SHOTS and ok: q.screenshot(path=f'{SHOTS}/rf_restarbeit_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen (Restarbeit)')
        q.goto(B+f'/#/cases/{wk}'); ok=True
        try: q.wait_for_selector('[data-act="record_work"]',timeout=15000); q.click('[data-act="record_work"]'); q.wait_for_selector('input[name=work_date]',timeout=8000)
        except Exception: ok=False
        mx=q.get_attribute('input[name=work_date]','max') if ok else None; mn=q.get_attribute('input[name=work_date]','min') if ok else None
        check(ok and mx==TODAY and mn==str(int(TODAY[:4])-1)+TODAY[4:] if not TODAY.endswith('02-29') else ok,f'{lang}/{w}: Arbeitsdatum max {mx} min {mn}')
        if SHOTS and ok: q.locator('input[name=work_date]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rf_arbeitsdatum_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen (Arbeit)')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Restarbeit nach Freigabe/Arbeitsdatum: alles grün')
raise SystemExit(1 if fails else 0)
