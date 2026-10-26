# [CLAUDE] UI-Test Blickwinkel „Lkw abgemeldet / Versicherung beendet“ (26.10.2026, Backlog 400–403): „Mein Fahrzeug“ des Fahrers zeigt bei
# einem ruhenden Fahrzeug den Hinweis „vor der Fahrt mit der Fuhrparkleitung klären“; Datenqualität der Leitung nennt „kein laufender
# Kfz-Versicherungsvertrag“ mit Partner und Datum in der App-Sprache. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
REST={'de':'ruhend gemeldet','uk':'не використовується','en':'dormant'}
INS={'de':'Kein laufender Kfz-Versicherungsvertrag','uk':'Немає чинного договору страхування','en':'No running vehicle insurance'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rv.inhaber','display_name':'RV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    y=(datetime.date.today()-datetime.timedelta(days=1)).isoformat()
    for vin,pl in [('WMA06XZZ0HP108400','RV-AB 400'),('WMA06XZZ0HP108401','RV-AB 401')]: api('POST','/api/vehicles',{'plate':pl,'vin':vin,'site':'Dortmund'})
    V1='VIN:WMA06XZZ0HP108400'; V2='VIN:WMA06XZZ0HP108401'
    c=api('POST',f'/api/vehicles/{V2}/contracts',{'kind':'versicherung','partner':'Muster-Versicherung AG','contract_no':'P-400','evidence':'Police'})
    check(c['s']==201 and api('POST',f"/api/contracts/{c['d']['id']}/end",{'ended_on':y,'end_note':'abgemeldet'})['s']==200,'Versicherung beendet')
    check(api('POST',f'/api/vehicles/{V1}/evaluation',{'excluded':True,'reason':'abgemeldet'})['s']==200,'ruhend')
    u=api('POST','/api/users',{'username':'rv.fahrer','display_name':'RV Fahrer','role':'driver','environment':'production'})
    check(u['s'] in (200,201),f'Fahrer angelegt ({u["s"]})')
    b=br.new_page(); b.goto(B); b.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); b.close()
    check(api('POST',f'/api/vehicles/{V1}/drivers',{'user_id':u['d']['id'],'evidence':'Test'})['s']==201,'Zuordnung')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        for who in ['rv.fahrer','rv.inhaber']:
          ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
          q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':who,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
          if who=='rv.fahrer':
            q.goto(B+'/#/'); q.wait_for_selector('[data-drvresting]', timeout=15000)
            check(REST[lang] in q.inner_text('[data-drvresting]'),f'{lang}/{w}: Fahrer sieht Hinweis ruhend')
            if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/rv_drv_{lang}.png')
          else:
            q.goto(B+'/#/quality'); q.wait_for_timeout(1500); bt=q.inner_text('body')
            check(INS[lang] in bt and 'Muster-Versicherung AG (P-400)' in bt,f'{lang}/{w}: Datenqualität nennt fehlende Versicherung')
            if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/rv_dq_{lang}.png',full_page=True)
          check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}/{who}: ohne Querscrollen')
          check(not errs,f'{lang}/{w}/{who}: keine Skriptfehler {errs[:2]}')
          ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
