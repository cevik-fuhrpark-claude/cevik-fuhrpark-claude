# [CLAUDE] UI-Test (20.11.2026, Backlog 1636, Blickwinkel „Fahrer erfasst einen Kilometerstand an einem außer Betrieb genommenen Fahrzeug“):
# Fahrzeugakte eines außer Betrieb genommenen Fahrzeugs zeigt „Kilometerstand erfassen“ nur Inhaber/Leitung, nicht der Werkstatt; Server lehnt
# den km-Stand der Werkstatt ab (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Fahrzeug ist außer Betrieb.','uk':'Транспорт виведено з експлуатації.','en':'The vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'km.inhaber','display_name':'KM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'km.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    VIN='WDB96340310163601'; VID='VIN%3A'+VIN
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'KM-AB 1636','site':'Dortmund'}); check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    check(api('POST','/api/vehicles/VIN:'+VIN+'/active',{'active':False,'reason':'verkauft (Test)'})['s']==200,'außer Betrieb')
    R=os.getpid()%100000
    u=api('POST','/api/users',{'username':f'km.ws{R}','display_name':'KM Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    check(u['s'] in (200,201),'Werkstatt angelegt '+str(u['s']))
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        for who,un in [('Werkstatt',f'km.ws{R}'),('Inhaber','km.inhaber')]:
          ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
          errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
          if who=='Werkstatt' and u['d'].get('invite_token'): q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); u['d']['invite_token']=None
          q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
          q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
          q.goto(B+'/#/vehicles/'+VID); q.reload()
          try: q.wait_for_selector('h1',timeout=15000); q.wait_for_function("()=>document.body.innerText.includes('KM-AB 1636')",timeout=15000)
          except Exception: pass
          has=q.evaluate("()=>!!document.querySelector('#kf')")
          check(has==(who=='Inhaber'),f'{lang} {w}px {who}: km-Formular {"sichtbar" if who=="Inhaber" else "ausgeblendet"}')
          if who=='Werkstatt' and lang=='de' and w==390:
            r=q.evaluate(JS,['POST','/api/vehicles/VIN:'+VIN+'/odometer',{'km':100000}]); check(r['s']==400 and r['d']['message']=='Fahrzeug ist außer Betrieb.','Werkstatt: Server lehnt ab '+str(r))
          check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px {who}: kein Querscrollen')
          if SHOTS: q.screenshot(path=f'{SHOTS}/km_ab_{who}_{lang}_{w}.png')
          check(not errs,f'{lang} {w}px {who}: keine Skriptfehler {errs}')
          ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
