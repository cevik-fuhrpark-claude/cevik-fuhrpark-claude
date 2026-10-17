# [CLAUDE] UI-Test: Hinweise im Aktionsformular – „Abschlusskontrolle anfordern“ nach Nacharbeit ohne neue Kontrolle nach Reparatur
# und „Technische Freigabe“ bei offener Kostenfreigabe (Server lehnt beides ebenfalls ab). Synthetische Daten, Grenze 100 € nur für den Test.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888852'; VID='VIN:'+VIN
TXT={'de':('neue Fahrzeugkontrolle','Kostenfreigabe ausstehend'),'uk':('нова перевірка','Очікує погодження витрат'),'en':('new vehicle check','Cost approval pending')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nf.inhaber','display_name':'NF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'nf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'NF-UI 1','vin':VIN,'site':'Dortmund'})
    meta=api('GET','/api/meta')['d']; ws_site=meta['workshops'][0]['code']; items=[{'key':c['key'],'result':'ok'} for c in meta['checklist']]
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'nf-{n[0]}','expected_version':v,'note':note,'payload':payload or {}})['s']
    def to_qc(desc,extra=None):
        cid=api('POST','/api/cases',{'vehicle_id':VID,'description':desc,'priority':'niedrig','driveability':'fahrbereit','request_key':'nf-'+desc[:12]})['d']['id']
        st=[cmd(cid,'approve_repair',{'workshop_site':ws_site},'Test'),cmd(cid,'start_repair'),cmd(cid,'record_work',{'hours':1,'description':'Arbeit'})]
        if extra: st.append(extra(cid))
        n[0]+=1; st.append(api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'nf-i{n[0]}','items':items})['s'])
        st.append(cmd(cid,'request_quality_check',{},'Repariert'))
        return cid,st
    rw,st=to_qc('Nacharbeit-Hinweis Blinker'); st.append(cmd(rw,'return_for_rework',{},'Blinker links ohne Funktion'))
    check(st==[200,200,200,201,200,200],f'Vorgang Nacharbeit vorbereitet {st}')
    check(api('PUT','/api/settings',{'repair_cost_limit_net':100})['s']==200,'Grenze 100 € (Test)')
    co,st=to_qc('Kostenfreigabe-Hinweis Bremse',lambda cid: cmd(cid,'add_part',{'name':'Bremsbelag','quantity':1,'unit_price_net':250}))
    check(st==[200,200,200,200,201,200],f'Vorgang Kostenfreigabe vorbereitet {st}')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'nf.inhaber','password':PW}])
        for cid,act,sel,i,tag in [(rw,'request_quality_check','#rwinsp',0,'rw'),(co,'technical_release','#relcost',1,'kosten')]:
          q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector(f'[data-act="{act}"]',timeout=15000); q.click(f'[data-act="{act}"]')
          ok=True
          try: q.wait_for_selector(sel,timeout=8000)
          except Exception: ok=False
          check(ok and TXT[lang][i].lower() in q.inner_text(sel).lower(),f'{lang}/{w}: Hinweis {tag}')
          if SHOTS and ok: q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/nf_{tag}_{lang}_{w}.png')
          check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen ({tag})')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PUT','/api/settings',{'repair_cost_limit_net':''}); api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Nacharbeit/Kostenfreigabe-Hinweise: alles grün')
raise SystemExit(1 if fails else 0)
