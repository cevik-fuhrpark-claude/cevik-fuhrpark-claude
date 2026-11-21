# [CLAUDE] UI-Test (21.11.2026, Backlog 1654, Blickwinkel „Werkstatt erfasst ein Teil mit vertipptem Gewährleistungsjahr“): „Gewährleistung bis“
# vor dem Monat der Erstzulassung wird bei Teil und Fremdleistung vom Server mit Feld warranty_until abgelehnt; Formular bleibt offen, Feld
# markiert, Meldung übersetzt; Felder mit min/max und Beschriftung (for/id). DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Gewährleistung bis liegt vor der Erstzulassung des Fahrzeugs – bitte Jahr prüfen.','uk':'Гарантія до — раніше першої реєстрації транспортного засобу, перевірте рік.','en':'Warranty until is before the vehicle’s first registration – please check the year.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gw.inhaber','display_name':'GW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    VIN='WDB96340310165401'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'GW-AB 1654','vin':VIN,'site':'Dortmund','kind':'lkw'})
    today=datetime.date.today(); ez=today.replace(day=1); old=(ez-datetime.timedelta(days=20)).isoformat()
    y10=today.replace(year=today.year+10) if not (today.month==2 and today.day==29) else today.replace(year=today.year+10, day=28)
    sp=api('POST','/api/vehicles/'+vid+'/spec',{'first_registration':ez.isoformat(),'spec_source':'Fahrzeugschein (Test)'}); check(sp['s']==200,'Erstzulassung gesetzt')
    n=0
    def mkcase(k):
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'GW {k} Anlasser dreht nicht','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'gw-{os.getpid()}-{k}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'gwa-{os.getpid()}-{k}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'; cid=mkcase(n)
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gw.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for act,fid in [('add_part','pwarr'),('add_external_cost','xwarr')]:
            q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector(f'[data-act={act}]',timeout=15000)
            q.click(f'[data-act={act}]'); q.wait_for_selector('#'+fid,timeout=15000)
            at=q.evaluate("(f)=>{const i=document.getElementById(f); return [i.min, i.max, !!document.querySelector('label[for='+f+']')]}", fid)
            check(at[0]=='2000-01-01' and at[1]==y10.isoformat() and at[2], f'{tag} {act}: min/max/Beschriftung {at}')
            if act=='add_part': q.fill('#af [name=name]',f'Anlasser 24V {n}'); q.fill('#af [name=quantity]','1') if q.locator('#af [name=quantity]').count() else None
            else: q.fill('#af [name=supplier]','Elektrik Nord'); q.fill('#af [name=amount_net]','80')
            q.fill('#'+fid,old)
            q.click('#af button:not([type=button])')
            try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=8000); shown=True
            except Exception: shown=False
            check(shown, f'{tag} {act}: Meldung übersetzt sichtbar')
            check(q.evaluate("(f)=>document.getElementById(f) && document.getElementById(f).getAttribute('aria-invalid')", fid)=='true', f'{tag} {act}: Feld markiert, Formular offen')
            d=api('GET',f'/api/cases/{cid}')['d']; check(not d.get('external_costs') and not d.get('parts'), f'{tag} {act}: nichts gebucht')
            q.evaluate("(f)=>document.getElementById(f).scrollIntoView({block:'center'})", fid)
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {act}: kein Querscrollen')
            if SHOTS: q.screenshot(path=f'{SHOTS}/gw_{act}_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
