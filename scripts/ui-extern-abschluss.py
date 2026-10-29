# [CLAUDE] UI-Test (30.10.2026, Backlog 629, Teilagent-Fund „Panne in Frankreich, externe Werkstatt“):
# Vorgang bei der Werkstatt „EXTERN“ (kein Werkstattkonto) in Reparatur → Leitung sieht zusätzlich „Abschlusskontrolle + Freigabe“;
# Formular mit Erklärung, Abholvermerk aus dem eingetragenen Standort vorbelegt, Fahreroption und Bestätigung → ein Absenden führt
# beide Befehle aus (Verlauf: zwei Einträge mit demselben Vermerk), Status „freigegeben“. Werkstattvorgang (DORTMUND) ohne den Knopf.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN={'de':'Abschlusskontrolle + Freigabe','uk':'Фінальний контроль + допуск','en':'Final inspection + release'}
LOC='Garage Dupont, Beaune (FR)'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ex.inhaber','display_name':'EX Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ex.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'ex-{action}-{R}-{n}-{time.time()}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)['s']
    def mkcase(site):
        global n
        n+=1; pl=f'EX-T {R%900}{n}'; vin=f'WDB98{R:05d}E{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Getriebe defekt (Test extern)','priority':'mittel','driveability':'nicht_fahrbereit','request_key':f'ex-{R}-{n}'})
        check(c['s']==201,f'Vorgang angelegt {c["s"]}'); cid=c['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':site},'Panne Frankreich')==200,'freigegeben an '+site)
        check(cmd(cid,'start_repair')==200,'Reparatur begonnen')
        return cid
    first=True
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        cid=mkcase('EXTERN')
        check(cmd(cid,'add_external_cost',{'supplier':'Garage Dupont','invoice_no':f'FA-{R}-{n}','amount_net':'900'})==200,'Fremdleistung')
        check(api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'ex-i-{R}-{n}','items':items})['s']==201,'Kontrolle nach Reparatur')
        check(cmd(cid,'set_vehicle_location',{'vehicle_location':LOC})==200,'Standort eingetragen')
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        if first:
            other=mkcase('DORTMUND')
            m.goto(B+'/#/cases/'+other); m.reload(); m.wait_for_selector('button[data-act="request_quality_check"]',timeout=15000)
            check(m.locator('button[data-act="quality_release"]').count()==0,'Werkstatt mit Konto: kein kombinierter Knopf')
            first=False
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('button[data-act="quality_release"]',timeout=15000)
        bt=m.locator('button[data-act="quality_release"]')
        check(BTN[lang] in bt.inner_text() and m.locator('button[data-act="request_quality_check"]').count()==1,f'{lang} {w}px: Knopf „{BTN[lang]}“ neben „Zur Abschlusskontrolle“')
        bt.click(); m.wait_for_selector('#qrelhint',timeout=5000)
        check(m.input_value('#pu_note')==LOC and m.locator('#qrelpu').is_visible(),f'{lang} {w}px: Abholvermerk mit Standort vorbelegt + Hinweis')
        check(m.locator('#pu_drv').count()==1 and m.locator('#af input[name=confirm]').count()==1,f'{lang} {w}px: Fahreroption und Bestätigung')
        check('{a}' not in m.inner_text('#qrelhint') and '{b}' not in m.inner_text('#qrelhint'),f'{lang} {w}px: Erklärung ohne Platzhalter')
        m.check('#af input[name=confirm]'); m.fill('#af textarea[name=note]','Getriebe getauscht, Probefahrt in Ordnung')
        check(m.evaluate(noscroll),f'{lang} {w}px: Formular ohne Querscrollen')
        if SHOTS: m.locator('#qrelhint').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/extern_abschluss_{lang}_{w}.png')
        m.click('#af button.btn:not(.secondary)')
        st=''
        for _ in range(60):
            st=api('GET',f'/api/cases/{cid}')['d']['case']['status']
            if st=='fahrzeug_freigegeben': break
            time.sleep(0.25)
        check(st=='fahrzeug_freigegeben',f'{lang} {w}px: ein Absenden → freigegeben ({st})')
        ev=[e for e in api('GET',f'/api/cases/{cid}')['d']['events'] if e['action'] in ('request_quality_check','technical_release')]
        check(len(ev)==2 and all(e['note']=='Getriebe getauscht, Probefahrt in Ordnung' for e in ev),f'{lang} {w}px: zwei Verlaufseinträge mit demselben Vermerk')
        m.wait_for_selector('#pickup',timeout=15000); time.sleep(0.5)
        check(m.locator('button[data-act="quality_release"]').count()==0 and LOC in m.inner_text('#pickup'),f'{lang} {w}px: Ansicht neu geladen, Abholvermerk sichtbar')
        check(m.evaluate(noscroll),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: m.screenshot(path=f'{SHOTS}/extern_abschluss_fertig_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
