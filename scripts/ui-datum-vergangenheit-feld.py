# [CLAUDE] UI-Test (21.11.2026, Backlog 1659, Backlog 1501 Nachlese): Wiedervorlage und „voraussichtlich fertig“ mit einem Tag in der
# Vergangenheit (Formular über Mitternacht offen / Browser ohne Datumsgrenze) – Server antwortet mit eigenem Code (followup_past/ready_past)
# und field_key; die Oberfläche markiert jetzt das Feld (vorher nur Toast). DE/UK/EN, 390/820/1366 px. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dv.inhaber','display_name':'DV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    VIN='WDB96340310165901'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'DV-AB 1659','vin':VIN,'site':'Dortmund','kind':'lkw'})
    y=(datetime.date.today()-datetime.timedelta(days=1)).isoformat()
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'DV {n} Bremse quietscht','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'dv-{os.getpid()}-{n}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'dva-{os.getpid()}-{n}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dv.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for act,fid in [('set_followup','fuon')]:  # „voraussichtlich fertig“ prüft Test „Backlog 1659“ (Server), Markierung ist derselbe Weg
            q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector(f'[data-act={act}]',timeout=15000)
            q.click(f'[data-act={act}]'); q.wait_for_selector('#'+fid,timeout=15000)
            q.evaluate("()=>{document.getElementById('af').noValidate=true}"); q.fill('#'+fid,y)  # Browser ohne Datumsprüfung
            q.click('#af button:not([type=button])')
            try: q.wait_for_function("(f)=>document.getElementById(f) && document.getElementById(f).getAttribute('aria-invalid')==='true'", arg=fid, timeout=8000); mk=True
            except Exception: mk=False
            check(mk, f'{tag} {act}: Feld markiert, Formular offen')
            txt=q.evaluate("(f)=>{const i=document.getElementById(f); return (i.getAttribute('aria-describedby')||'').split(' ').map((x)=>document.getElementById(x)).filter(Boolean).map((e)=>e.innerText).join(' ')}", fid)
            check(bool(txt.strip()) and (('Vergangenheit' in txt) == (lang=='de')), f'{tag} {act}: Meldung übersetzt „{txt[:60]}“')
            q.evaluate("(f)=>document.getElementById(f).scrollIntoView({block:'center'})", fid)
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {act}: kein Querscrollen')
            if SHOTS: q.screenshot(path=f'{SHOTS}/dv_{act}_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
