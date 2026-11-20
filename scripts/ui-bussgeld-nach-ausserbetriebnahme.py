# [CLAUDE] UI-Test (20.11.2026, Backlog 1635, Blickwinkel „Leitung erfasst ein Schreiben, dessen Tatzeit nach der Außerbetriebnahme des
# zugeordneten Fahrzeugs liegt“): Bußgeld-Detail zeigt der Leitung den Hinweis „Tatzeit nach der Außerbetriebnahme“ mit Datum, Grund und
# Korrekturweg (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, urllib.request
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'nach der Außerbetriebnahme','uk':'пізніший за виведення','en':'after EZ-AB 1635 was taken out of service'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ab.inhaber','display_name':'AB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ab.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':'WDB96340310163501','plate':'EZ-AB 1635','site':'Dortmund'})
    check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    d=api('POST','/api/vehicles/VIN:WDB96340310163501/active',{'active':False,'reason':'verkauft an Händler (Test)'})
    check(d['s']==200,'außer Betrieb '+str(d['s'])+' '+str(d['d'])[:200])
    # Außerbetriebnahme 30 Tage zurückdatieren (nur Dev-Server)
    rq=urllib.request.Request(B+'/__dev/backdate?deact=VIN:WDB96340310163501&hours=720',method='POST'); urllib.request.urlopen(rq).read()
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund','reference':'AZ-AB-1635','offense_type':'geschwindigkeit','offense_at':(today-datetime.timedelta(days=5)).isoformat()+'T10:15','plate_in_letter':'EZ-AB 1635','amount_eur':30})
    check(f['s']==201 and f['d'].get('vehicle_matched'),'Bußgeld '+str(f['s'])+' '+str(f['d'])[:200]); FID=f['d']['id']
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ab.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/fines/'+FID); q.reload()
        try: q.wait_for_selector('#fafterdeact',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('#fafterdeact');return e?e.innerText:''}")
        check(EXP[lang] in tx and 'EZ-AB 1635' in tx and 'verkauft an Händler (Test)' in tx,f'{lang} {w}px Hinweis mit Grund sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('#fafterdeact').screenshot(path=f'{SHOTS}/bussgeld_nach_ab_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
