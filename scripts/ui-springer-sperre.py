# [CLAUDE] UI-Test (23.10.2026, Teilagenten „Springer“ / „Fahrerkarten-Auslesung“): Abfahrtskontrolle zeigt bei einem gesperrten Fahrzeug
# „gesperrt – nicht fahren“ (auch wenn der Fahrer dem Lkw nicht zugeordnet ist) und markiert es in der Auswahl; Startseite der Leitung
# verlinkt „Auslesungen“ (#todotacho). DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LOCK={'de':'gesperrt','uk':'заблоковано','en':'locked'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sp.inhaber','display_name':'SP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']
    u=api('POST','/api/users',{'username':'sp.fahrer','display_name':'SP Springer','role':'driver','environment':env})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    api('POST','/api/vehicles',{'vin':'WDB9634031L400001','plate':'SP-GE 1','site':'Dortmund'})
    api('POST','/api/vehicles',{'vin':'WDB9634031L400002','plate':'SP-OK 2','site':'Dortmund'})
    VL='VIN:WDB9634031L400001'
    c=api('POST','/api/cases',{'vehicle_id':VL,'description':'Bremse zieht stark (Test)','priority':'kritisch','driveability':'nicht_fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    check(c['s'] in (200,201),f"Vorgang kritisch angelegt ({c['s']})")
    d=api('POST','/api/drivers',{'display_name':'SP Auslesung','personnel_no':'SP-1'})
    ago=(datetime.date.today()-datetime.timedelta(days=35)).isoformat()
    t=api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':d['d']['id'],'downloaded_on':ago,'evidence':'Test'})
    check(t['s']==201,'Auslesung erfasst')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sp.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#v',timeout=15000)
        opt=q.evaluate("(id)=>document.querySelector(`#v option[value='${id}']`).textContent",VL)
        check(LOCK[lang] in opt.lower(),f'{lang} {wd}px: Auswahl markiert Sperre ({opt})')
        q.select_option('#v',VL); q.wait_for_timeout(500)
        box=q.inner_text('#known')
        check(q.locator('#known [role=alert]').count()>=1 and len(box)>10,f'{lang} {wd}px: Hinweis „gesperrt – nicht fahren“ ({box[:60]})')
        q.select_option('#v','VIN:WDB9634031L400002'); q.wait_for_timeout(300)
        check(q.locator('#known [role=alert]').count()==0,f'{lang} {wd}px: kein Hinweis beim freien Fahrzeug')
        q.select_option('#v',VL); q.wait_for_timeout(300)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/springer_{lang}_{wd}.png')
        o=br.new_context(viewport={'width':wd,'height':h}); r=o.new_page(); r.on('pageerror',lambda e: errs.append(str(e)))
        r.goto(B); r.evaluate(JS,['POST','/api/login',{'username':'sp.inhaber','password':PW}]); r.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        r.goto(B+'/#/'); r.reload(); r.wait_for_selector('#todotacho',state='attached',timeout=15000)
        r.evaluate("()=>{const e=document.querySelector('#todotacho'); e.closest('details').open=true}")
        r.click('#todotacho'); r.wait_for_timeout(1200)
        check(r.url.endswith('#/tacho') and 'SP Auslesung' in r.inner_text('main'),f'{lang} {wd}px: Startseite → Auslesungen ({r.url[-12:]})')
        if SHOTS: r.screenshot(path=f'{SHOTS}/tacho_{lang}_{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        o.close(); ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
