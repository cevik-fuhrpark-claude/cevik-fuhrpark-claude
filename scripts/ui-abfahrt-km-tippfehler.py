# [CLAUDE] UI-Test (01.11.2026, Backlog 836, Blickwinkel „Fahrer tippt bei der Abfahrtskontrolle eine Ziffer zu viel“): Abfahrtskontrolle
# zeigt am km-Feld den letzten Stand des gewählten Fahrzeugs, beim Tippen die Differenz, bei kleinerem Stand bzw. mehr Stellen einen Hinweis;
# Fahrzeug ohne Stand ohne Hinweis; auch für Fahrer. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V1='VIN:WMA06XZZ8RP836011'; V2='VIN:WMA06XZZ8RP836012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kt.inhaber','display_name':'KT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r1=api('POST','/api/vehicles',{'vin':V1[4:],'plate':'KT-KM 836','site':'Dortmund','kind':'lkw'})
    r2=api('POST','/api/vehicles',{'vin':V2[4:],'plate':'KT-KM 837','site':'Dortmund','kind':'lkw'})
    check(r1['s'] in (200,201,409) and r2['s'] in (200,201,409),f'Fahrzeuge angelegt ({r1["s"]}/{r2["s"]})')
    o=api('POST',f'/api/vehicles/{V1}/odometer',{'km':412345})
    check(o['s'] in (200,201,409),f'km-Stand erfasst ({o["s"]})')
    u=api('POST','/api/users',{'username':'kt.fahrer','display_name':'KT Fahrer','role':'driver','environment':'production'})
    users=[('kt.inhaber',None)]
    if u['s'] in (200,201): users.append(('kt.fahrer',u['d']['invite_token']))
    else: users.append(('kt.fahrer',None))
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
       for who,tok in users:
        if who=='kt.fahrer' and not (lang=='de' or wd==390): continue
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B)
        if tok: q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}]); users[1]=(who,None)
        check(q.evaluate(JS,['POST','/api/login',{'username':who,'password':PW}])['s']==200,f'{who}: Anmeldung'); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        tag=f'{who}/{lang}/{wd}'
        check(q.locator('#dckmlast').is_hidden(),f'{tag}: ohne Auswahl kein Stand')
        q.select_option('#v',V2); q.wait_for_timeout(50); q.fill('#km','5000')
        check(q.locator('#dckmlast').is_hidden() and q.inner_text('#dckmd').strip()=='',f'{tag}: Fahrzeug ohne Stand ohne Hinweis')
        q.select_option('#v',V1); q.wait_for_timeout(50)
        txt=q.inner_text('#dckmlast')
        check(q.locator('#dckmlast').is_visible() and ('412' in txt),f'{tag}: letzter Stand sichtbar ({txt})')
        check(q.locator('#dckmlow').count()==1,f'{tag}: 5000 km → Hinweis kleiner')
        q.fill('#km','412.900')
        check(q.locator('#dckmdiff').count()==1 and '555' in q.inner_text('#dckmdiff') and q.locator('#dckmdigits').count()==0,f'{tag}: Differenz +555 ohne Ziffern-Hinweis')
        q.fill('#km','4129000')
        check(q.locator('#dckmdigits').is_visible(),f'{tag}: eine Null zu viel → Ziffern-Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: q.locator('#km').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kmtipp-{who}-{lang}-{wd}.png')
        q.fill('#km','')
        check(q.inner_text('#dckmd').strip()=='',f'{tag}: leer → kein Hinweis')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
