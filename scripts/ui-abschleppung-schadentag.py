# [CLAUDE] UI-Test (21.11.2026, Backlog 1657, Blickwinkel „Leitung trägt die Abschleppung nach und vertippt den Tag“): Vorgang mit
# Schadenzeitpunkt → „Standort/Abschleppung“: „Abgeschleppt am“ hat min = Schadentag; ohne Browser-Grenze lehnt der Server einen Tag vor
# dem Schaden mit Feld towed_on ab (Feld markiert, Meldung übersetzt, nichts gespeichert). DE/UK/EN, 390/820/1366 px. Frischer Dev-Server.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Abgeschleppt am liegt vor dem Schadenzeitpunkt.','uk':'Дата евакуації раніша за час пошкодження.','en':'The towing date is before the time of the damage.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310165701'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'AS-AB 1657','vin':VIN,'site':'Dortmund','kind':'lkw'})
    today=datetime.date.today(); occ=(today-datetime.timedelta(days=3)).isoformat(); bad=(today-datetime.timedelta(days=5)).isoformat()
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        r=api('POST','/api/cases',{'vehicle_id':vid,'description':f'AS {n} Motor springt nicht an, abgeschleppt','priority':'mittel','driveability':'nicht_fahrbereit','occurred_at':occ,'request_key':f'as-{os.getpid()}-{n}'})
        cid=r['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=set_vehicle_location]',timeout=15000)
        q.click('[data-act=set_vehicle_location]'); q.wait_for_selector('#vlon',timeout=15000)
        at=q.evaluate("()=>[document.getElementById('vlon').min, document.getElementById('vlon').max]")
        check(at==[occ,today.isoformat()], f'{tag}: min Schadentag/max heute {at}')
        q.fill('#vlloc','Abschlepphof Nord'); q.fill('#vlsvc','Abschleppdienst Nord')
        q.evaluate("()=>document.getElementById('vlon').removeAttribute('min')"); q.fill('#vlon',bad)
        q.click('#af button:not([type=button])')
        try: q.wait_for_function("()=>document.getElementById('vlon') && document.getElementById('vlon').getAttribute('aria-invalid')==='true'", timeout=8000); mk=True
        except Exception: mk=False
        check(mk, f'{tag}: Feld markiert, Formular offen')
        try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=5000); shown=True
        except Exception: shown=False
        check(shown, f'{tag}: Meldung übersetzt')
        check(not api('GET',f'/api/cases/{cid}')['d']['case'].get('towed_on'), f'{tag}: nichts gespeichert')
        q.evaluate("()=>document.getElementById('vlon').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/as_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
