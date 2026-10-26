# [CLAUDE] UI-Test Blickwinkel „Lkw drei Wochen in der Herstellerwerkstatt“ (26.10.2026, Backlog 386–389): Freigabe an die externe Werkstatt
# meldet einen Hinweis statt der Warnung „Werkstatt ohne Benutzer“; Werkstattplan nennt den Standort des Fahrzeugs; Kostentabelle zeigt den
# Vermerk der Fremdleistung (0 € Garantie); Fremdleistungsformular erklärt 0 vs. leer. DE/UK/EN bei 390/820/1366 px, kein Querscrollen.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VL={'de':'Standort des Fahrzeugs','uk':'Де стоїть транспорт','en':None}
HINT={'de':'0 = laut Beleg kostenlos','uk':'0 = за документом безкоштовно','en':'0 = free of charge'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hw.inhaber','display_name':'HW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid='VIN:WMA06XZZ0HP108386'; api('POST','/api/vehicles',{'plate':'HW-EX 386','vin':'WMA06XZZ0HP108386','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'hw-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    d=lambda k: (datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Getriebe schaltet nicht in den 3. Gang','priority':'mittel','driveability':'nicht_fahrbereit','request_key':f'hw-{os.getpid()}'})
    check(r['s']==201,f'Meldung ({r["s"]})'); CID=r['d']['id']
    ap=cmd(CID,'approve_repair',{'workshop_site':'EXTERN'},'Garantiereparatur beim Hersteller')
    check(ap['s']==200 and ap['d'].get('external_workshop') and not ap['d'].get('no_workshop_user'),f'Freigabe extern ({ap["d"]})')
    check(cmd(CID,'acknowledge')['s']==200 and cmd(CID,'start_repair')['s']==200,'übernommen, in Reparatur')
    check(cmd(CID,'set_vehicle_location',{'vehicle_location':'MAN Truck & Bus Hamm'})['s']==200,'Standort')
    check(cmd(CID,'set_planned_date',{'planned_date':d(2)})['s']==200,'Termin')
    check(cmd(CID,'add_external_cost',{'supplier':'MAN Hamm','invoice_no':'G-386','amount_net':0},'Garantie laut Werkstatt')['s']==200,'Fremdleistung 0 €')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'hw.inhaber','password':PW}])
        q.goto(B+'/#/plan'); q.wait_for_selector('[data-vloc]', timeout=15000)
        vl=q.inner_text('[data-vloc]').strip()
        check('MAN Truck & Bus Hamm' in vl and (VL[lang] is None or VL[lang] in vl),f'{lang} {w}px: Werkstattplan mit Standort ({vl!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Plan ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/hw_plan_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('[data-extnote]', timeout=15000)
        check('Garantie laut Werkstatt' in q.inner_text('[data-extnote]'),f'{lang} {w}px: Vermerk an der Fremdleistung')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/hw_case_{lang}_{w}.png',full_page=True)
        if w==390:
            btn=q.locator('button[data-act="add_external_cost"]')
            if btn.count():
                btn.first.click(); q.wait_for_selector('input[name="amount_net"]', timeout=10000)
                lab=q.locator('input[name="amount_net"]').evaluate("t=>t.previousElementSibling ? t.previousElementSibling.innerText : ''")
                check(HINT[lang] in lab,f'{lang}: Hinweis 0/leer am Betrag ({lab!r})')
                if SHOTS: q.screenshot(path=f'{SHOTS}/hw_form_{lang}.png',full_page=True)
            else: check(False,f'{lang}: Knopf „Fremdleistung“ gefunden')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
