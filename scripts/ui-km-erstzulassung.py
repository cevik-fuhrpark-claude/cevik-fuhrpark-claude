# [CLAUDE] UI-Test (21.11.2026, Backlog 1647, Blickwinkel „Leitung trägt einen km-Stand mit vertipptem Jahr nach“):
# Fahrzeugakte „Kilometerstand erfassen“: Ablesedatum hat min (Monat der Erstzulassung) und max (heute), Datum/Begründung per for/id beschriftet;
# der Server lehnt ein Datum vor der Erstzulassung mit Feld measured_on ab, Meldung übersetzt, Feld markiert (DE/UK/EN, 390/820/1366 px).
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Ablesedatum liegt vor der Erstzulassung des Fahrzeugs.','uk':'Дата зчитування пробігу раніша за першу реєстрацію транспортного засобу.','en':'The reading date is before the vehicle’s first registration.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310164701'; VID='VIN%3A'+VIN
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'TZ-AB 1647','site':'Dortmund','kind':'lkw'}); check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    today=datetime.date.today(); ez=today.replace(day=1)
    sp=api('POST','/api/vehicles/VIN:'+VIN+'/spec',{'first_registration':ez.isoformat(),'spec_source':'Fahrzeugschein (Test)'}); check(sp['s']==200,'Erstzulassung gesetzt '+str(sp['s'])+' '+str(sp['d'])[:200])
    old=(ez-datetime.timedelta(days=20)).isoformat()
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'tz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+VID); q.reload()
        try: q.wait_for_selector('#kfdate',state='attached',timeout=15000)
        except Exception: pass
        q.evaluate("()=>{const f=document.querySelector('#kf'); const d=f&&f.closest('details'); if(d) d.open=true;}")
        at=q.evaluate("()=>{const i=document.querySelector('#kfdate'); return i ? [i.min, i.max, !!document.querySelector('label[for=kfdate]'), !!document.querySelector('label[for=kfnote]'), !!document.querySelector('label[for=kfkm]')] : null}")
        check(at and at[0]==ez.isoformat() and at[1]==today.isoformat() and at[2] and at[3] and at[4], f'{lang} {w}px: min/max/Beschriftung {at}')
        if w==390:
          r=q.evaluate(JS,['POST','/api/vehicles/VIN:'+VIN+'/odometer',{'km':1000,'measured_on':old}])
          check(r['s']==400 and r['d'].get('field_key')=='measured_on', f'{lang}: Server lehnt ab {r}')
          q.evaluate("()=>{ const i=document.querySelector('#kfdate'); i.removeAttribute('min'); }")
          q.fill('#kfkm','1000'); q.fill('#kfdate', old); q.click('#kf button.btn')
          try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=8000); shown=True
          except Exception: shown=False
          check(shown, f'{lang}: Meldung übersetzt sichtbar')
          mk=q.evaluate("()=>document.querySelector('#kfdate').getAttribute('aria-invalid')")
          check(mk=='true', f'{lang}: Feld Ablesedatum markiert ({mk})')
          q.evaluate("()=>document.querySelector('#kfdate').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/tz_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
