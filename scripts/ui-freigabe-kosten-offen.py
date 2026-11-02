# [CLAUDE] UI-Test (02.11.2026, Backlog 888): „Technisch freigeben“ nennt vorher nur geschätzte bzw. unbewertete Fremdleistungen/Teile
# („Kosten noch nicht vollständig belegt“)  – nach der Freigabe lässt sich nichts mehr buchen.
# Voll belegter Auftrag: kein Hinweis. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Dev-Server (CFP_URL, Port 8787).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ko.inhaber','display_name':'KO Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['ko.inhaber','fk.inhaber','rf.inhaber','ba.inhaber','fb.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    meta=api('GET','/api/meta')['d']; site=meta['workshops'][0]['code']; items=[{'key':c['key'],'result':'ok'} for c in meta['checklist']]
    vid='VIN:WDB96340310788888'; api('POST','/api/vehicles',{'plate':'KO-FR 888','vin':'WDB96340310788888','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'ko-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def ready(desc,bookings):
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':desc,'priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'ko-{os.getpid()}-{desc[:10]}'})['d']['id']
        st=[cmd(cid,'approve_repair',{'workshop_site':site},'Test'),cmd(cid,'start_repair')]+[cmd(cid,a_,p_) for a_,p_ in bookings]
        n[0]+=1; st.append(api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'ko-{os.getpid()}-i{n[0]}','items':items})['s'])
        st.append(cmd(cid,'request_quality_check',{},'Repariert'))
        return cid,st
    c_open,st=ready('Spiegel rechts extern',[('add_external_cost',{'supplier':'Truck-Service Nord','amount_net':'400','valuation':'estimate'}),('add_part',{'name':'Spiegelglas','quantity':'1'})])
    check(all(x in (200,201) for x in st),f'Auftrag mit Schätzung/ohne Preis in Abschlusskontrolle {st}')
    c_ok,st=ready('Spiegel oben extern',[('add_external_cost',{'supplier':'Truck-Service Nord','amount_net':'250'})])
    check(all(x in (200,201) for x in st),f'voll belegter Auftrag in Abschlusskontrolle {st}')
    def open_rel(q,cid):
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="technical_release"]', timeout=15000)
        q.locator('button[data-act="technical_release"]').first.click(); q.wait_for_selector('#af', timeout=10000); q.wait_for_timeout(150)
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        open_rel(q,c_open); T=q.evaluate(TR)
        exp=T['rel_cost_open'].replace('{x}',T['rel_cost_est'].replace('{n}','1')+' · '+T['rel_cost_unv'].replace('{n}','1'))
        tx=q.inner_text('#relcostopen') if q.locator('#relcostopen').count() else ''
        check(tx.strip()==exp,f'{lang} {w}px: Hinweis Schätzung/ohne Preis ({tx[:60]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#af').screenshot(path=f'{SHOTS}/relkosten888_{lang}_{w}.png')
        open_rel(q,c_ok)
        check(q.locator('#relcostopen').count()==0,f'{lang} {w}px: voll belegt ohne Hinweis')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
