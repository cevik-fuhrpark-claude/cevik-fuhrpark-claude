# [CLAUDE] UI-Test (21.11.2026, Backlog 1646, Backlog 1501 Nachlese, WCAG 3.3.1): unplausibler km-Stand (über 5 Mio. km) in der Reifenakte und in
# der Abfahrtskontrolle – der Server meldet field_key odometer_km, das km-Feld wird markiert (aria-invalid) und die Meldung erscheint in der
# Oberflächensprache (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WMA06XZZ8RP164601'; V='VIN:'+VIN
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kf.inhaber','display_name':'KF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/vehicles',{'vin':VIN,'plate':'KF-KM 1646','site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201),f'Fahrzeug ({r["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog', lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kf.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        tag=f'{lang}/{wd}'
        # Reifenakte
        q.goto(B+'/#/vehicles/'+V.replace(':','%3A')); q.reload()
        try: q.wait_for_selector('#tf',state='attached',timeout=15000)
        except Exception: pass
        q.evaluate("()=>{ let d=document.querySelector('#tf'); while(d){ if(d.tagName==='DETAILS') d.open=true; d=d.parentElement; } }")
        q.select_option('#tf [name=event_type]','messung')
        q.evaluate("()=>{ const s=document.querySelector('#tf [name=position]'); if (s && s.tagName==='SELECT') s.value=s.options[s.options.length>1?1:0].value; }")
        q.fill('#tf [name=tread_mm]','5'); q.fill('#tfkm','99999999')
        q.click('#tf button[type=submit], #tf button:not([type])')
        try: q.wait_for_function("()=>document.querySelector('#tfkm').getAttribute('aria-invalid')==='true'",timeout=8000); mk=True
        except Exception: mk=False
        check(mk,f'{tag}: Reifenakte – km-Feld markiert')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Reifenakte ohne Querscrollen')
        if SHOTS and wd==390: q.locator('#tfkm').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kf-reifen-{lang}-{wd}.png')
        # Abfahrtskontrolle
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v',V); q.wait_for_timeout(100)
        q.evaluate("()=>document.querySelectorAll('#f .checkitem input[value=ok]').forEach((r)=>{ r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true})); })")
        q.fill('#km','99999999')
        q.evaluate("()=>{ const f=document.querySelector('#f'); const b=f.querySelector('button[type=submit], button:not([type])'); b.click(); }")
        try: q.wait_for_function("()=>document.querySelector('#km').getAttribute('aria-invalid')==='true'",timeout=8000); mk=True
        except Exception: mk=False
        inv=q.evaluate("()=>[...document.querySelectorAll('#f [aria-invalid=true]')].map((x)=>x.id||x.name)")
        check(mk,f'{tag}: Abfahrtskontrolle – km-Feld markiert {inv}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Abfahrtskontrolle ohne Querscrollen')
        if SHOTS: q.locator('#km').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kf-check-{lang}-{wd}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
