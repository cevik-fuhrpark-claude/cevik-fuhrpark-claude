# [CLAUDE] UI-Test (16.10.2026): Kennzahlen „Technische Verfügbarkeit“ – Panel mit Quote (Prozent im Sprachformat), Fahrzeuge,
# Ausfall gesamt, Liste „Geringste Verfügbarkeit“ mit dem Testfahrzeug, Wert auch in der Fahrzeugzeile; Erklärung; Hilfe nennt es.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server mit /__dev/backdate. Screenshots: CFP_SHOTS=<Ordner>.
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777762'; VID='VIN:'+VIN
AV={'de':'Technische Verfügbarkeit','uk':'Технічна готовність','en':'Technical availability'}
LOW={'de':'Geringste Verfügbarkeit','uk':'Найнижча готовність','en':'Lowest availability'}
SHORT={'de':'Verfügbarkeit','uk':'Готовність','en':'Availability'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vf.inhaber','display_name':'VF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='vf.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'VF-UI 1','vin':VIN,'site':'Dortmund'})
    bd=lambda q: a.evaluate("async (u) => (await fetch(u, { method: 'POST' })).json()", '/__dev/backdate?'+q)
    check(bd(f'vehicle={VID}&hours={24*60}').get('vehicles')==1,'Fahrzeug-Anlage 60 Tage zurück')
    ws_site=api('GET','/api/meta')['d']['workshops'][0]['code']
    cid=api('POST','/api/cases',{'vehicle_id':VID,'description':'Verfügbarkeitstest: Kupplung','priority':'mittel','driveability':'fahrbereit','request_key':'vf-a'})['d']['id']
    def cmd(action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'vf-{cid}-{action}','expected_version':v,'note':note,'payload':payload or {}})
    check(cmd('approve_repair',{'workshop_site':ws_site},'Verfügbarkeitstest')['s']==200,'Reparatur freigegeben')
    check(cmd('acknowledge')['s']==200,'übernommen')
    check(bd(f'case={cid}&hours=30').get('cases')==1,'Vorgang 30 h zurückdatiert')
    k=api('GET','/api/reports/kpi')['d']; av=k.get('availability') or {}
    mine=[x for x in av.get('lowest',[]) if x['vehicle_id']==VID]
    check(av and av['pct']<100 and mine and mine[0]['pct']<100,f"API: Verfügbarkeit {av.get('pct')} %, Testfahrzeug {mine and mine[0]['pct']} %")
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.goto(B+'/#/kpi'); q.wait_for_selector('#kpiav',timeout=15000)
        t=q.inner_text('#kpiav')
        check(AV[lang] in t and LOW[lang] in t and 'VF-UI 1' in t,f'{lang}/{w}: Panel „{AV[lang]}“ mit Testfahrzeug')
        pc=re.findall(r'\d+(?:[.,]\d)\s%',t)
        sep=',' if lang in ('de','uk') else '.'
        check(pc and all(sep in x for x in pc) and 'NaN' not in t and 'undefined' not in t,f'{lang}/{w}: Prozent im Sprachformat ({pc[:2]})')
        row=q.locator('#kpivl a.row', has_text='VF-UI 1')
        rt=row.inner_text() if row.count() else ''
        check(SHORT[lang] in rt and '%' in rt,f'{lang}/{w}: Fahrzeugzeile nennt „{SHORT[lang]}“ ({rt.replace(chr(10)," ")[:100]})')
        if SHOTS: q.locator('#kpiav').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vf_kpi_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Technische Verfügbarkeit: ALLES GRÜN')
raise SystemExit(1 if fails else 0)
