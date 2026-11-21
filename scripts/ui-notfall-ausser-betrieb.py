# [CLAUDE] UI-Test (21.11.2026, Backlog 1642, Blickwinkel „Leitung gibt einen Mietlkw zurück – die Pannen-Hotline des Vermieters bleibt hinterlegt“):
# „Außer Betrieb nehmen“ in der Fahrzeugakte nennt im Hinweis die fahrzeugbezogene Nummer aus „Panne & Notfall“ (DE/UK/EN, 390/820/1366 px,
# ohne Querscrollen/Skriptfehler); die Nummer bleibt in der Verwaltung stehen. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'1 fahrzeugbezogene Nummer in „Panne & Notfall“','uk':'1 номер для цього авто','en':'1 vehicle-specific number in “Breakdown & emergency”'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
VIN='WDB96340310164201'; VID=f'VIN:{VIN}'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'EZ-SZ 1642','site':'Dortmund'}); check(v['s'] in (200,201),'Mietfahrzeug '+str(v['s']))
    c=api('POST','/api/emergency/contacts',{'kind':'panne','label':'Vermieter-Hotline (Test)','phone':'0800 164 2000','scope':'vehicle','vehicle_id':VID}); check(c['s']==201,'Nummer am Fahrzeug '+str(c['s'])+' '+str(c['d'])[:200])
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        api('POST',f'/api/vehicles/{VID}/active',{'active':True})
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Mietfahrzeug zurückgegeben (Test)') if d.type=='prompt' else d.accept())
        q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{VID}'); q.reload()
        q.wait_for_selector('#deact',state='attached',timeout=15000); q.eval_on_selector('#deact','b=>b.click()')
        try: q.wait_for_function(f"()=>[...document.querySelectorAll('.toast')].some(t=>t.innerText.includes({EXP[lang]!r}))",timeout=10000); ok=True
        except Exception: ok=False
        check(ok,f'{lang} {w}px Hinweis auf die Nummer in „Panne & Notfall“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/notfall_ab_{lang}_{w}.png')
        r=q.evaluate(JS,['GET','/api/emergency/contacts',None]); row=[x for x in (r['d'] or {}).get('contacts',[]) if x.get('vehicle_id')==VID]
        check(len(row)==1 and row[0].get('vehicle_active') is False,f'{lang} {w}px Nummer bleibt, als außer Betrieb gekennzeichnet')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
