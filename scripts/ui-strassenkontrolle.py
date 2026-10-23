# [CLAUDE] UI-Test Backlog 202 (23.10.2026, Teilagent „Straßenkontrolle“): Fahrer zeigt bei einer Kontrolle das ganze Gespann – „Mein Fahrzeug“
# nennt HU/SP des gekoppelten Anhängers (überfällig rot), ungeklärte HU/SP ohne Datum, Mängel des Anhängers; kein grünes „keine offenen
# Meldungen“ bei gesperrtem Anhänger; Abfahrtskontrolle mit gewähltem Anhänger zeigt dessen bekannte Mängel. DE 390, UK 820, EN 1366.
# Dev-Server: CFP_URL (Standard Port 8787), frischer Server nötig. Screenshots: CFP_SHOTS.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
GREEN={'de':'keine offenen Meldungen','uk':'немає відкритих повідомлень','en':'no open reports'}
UNCLEAR={'de':'Frist ungeklärt','uk':'строк не з’ясовано','en':'deadline unclear'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,path,b=None: a.evaluate(JS,[m,path,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sk.inhaber','display_name':'SK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sk.inhaber','password':PW})['s']==200,'Inhaber angemeldet')
    envname=api('GET','/api/me')['d']['active_environment']
    last=(datetime.date.today()-datetime.timedelta(days=400)).isoformat()
    for i,(lang,w,h) in enumerate([('de',390,844),('uk',820,1180),('en',1366,900)]):
        T=f'VIN:WDB9634031077100{i}'; H=f'VIN:WDB9634031077200{i}'; tp=f'SK-Z {i+1}'; hp=f'SK-H {i+1}'
        check(api('POST','/api/vehicles',{'plate':tp,'vin':T[4:],'site':'Dortmund','trailer_plate':hp})['s']==201,f'{lang}: Zugmaschine')
        check(api('POST','/api/vehicles',{'plate':hp,'vin':H[4:],'site':'Dortmund','kind':'anhaenger'})['s']==201,f'{lang}: Anhänger')
        api('POST',f'/api/vehicles/{H}/spec',{'zgm_class':'ueber_10','spec_source':'UI-Test Fahrzeugschein F.2'})
        check(api('POST',f'/api/vehicles/{H}/maintenance',{'kind':'HU','last_done_date':last,'interval_months':12,'evidence':'UI-Test Prüfbericht'})['s']==201,f'{lang}: HU Anhänger')
        check(api('POST','/api/cases',{'vehicle_id':H,'description':'Bremsleitung Anhänger undicht (UI-Straßenkontrolle)','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})['s']==201,f'{lang}: Mangel Anhänger')
        u=f'sk.fahrer{i}'
        r=api('POST','/api/users',{'username':u,'display_name':u.upper(),'role':'driver','environment':envname})
        uid=r['d'].get('id') or r['d'].get('user',{}).get('id')
        c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}]); c0.close()
        api('POST',f'/api/vehicles/{T}/drivers',{'user_id':uid,'end_previous':False})
        ctx=br.new_context(viewport={'width':w,'height':h},locale={'de':'de-DE','uk':'uk-UA','en':'en-GB'}[lang]); q=ctx.new_page(); errs=[]
        q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':u,'password':PW}])['s']==200,f'{lang}: Fahrer angemeldet')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+'/#/'); q.wait_for_selector('[data-coupled]',timeout=15000); q.wait_for_timeout(400)
        body=q.inner_text('main') if q.query_selector('main') else q.inner_text('body')
        blk=q.inner_text('[data-coupled]')
        check(hp in blk and q.query_selector('[data-coupled] .chip.kritisch') is not None,f'{lang}: HU des Anhängers überfällig im Anhänger-Block')
        check('UI-Straßenkontrolle' in blk,f'{lang}: Mangel des Anhängers lesbar')
        check(q.query_selector('[data-unclear]') is not None and UNCLEAR[lang] in body,f'{lang}: HU der Zugmaschine „Frist ungeklärt“')
        check(GREEN[lang] not in body,f'{lang}: kein grünes „keine offenen Meldungen“ bei gesperrtem Anhänger')
        if SHOTS: q.screenshot(path=f'{SHOTS}/strassenkontrolle_home_{lang}_{w}.png',full_page=True)
        q.evaluate("location.hash='#/check'"); q.wait_for_selector('#v',timeout=15000); q.wait_for_timeout(800); q.select_option('#v',H); q.wait_for_timeout(500)
        check('UI-Straßenkontrolle' in q.inner_text('#known'),f'{lang}: Abfahrtskontrolle Anhänger zeigt bekannten Mangel')
        if SHOTS: q.screenshot(path=f'{SHOTS}/strassenkontrolle_check_{lang}_{w}.png')
        check(not errs,f'{lang}: keine Skriptfehler {errs}'); ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
exit(1 if fails else 0)
