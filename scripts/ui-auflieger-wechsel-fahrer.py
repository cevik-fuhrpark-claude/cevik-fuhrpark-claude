# [CLAUDE] UI-Test (16.11.2026, Backlog 1526, Blickwinkel „Leitung sattelt einen anderen Auflieger an – der zugeordnete Fahrer merkt es erst am Hof“):
# Fahrer ist einer Zugmaschine zugeordnet; die Leitung trägt in den Stammdaten ein anderes Anhängerkennzeichen ein → auf demselben Gerät erscheint
# „Deine Fahrzeugzuordnung hat sich geändert“ mit „Anderer Anhänger/Auflieger an …: bisher …, jetzt …“ und dem Abfahrts-Hinweis, bis „Verstanden“.
# Backlog 1527: danach Ummeldung der Zugmaschine → „Dein Fahrzeug hat ein neues Kennzeichen: bisher …, jetzt …“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'aw.inhaber','display_name':'AW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'aw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    n=0; R=os.getpid()%100000
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; zm=f'AW-ZM {R%900}{n}'; old=f'AW-AL {R%900}{n}'; new=f'AW-NE {R%900}{n}'; vin=f'WDB98{R:05d}C{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':zm,'vin':vin,'kind':'lkw','site':'Dortmund','trailer_plate':old})['s']==201,'Zugmaschine angelegt')
        uname=f'aw.fahrer{R}.{n}'
        u=api('POST','/api/users',{'username':uname,'display_name':f'AW Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'Fahrer {n} angelegt')
        check(api('POST',f'/api/vehicles/VIN:{vin}/drivers',{'user_id':u['d']['id'],'end_previous':False})['s']==201,'zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':uname,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-assignedsince]',timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#vchange').count()==0,f'{lang} {w}px: erstes Öffnen ohne Hinweis')
        check(api('POST','/api/vehicles',{'plate':zm,'vin':vin,'site':'Dortmund','keep_active':True,'trailer_plate':new})['s']==201,'anderer Auflieger eingetragen')
        q.reload(); q.wait_for_selector('#vchange',timeout=15000); q.wait_for_timeout(300)
        t=q.inner_text('[data-vchtrl]')
        check(zm in t and old in t and new in t,f'{lang} {w}px: Hinweis nennt Zugmaschine, bisherigen und neuen Auflieger ({t})')
        check(q.locator('[data-vchtrlhint]').count()==1 and q.locator('[data-vchnew]').count()==0,f'{lang} {w}px: Abfahrts-Hinweis, keine Fahrzeugzeile')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/auflieger_wechsel_{lang}_{w}.png')
        q.click('#vchangeok'); q.wait_for_timeout(200); check(q.locator('#vchange').count()==0,f'{lang} {w}px: „Verstanden“ blendet aus')
        q.reload(); q.wait_for_selector('[data-assignedsince]',timeout=15000); q.wait_for_timeout(300)
        check(q.locator('#vchange').count()==0,f'{lang} {w}px: nach „Verstanden“ nicht wieder')
        # Backlog 1527: Zugmaschine umgemeldet (neues Kennzeichen, gleiche FIN)
        zn=f'AW-UM {R%900}{n}'
        check(api('POST','/api/vehicles',{'plate':zn,'vin':vin,'site':'Dortmund','keep_active':True,'trailer_plate':new})['s']==201,'Zugmaschine umgemeldet')
        q.reload(); q.wait_for_selector('#vchange',timeout=15000); q.wait_for_timeout(300)
        t=q.inner_text('[data-vchplate]')
        check(zm in t and zn in t and q.locator('[data-vchplatehint]').count()==1 and q.locator('[data-vchtrl]').count()==0 and q.locator('[data-vchnew]').count()==0,f'{lang} {w}px: neues Kennzeichen der Zugmaschine ({t})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen (Ummeldung)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ummeldung_{lang}_{w}.png')
        q.click('#vchangeok'); q.wait_for_timeout(200); check(q.locator('#vchange').count()==0,f'{lang} {w}px: „Verstanden“ (Ummeldung)')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
