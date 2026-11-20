# [CLAUDE] UI-Test (20.11.2026, Backlog 1640, Blickwinkel „Disposition hinterlegt einen Fahrzeughinweis am außer Betrieb genommenen Fahrzeug –
# Nachfolger mit gleichem Kennzeichen“): Fahrzeugakte des außer Betrieb genommenen Fahrzeugs zeigt im Bereich „Hinweise zum Fahrzeug“ den Hinweis
# (seit laut Protokoll) und den Link zum Fahrzeug in Betrieb mit demselben Kennzeichen; dieses zeigt keinen Hinweis (DE/UK/EN, 390/820/1366 px,
# ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Dieses Fahrzeug ist außer Betrieb','uk':'виведено з експлуатації','en':'This vehicle is out of service'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
OLD='WDB96340310164001'; NEW='WDB96340310164002'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':OLD,'plate':'EZ-SZ 1640','site':'Dortmund'}); check(v['s'] in (200,201),'Altfahrzeug '+str(v['s']))
    d=api('POST',f'/api/vehicles/VIN:{OLD}/active',{'active':False,'reason':'Verkauf (Test)'}); check(d['s']==200,'außer Betrieb '+str(d['s']))
    v=api('POST','/api/vehicles',{'vin':NEW,'plate':'EZ-SZ 1640','site':'Dortmund'}); check(v['s'] in (200,201),'Nachfolger '+str(v['s'])+' '+str(v['d'])[:200])
    n=api('POST',f'/api/vehicles/VIN:{OLD}/notes',{'text':'Bremse quietscht (Test)'}); check(n['s']==201 and n['d'].get('vehicle_inactive',{}).get('successor',{}).get('id')==f'VIN:{NEW}','Antwort nennt Nachfolger '+str(n['d'])[:200])
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/VIN:{OLD}'); q.reload()
        try: q.wait_for_selector('[data-vninact]',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('[data-vninact]');return e?e.innerText:''}")
        check(EXP[lang] in tx,f'{lang} {w}px Hinweis sichtbar')
        check('EZ-SZ 1640' in q.evaluate("()=>{const e=document.querySelector('[data-vnsucc] a');return e?e.innerText:''}"),f'{lang} {w}px Link zum Nachfolger')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('#vnotes').screenshot(path=f'{SHOTS}/hinweis_ab_{lang}_{w}.png')
        q.click('[data-vnsucc] a')
        try: q.wait_for_function(f"()=>location.hash.includes('{NEW}') && document.querySelector('#vnotes h3')",timeout=15000)
        except Exception: pass
        q.wait_for_timeout(300)
        check(NEW in q.evaluate('()=>location.hash') and q.evaluate("()=>!document.querySelector('[data-vninact]')"),f'{lang} {w}px Nachfolger-Akte ohne Hinweis')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
