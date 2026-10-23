# [CLAUDE] UI-Test Backlog 204 (23.10.2026, Teilagent „Wiederinbetriebnahme nach Standzeit“): Leitung nimmt ein ruhendes Fahrzeug wieder in die
# Auswertungen bzw. ein außer Betrieb genommenes wieder in Betrieb – Hinweis „Vor der ersten Fahrt klären“ nennt überfällige Prüftermine,
# ungeklärte HU/SP, abgelaufene Verträge und den km-Stand (statt nur „✓“). DE 1366, UK 820, EN 390.
# Dev-Server: CFP_URL (Standard Port 8787), frischer Server nötig. Screenshots: CFP_SHOTS.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
HEAD={'de':'Vor der ersten Fahrt klären','uk':'Перед першою поїздкою','en':'Clarify before the first trip'}
OVER={'de':'1 Prüftermin überfällig','uk':'1 перевірка прострочена','en':'1 inspection overdue'}
CON={'de':'1 Vertrag abgelaufen','uk':'1 договір прострочено','en':'1 contract expired'}
d=lambda n:(datetime.date.today()+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,path,b=None: a.evaluate(JS,[m,path,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wi.inhaber','display_name':'WI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wi.inhaber','password':PW})['s']==200,'Inhaber angemeldet')
    envname=api('GET','/api/me')['d']['active_environment']
    r=api('POST','/api/users',{'username':'wi.leitung','display_name':'WI Leitung','role':'fleet','environment':envname})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}]); c0.close()
    for i,(lang,w,h,mode) in enumerate([('de',1366,900,'eval'),('uk',820,1180,'active'),('en',390,844,'eval')]):
        V=f'VIN:WDB9634031088100{i}'
        check(api('POST','/api/vehicles',{'plate':f'WI-B {i+1}','vin':V[4:],'site':'Dortmund'})['s']==201,f'{lang}: Fahrzeug')
        api('POST',f'/api/vehicles/{V}/maintenance',{'kind':'UVV','last_done_date':d(-500),'interval_months':12,'evidence':'UI-Test UVV'})
        api('POST',f'/api/vehicles/{V}/contracts',{'kind':'leasing','partner':'UI-Test Leasing','evidence':'UI-Test','start_date':d(-700),'end_date':d(-30)})
        if mode=='eval': check(api('POST',f'/api/vehicles/{V}/evaluation',{'excluded':True,'reason':'Standzeit UI-Test'})['s']==200,f'{lang}: ruhend')
        else: check(api('POST',f'/api/vehicles/{V}/active',{'active':False,'reason':'abgestellt UI-Test'})['s']==200,f'{lang}: außer Betrieb')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':'wi.leitung','password':PW}])['s']==200,f'{lang}: Leitung angemeldet')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+f'/#/vehicles/{V}'); q.wait_for_timeout(1500)
        btn='#evx' if mode=='eval' else '#react'
        if not q.is_visible(btn):
            q.evaluate(f"() => {{ const b = document.querySelector('{btn}'); if (b) {{ let e = b; while ((e = e.parentElement)) if (e.tagName === 'DETAILS') e.open = true; }} }}")
        q.click(btn); q.wait_for_timeout(1200)
        txt=q.evaluate("() => [...document.querySelectorAll('.toast')].map((x) => x.textContent).join(' | ')")
        check(HEAD[lang] in txt and OVER[lang] in txt and CON[lang] in txt,f'{lang}: Hinweis nennt überfällige Prüfung und Vertrag – {txt[:200]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wiederinbetriebnahme_{lang}_{w}.png')
        check(not errs,f'{lang}: keine Skriptfehler {errs}'); ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
exit(1 if fails else 0)
