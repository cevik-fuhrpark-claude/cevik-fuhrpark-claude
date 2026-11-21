# [CLAUDE] UI-Test (21.11.2026, Backlog 1649, Folge aus 1647): Fremdleistung mit km-Stand – „Datum laut Rechnung“ vor dem Monat der
# Erstzulassung wird vom Server mit Feld odometer_on abgelehnt; Formular bleibt offen, Feld markiert, Meldung übersetzt; Feld hat min/max und
# Beschriftung. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Datum laut Rechnung liegt vor der Erstzulassung des Fahrzeugs.','uk':'Дата за рахунком раніша за першу реєстрацію транспортного засобу.','en':'The invoice date is before the vehicle’s first registration.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fe.inhaber','display_name':'FE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fe.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    VIN='WDB96340310164901'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'FE-AB 1649','vin':VIN,'site':'Dortmund','kind':'lkw'})
    today=datetime.date.today(); ez=today.replace(day=1); old=(ez-datetime.timedelta(days=20)).isoformat()
    sp=api('POST','/api/vehicles/'+vid+'/spec',{'first_registration':ez.isoformat(),'spec_source':'Fahrzeugschein (Test)'}); check(sp['s']==200,'Erstzulassung gesetzt')
    n=0
    def mkcase(k):
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'FE {k} Bremse quietscht','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'fe-{os.getpid()}-{k}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'fea-{os.getpid()}-{k}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'; cid=mkcase(n)
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fe.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_external_cost]',timeout=15000)
        q.click('[data-act=add_external_cost]'); q.wait_for_selector('#extkmo',timeout=15000)
        at=q.evaluate("()=>{const i=document.querySelector('#extkmo'); return [i.min, i.max, !!document.querySelector('label[for=extkmo]')]}")
        check(at[0]=='2000-01-01' and at[1]==today.isoformat() and at[2], f'{tag}: min/max/Beschriftung {at}')
        q.fill('#af [name=supplier]','Truck-Service Nord'); q.fill('#af [name=invoice_no]',f'R-1649-{n}'); q.fill('#af [name=amount_net]','100')
        q.fill('#extkmv','1000'); q.fill('#extkmo',old)
        q.click('#af button:not([type=button])')
        try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=8000); shown=True
        except Exception: shown=False
        check(shown, f'{tag}: Meldung übersetzt sichtbar')
        check(q.evaluate("()=>document.querySelector('#extkmo') && document.querySelector('#extkmo').getAttribute('aria-invalid')")=='true', f'{tag}: Feld markiert, Formular offen')
        check(not api('GET',f'/api/cases/{cid}')['d'].get('external_costs'), f'{tag}: nichts gebucht')
        q.evaluate("()=>document.querySelector('#extkmo').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fe_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
