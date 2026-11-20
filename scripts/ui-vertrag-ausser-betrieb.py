# [CLAUDE] UI-Test (20.11.2026, Backlog 1638, Blickwinkel „Leitung erfasst einen Vertrag am falschen Fahrzeug – Nachfolger mit gleichem
# Kennzeichen“): Fahrzeugakte zeigt der Leitung am Vertrag den Hinweis „Vertragsbeginn nach der Außerbetriebnahme“ mit Datum, Grund und
# Korrekturweg (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, urllib.request
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'nach der Außerbetriebnahme dieses Fahrzeugs','uk':'пізніший за виведення цього транспортного засобу','en':'after this vehicle was taken out of service'}
FIX={'de':'Vertrag beenden','uk':'Завершити договір','en':'End contract'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
VIN='WDB96340310163801'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'EZ-SZ 1638','site':'Dortmund'})
    check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    d=api('POST',f'/api/vehicles/VIN:{VIN}/active',{'active':False,'reason':'Leasingrückgabe (Test)'})
    check(d['s']==200,'außer Betrieb '+str(d['s'])+' '+str(d['d'])[:200])
    rq=urllib.request.Request(B+f'/__dev/backdate?deact=VIN:{VIN}&hours=720',method='POST'); urllib.request.urlopen(rq).read()
    c=api('POST',f'/api/vehicles/VIN:{VIN}/contracts',{'kind':'leasing','partner':'Neu-Leasing (Test)','start_date':(today-datetime.timedelta(days=5)).isoformat(),'end_date':(today+datetime.timedelta(days=700)).isoformat(),'evidence':'Vertrag (Test)'})
    check(c['s']==201,'Vertrag '+str(c['s'])+' '+str(c['d'])[:200])
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/VIN:{VIN}'); q.reload()
        try: q.wait_for_selector('[data-ctvehdates]',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('[data-ctvehdates]');return e?e.innerText:''}")
        check(EXP[lang] in tx and 'Leasingrückgabe (Test)' in tx and FIX[lang] in tx,f'{lang} {w}px Hinweis mit Grund und Korrekturweg sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('[data-ctvehdates]').locator('xpath=..').screenshot(path=f'{SHOTS}/vertrag_ab_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
