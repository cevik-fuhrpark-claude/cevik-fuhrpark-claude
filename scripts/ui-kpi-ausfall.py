# [CLAUDE] UI-Test (16.10.2026): (1) Vorgangsansicht mit einem Status länger als 48 h – „Dauer je Status“ in Tagen, kein Absturz
# (vorher „.tofmtNum()“ → Seite brach ab); (2) Kennzahlen je Fahrzeug zeigen „Ausfall“ (Werkstatt-Übernahme bis jetzt bzw. Sperre),
# zwei parallele Aufträge am selben Fahrzeug zählen einmal. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server mit /__dev/backdate (scripts/dev-server.mjs, frisch: sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777761'; VID='VIN:'+VIN
TPS={'de':'Dauer je Status','uk':'Тривалість за статусом','en':'Time per status'}
DOWN={'de':'Ausfall','uk':'Простій','en':'Downtime'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'af.inhaber','display_name':'AF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'af.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'AF-UI 1','vin':VIN,'site':'Dortmund'})
    ws_site=api('GET','/api/meta')['d']['workshops'][0]['code']
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'af-{cid}-{action}','expected_version':v,'note':note,'payload':payload or {}})
    ids=[]
    for k,hrs in [('a',72),('b',30)]:
        cid=api('POST','/api/cases',{'vehicle_id':VID,'description':f'Ausfalltest {k}: Spiegel','priority':'niedrig','driveability':'fahrbereit','request_key':f'af-{k}'})['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':ws_site},'Ausfalltest')['s']==200,f'{k}: Reparatur freigegeben')
        check(cmd(cid,'acknowledge')['s']==200,f'{k}: übernommen')
        r=a.evaluate("async (u) => (await fetch(u, { method: 'POST' })).json()", f'/__dev/backdate?case={cid}&hours={hrs}')
        check(r.get('cases')==1 and r.get('events',0)>=3,f'{k}: um {hrs} h zurückdatiert ({r})')
        ids.append(cid)
    k=api('GET','/api/reports/kpi')['d']; v=[x for x in k['vehicles'] if x['vehicle_id']==VID]
    check(v and abs(v[0]['downtime_h']-72)<0.2,f"Ausfall 72 h (parallel einmal, nicht 102): {v and v[0]['downtime_h']}")
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'af.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{ids[0]}'); q.wait_for_selector('h2',timeout=15000); q.wait_for_timeout(400)
        body=q.inner_text('#app')
        check(TPS[lang] in body,f'{lang}/{w}: Vorgang zeigt „{TPS[lang]}“')
        dd=q.evaluate("(t)=>{ const h=[...document.querySelectorAll('#app h2')].find(x=>x.textContent.includes(t)); const dl=h&&h.nextElementSibling; return dl?dl.innerText:''; }",TPS[lang])
        check(re.search(r'\b3\b',dd) is not None and 'NaN' not in dd and 'undefined' not in dd,f'{lang}/{w}: Dauer in Tagen ({dd.splitlines()[-1] if dd else "-"})')
        if SHOTS: q.locator('h2', has_text=TPS[lang]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/af_vorgang_{lang}_{w}.png')
        q.goto(B+'/#/kpi'); q.wait_for_selector('#kpiveh',timeout=15000)
        row=q.locator('#kpivl a.row', has_text='AF-UI 1')
        txt=row.inner_text() if row.count() else ''
        check(DOWN[lang] in txt and re.search(r'3([,.]0)? ',txt) is not None,f'{lang}/{w}: Kennzahlen-Zeile mit „{DOWN[lang]}“ 3 Tage ({txt.replace(chr(10)," ")[:120]})')
        rules=q.inner_text('#app')
        check(DOWN[lang] in rules.split(TPS[lang])[0] or DOWN[lang] in rules,f'{lang}/{w}: Erklärung nennt „{DOWN[lang]}“')
        if SHOTS and row.count(): row.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/af_kpi_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Ausfallzeit/Dauer je Status: ALLES GRÜN')
raise SystemExit(1 if fails else 0)
