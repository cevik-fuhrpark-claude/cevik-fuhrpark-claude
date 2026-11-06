# [CLAUDE] UI-Test (06.11.2026, Backlog 1091/1092, Blickwinkel „Fahrer kehrt nach drei Wochen Urlaub zurück, Lkw inzwischen getauscht“):
# „Mein Fahrzeug“ zeigt „Zugeordnet seit“; nach einem Fahrzeugwechsel erscheint auf demselben Gerät „Deine Fahrzeugzuordnung hat sich geändert“
# (neu/nicht mehr zugeordnet) – auch nach Ab- und wieder Anmelden – bis „Verstanden“. DE/UK/EN bei 390/820/1366 px, kein Querscrollen,
# keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zg.inhaber','display_name':'ZG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'zg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    n=0; R=os.getpid()%100000
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; old=f'ZG-AL {R%900}{n}'; new=f'ZG-NE {R%900}{n}'; vo=f'VIN:WDB97{R:05d}A{n:04d}00'; vn=f'VIN:WDB97{R:05d}B{n:04d}00'
        api('POST','/api/vehicles',{'plate':old,'vin':vo[4:],'kind':'lkw','site':'Dortmund'}); api('POST','/api/vehicles',{'plate':new,'vin':vn[4:],'kind':'lkw','site':'Dortmund'})
        uname=f'zg.fahrer{R}.{n}'
        u=api('POST','/api/users',{'username':uname,'display_name':f'ZG Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'Fahrer {n} angelegt')
        check(api('POST',f'/api/vehicles/{vo}/drivers',{'user_id':u['d']['id'],'end_previous':False})['s']==201,'altes Fahrzeug zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':uname,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-assignedsince]',timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#vchange').count()==0,f'{lang} {w}px: erstes Öffnen ohne Hinweis')
        check(q.locator('[data-assignedsince]').count()==1,f'{lang} {w}px: „Zugeordnet seit“')
        # Urlaub: Abmelden, Leitung tauscht den Lkw, Fahrer meldet sich wieder an
        q.evaluate(JS,['POST','/api/logout',{}])
        check(api('POST',f'/api/vehicles/{vn}/drivers',{'user_id':u['d']['id'],'end_previous':True})['s']==201,'Fahrzeugwechsel')
        q.evaluate(JS,['POST','/api/login',{'username':uname,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#vchange',timeout=15000); q.wait_for_timeout(300)
        txt=q.inner_text('#vchange')
        check(new in q.inner_text('[data-vchnew]') and old in q.inner_text('[data-vchgone]'),f'{lang} {w}px: Hinweis neu/nicht mehr zugeordnet')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zuordnung_geaendert_{lang}_{w}.png')
        q.reload(); q.wait_for_selector('#vchange',timeout=15000); check(True,f'{lang} {w}px: bleibt nach Neuladen')
        q.click('#vchangeok'); q.wait_for_timeout(200); check(q.locator('#vchange').count()==0,f'{lang} {w}px: „Verstanden“ blendet aus')
        q.reload(); q.wait_for_selector('[data-assignedsince]',timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#vchange').count()==0,f'{lang} {w}px: nach „Verstanden“ nicht wieder')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
