# [CLAUDE] UI-Test (25.10.2026, Backlog 260): Leitung wandelt eine sicherheitsrelevante Restarbeit der Werkstatt per „Als Folgeauftrag“
# in einen Vorgang um (Dringlichkeit vorbelegt „kritisch“) → App öffnet den Folgeauftrag; Ursprung zeigt „Folgeauftrag <Nr.>“ an der
# Restarbeit; Restarbeit zeigt die angehängte Datei (Backlog 261). DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN={'de':'Als Folgeauftrag','uk':'Як подальше замовлення','en':'As follow-up order'}
REF={'de':'Folgeauftrag','uk':'Подальше замовлення','en':'Follow-up order'}
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
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        va=f'WDB9634031S{pid%10000:04d}{n:02d}'[:17].ljust(17,'0')
        check(api('POST','/api/vehicles',{'vin':va,'plate':f'RF-AB {n}3','site':'Dortmund'})['s']==201,'Fahrzeug')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':'Bremse zieht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        cmd=lambda action,pl={},note=None: api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':str(uuid.uuid4()),'expected_version':api('GET',f'/api/cases/{cid}')['d']['case']['version'],'payload':pl,**({'note':note} if note else {})})
        check(cmd('approve_repair',{'workshop_site':ws},'frei')['s']==200,'Freigabe')
        # Backlog 261: Foto/PDF zur Restarbeit (Datei des Vorgangs)
        fid=a.evaluate("""async (cid) => { const b = new Uint8Array([37,80,68,70,45,49,46,52,10, ...Array.from({length:300},(_, i)=>i%256)]);
          const r = await fetch(`/api/cases/${cid}/files`, { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-filename': 'bremsleitung.pdf', 'x-cfp': '1' }, body: b }); return (await r.json()).id; }""",cid)
        check(cmd('add_open_item',{'description':'Bremsleitung porös (Test)','safety_relevant':True,'file_id':fid})['s']==200,'Restarbeit mit Datei')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rf.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-oifu]',timeout=15000)
        check(q.inner_text('[data-oifu]').strip()==BTN[lang],f'{lang} {wd}px: Knopf')
        check(q.locator('[data-oifile] a').count()==1 and 'bremsleitung.pdf' in q.inner_text('[data-oifile]'),f'{lang} {wd}px: Datei an der Restarbeit')
        q.click('[data-oifu]'); q.wait_for_selector('#oiff',timeout=5000)
        check(q.input_value('#oifp')=='kritisch',f'{lang} {wd}px: Dringlichkeit vorbelegt kritisch')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Formular ohne Querscrollen')
        if SHOTS: q.locator('#oiff').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/restarbeit-folgeauftrag-form-{lang}-{wd}.png')
        q.fill('#oifn','nach Teilelieferung'); q.click('#oiff button:not([type=button])')
        q.wait_for_function("(c)=>!location.hash.includes(c) && location.hash.startsWith('#/cases/')",arg=cid,timeout=15000)
        nid=q.evaluate("()=>decodeURIComponent(location.hash.slice(8))")
        d=api('GET',f'/api/cases/{nid}')['d']
        check(d['case']['parent_case_id']==cid and d['case']['safety_lock'],f'{lang} {wd}px: Folgeauftrag mit Bezug, gesperrt')
        q.goto(B+f'/#/cases/{cid}')
        try: q.wait_for_function("(c)=>document.querySelector('main') && document.querySelector('main').innerText.includes(c)",arg=REF[lang]+' '+d['case']['case_no'],timeout=15000); okr=True
        except Exception: okr=False
        check(okr,f'{lang} {wd}px: Restarbeit nennt den Folgeauftrag')
        check(q.locator('[data-oifu]').count()==0,f'{lang} {wd}px: kein Knopf mehr')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/restarbeit-folgeauftrag-ursprung-{lang}-{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
