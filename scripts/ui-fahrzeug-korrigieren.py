# [CLAUDE] UI-Test (25.10.2026, Backlog 254, Blickwinkel „Meldung am falschen Fahrzeug“): Leitung öffnet eine gesperrte Meldung, wählt
# „Fahrzeug korrigieren“, sucht das richtige Fahrzeug aus der nachgeladenen Liste aus und speichert mit Grund → Vorgang zeigt das neue
# Kennzeichen, der Verlauf „alt → neu“. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ACT={'de':'Fahrzeug korrigieren','uk':'Виправити транспорт','en':'Correct vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        va=f'WDB9634031K{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); vb=f'WDB9634031M{pid%10000:04d}{n:02d}'[:17].ljust(17,'0')
        pa=f'FK-AA {n}1'; pb=f'FK-AA {n}7'
        check(api('POST','/api/vehicles',{'vin':va,'plate':pa,'site':'Dortmund'})['s']==201 and api('POST','/api/vehicles',{'vin':vb,'plate':pb,'site':'Dortmund'})['s']==201,'Fahrzeuge')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':'Bremse zieht stark (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'set_safety_lock','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{},'note':'Bremse prüfen'})['s']==200,'Sperre')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=correct_vehicle]',timeout=15000)
        check(q.inner_text('[data-act=correct_vehicle]').strip()==ACT[lang],f'{lang} {wd}px: Knopf')
        q.click('[data-act=correct_vehicle]'); q.wait_for_selector(f'#cvveh option[value="VIN:{vb}"]',state='attached',timeout=15000)
        check(q.locator(f'#cvveh option[value="VIN:{va}"]').count()==0,f'{lang} {wd}px: bisheriges Fahrzeug nicht in der Auswahl')
        check(len(q.inner_text('#cvhint'))>40,f'{lang} {wd}px: Hinweis mit Sperre')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Formular ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrzeug-korrigieren-form-{lang}-{wd}.png')
        q.select_option('#cvveh','VIN:'+vb); q.fill('#af textarea[name=note]','Kennzeichen verwechselt'); q.click('#af button:not([type=button])')
        q.wait_for_function("(p)=>document.querySelector('main') && document.querySelector('main').innerText.includes(p) && !document.querySelector('#af')",arg=pb,timeout=15000)
        tl=q.inner_text('.timeline')
        check(pa in tl and pb in tl and ACT[lang] in tl,f'{lang} {wd}px: Verlauf alt → neu')
        d=api('GET',f'/api/cases/{cid}')['d']
        check(d['case']['vehicle_id']=='VIN:'+vb and d['case']['safety_lock'],f'{lang} {wd}px: Vorgang am neuen Fahrzeug, weiter gesperrt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('.timeline').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrzeug-korrigieren-verlauf-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
