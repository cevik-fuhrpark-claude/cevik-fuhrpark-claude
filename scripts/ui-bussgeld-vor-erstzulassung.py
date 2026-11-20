# [CLAUDE] UI-Test (20.11.2026, Backlog 1634, Blickwinkel „Leitung erfasst ein Schreiben, dessen Tatzeit vor der Erstzulassung des
# zugeordneten Fahrzeugs liegt“): Bußgeld-Detail zeigt der Leitung den Hinweis „Tatzeit vor der Erstzulassung“ mit Korrekturweg
# (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'vor der Erstzulassung','uk':'раніший за першу реєстрацію','en':'before the first registration'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ez.inhaber','display_name':'EZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ez.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':'WDB96340310163401','plate':'EZ-LK 1634','site':'Dortmund'})
    check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    sp=api('POST','/api/vehicles/VIN:WDB96340310163401/spec',{'first_registration':(today-datetime.timedelta(days=10)).isoformat(),'spec_source':'Zulassungsbescheinigung Teil I (Test)'})
    check(sp['s']==200,'Erstzulassung '+str(sp['s'])+' '+str(sp['d'])[:200])
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund','reference':'AZ-EZ-1634','offense_type':'geschwindigkeit','offense_at':(today-datetime.timedelta(days=40)).isoformat()+'T10:15','plate_in_letter':'EZ-LK 1634','amount_eur':30})
    check(f['s']==201,'Bußgeld '+str(f['s'])+' '+str(f['d'])[:200]); FID=f['d']['id']
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ez.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/fines/'+FID); q.reload()
        try: q.wait_for_selector('#fbeforeez',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('#fbeforeez');return e?e.innerText:''}")
        check(EXP[lang] in tx and 'EZ-LK 1634' in tx,f'{lang} {w}px Hinweis sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('#fbeforeez').screenshot(path=f'{SHOTS}/bussgeld_vor_ez_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
