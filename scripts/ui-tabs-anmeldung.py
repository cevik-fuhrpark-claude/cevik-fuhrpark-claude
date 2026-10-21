# [CLAUDE] UI-Test zwei Tabs (21.10.2026): (1) Abmelden in Tab A → Tab B zeigt nicht weiter die Ansicht der vorherigen Person (lädt neu, Anmeldeseite);
# meldet sich in Tab A eine andere Person an, zeigt Tab B deren Ansicht (kein Inhaber-Menü/Benutzerliste mehr). (2) Anmeldung abgelaufen (401)
# beim Senden einer Meldung → Meldung im Postausgang der erfassenden Person, nach erneuter Anmeldung gesendet. DE 390, UK 820, EN 1366.
# Dev-Server: CFP_URL (Standard Port 8787), frischer Server nötig. Screenshots: CFP_SHOTS.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LOC={'de':'de-DE','uk':'uk-UA','en':'en-GB'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def login_ui(pg,u):
    pg.goto(B+'/#/login'); pg.wait_for_selector('#u'); pg.fill('#u',u); pg.fill('#p',PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,path,b=None: a.evaluate(JS,[m,path,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tb.inhaber','display_name':'TB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'tb.inhaber','password':PW}); envname=api('GET','/api/me')['d']['active_environment']
    api('POST','/api/vehicles',{'plate':'TB-1','vin':'WDB96340310663001','site':'Dortmund'}); vid='VIN:WDB96340310663001'
    for lang in ['de','uk','en']:
        u='tb.fahrer.'+lang
        r=api('POST','/api/users',{'username':u,'display_name':'TB Fahrer '+lang,'role':'driver','environment':envname,'language':lang})
        c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}]); c0.close()
        api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':r['d'].get('id') or r['d']['user']['id']})
    for lang,w,h in [('de',390,844),('uk',820,1180),('en',1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang]); A=ctx.new_page(); Bt=ctx.new_page(); errs=[]
        for pg in (A,Bt): pg.on('pageerror',lambda e: errs.append(str(e)))
        login_ui(A,'tb.inhaber'); Bt.goto(B+'/#/users'); Bt.wait_for_timeout(1500)
        check(Bt.locator('text=tb.fahrer.de').count()>0,f'{lang} {w}: Tab B zeigt Benutzerliste des Inhabers')
        A.goto(B+'/#/more'); A.wait_for_selector('#lo'); A.click('#lo'); A.wait_for_timeout(2000)
        check(Bt.evaluate('location.hash')=='#/login' and Bt.locator('text=tb.fahrer.de').count()==0,f'{lang} {w}: nach Abmelden in Tab A zeigt Tab B die Anmeldeseite ({Bt.evaluate("location.hash")})')
        login_ui(A,'tb.fahrer.'+lang); Bt.wait_for_timeout(2500)
        Bt.goto(B+'/#/users'); Bt.wait_for_timeout(1500)
        check(Bt.locator('text=tb.fahrer.de').count()==0 and Bt.evaluate("!!document.querySelector('#app')") ,f'{lang} {w}: Tab B nach Anmeldung des Fahrers ohne Benutzerliste')
        # (2) Anmeldung abgelaufen beim Senden
        A.goto(B+'/#/new'); A.wait_for_selector('#d'); A.locator(f'input[name=veh][value="{vid}"]').check(force=True); A.fill('#d',f'Tür klemmt ({lang} Sitzungstest)')
        ctx.clear_cookies(); A.click('#sb'); A.wait_for_timeout(1500)
        ob=A.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v))")
        check(len(ob)==1 and 'Sitzungstest' in ob[0]['body']['description'],f'{lang} {w}: Meldung bei 401 im Postausgang gesichert')
        if SHOTS: A.screenshot(path=f'{SHOTS}/tabs_{lang}_{w}.png')
        login_ui(A,'tb.fahrer.'+lang); A.wait_for_timeout(2500)
        api('POST','/api/login',{'username':'tb.inhaber','password':PW})
        n=[c for c in api('GET','/api/cases?f=all')['d']['cases'] if f'({lang} Sitzungstest)' in c['description']]
        ob=A.evaluate("Object.entries(localStorage).filter(([k])=>k.startsWith('cfp_outbox_')).flatMap(([k,v])=>JSON.parse(v))")
        check(len(n)==1 and not ob,f'{lang} {w}: nach erneuter Anmeldung gesendet (Vorgänge {len(n)}, Postausgang {len(ob)})')
        check(A.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'{lang} {w}: kein waagerechtes Scrollen')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('Zwei Tabs/Anmeldung: '+('alles grün' if not fails else 'FEHLER: '+' | '.join(fails)))
raise SystemExit(1 if fails else 0)
