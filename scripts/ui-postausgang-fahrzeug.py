# [CLAUDE] UI-Test Backlog 200 (23.10.2026, Teilagent „Unfall nachts“): Fahrer meldet ohne Netz „nicht fahrbereit“ – solange die Meldung
# im Postausgang liegt, zeigt die Startseite für das Fahrzeug kein grünes „keine offenen Meldungen“, sondern „noch nicht gesendet“ und
# „nicht fahren“; die Abfahrtskontrolle warnt beim Fahrzeug. Nach dem Senden (wieder Netz) verschwindet der Hinweis. DE 390, UK 820, EN 1366.
# Dev-Server: CFP_URL (Standard Port 8787), frischer Server nötig. Screenshots: CFP_SHOTS.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
CRIT={'de':'nicht fahrbereit – noch nicht gesendet','uk':'ще не надіслано','en':'not sent yet'}
GREEN={'de':'keine offenen Meldungen','uk':'немає відкритих повідомлень','en':'no open reports'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,path,b=None: a.evaluate(JS,[m,path,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pf.inhaber','display_name':'PF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pf.inhaber','password':PW})['s']==200,'Inhaber angemeldet')
    envname=api('GET','/api/me')['d']['active_environment']
    for i,(lang,w,h) in enumerate([('de',390,844),('uk',820,1180),('en',1366,900)]):
        vin=f'WDB9634031066210{i}'; vid='VIN:'+vin; pl=f'PF-A {i+1}'
        api('POST','/api/vehicles',{'plate':pl,'vin':vin,'site':'Dortmund'})
        u=f'pf.fahrer{i}'
        r=api('POST','/api/users',{'username':u,'display_name':u.upper(),'role':'driver','environment':envname})
        uid=r['d'].get('id') or r['d'].get('user',{}).get('id')
        c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}]); c0.close()
        api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uid})
        ctx=br.new_context(viewport={'width':w,'height':h},locale={'de':'de-DE','uk':'uk-UA','en':'en-GB'}[lang]); q=ctx.new_page(); errs=[]
        q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':u,'password':PW}])['s']==200,f'{lang}: Fahrer angemeldet')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.goto(B+'/#/'); q.wait_for_timeout(1200)
        home=q.inner_text('main') if q.query_selector('main') else q.inner_text('body')
        check(GREEN[lang] in home,f'{lang}: vorher grün „keine offenen Meldungen“')
        q.goto(B+'/#/new'); q.wait_for_selector('#d'); q.wait_for_timeout(500)
        ctx.set_offline(True)
        q.locator(f'input[name=veh][value="{vid}"]').check(force=True); q.fill('#d','Unfall nachts, Achse beschädigt (Postausgangtest)')
        q.locator('input[name=drv][value=nicht_fahrbereit]').check(force=True)
        q.click('#sb'); q.wait_for_selector('[data-callbox]',timeout=15000)
        q.evaluate("location.hash='#/'"); q.wait_for_selector('[data-outboxcrit]',timeout=15000); q.wait_for_timeout(400)
        body=q.inner_text('body')
        check(q.query_selector('[data-outboxveh]') is not None and GREEN[lang] not in body,f'{lang}: Startseite ohne „keine offenen Meldungen“, Zähler „noch nicht gesendet“')
        check(CRIT[lang] in body,f'{lang}: Hinweis nicht fahren / noch nicht gesendet')
        if SHOTS: q.screenshot(path=f'{SHOTS}/postausgang_fahrzeug_home_{lang}_{w}.png',full_page=True)
        q.evaluate("location.hash='#/check'"); q.wait_for_selector('#v',timeout=15000); q.select_option('#v',vid); q.wait_for_timeout(300)
        check(q.query_selector('#known [data-outboxcrit]') is not None,f'{lang}: Abfahrtskontrolle warnt beim Fahrzeug')
        if SHOTS: q.screenshot(path=f'{SHOTS}/postausgang_fahrzeug_check_{lang}_{w}.png')
        ctx.set_offline(False); q.goto(B+'/#/'); 
        for _ in range(40):
            q.wait_for_timeout(500)
            if q.evaluate(f"(JSON.parse(localStorage.getItem('cfp_outbox_{uid}_'+'{envname}')||'[]')).length")==0: break
        q.goto(B+'/#/check'); q.goto(B+'/#/'); q.wait_for_timeout(1500)
        check(q.query_selector('[data-outboxcrit]') is None and q.query_selector('[data-outboxveh]') is None,f'{lang}: nach dem Senden kein Postausgang-Hinweis mehr')
        cs=[x for x in api('GET','/api/cases?f=all')['d']['cases'] if 'Postausgangtest' in x['description'] and x.get('plate')==pl]
        check(len(cs)==1,f'{lang}: Meldung genau einmal angekommen')
        check(not errs,f'{lang}: keine Skriptfehler {errs}'); ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
exit(1 if fails else 0)
