# [CLAUDE] UI-Test Backlog 557 (Blickwinkel „Anhörungsbogen“): Bußgeld-Detail zeigt „Zuordnungswechsel am Tattag“ mit Uhrzeit und
# dem Hinweis „Uhrzeit der Eingabe, nicht der Übergabe“; Kandidaten-Nachweis nennt die Uhrzeit. Backlog 558/565: Chip und Auswahl „Antwortfrist fehlt“. DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Zuordnungswechsel am Tattag','uk':'Зміна закріплення в день порушення','en':'Assignment changes on the day of the offence'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']==200,'Anmeldung')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    ids=[]
    for n in ['TZ Stammfahrer','TZ Springer mit langem Namen Kowalczyk-Wiśniewska']:
        d=api('POST','/api/users',{'username':'tz.'+str(len(ids)),'display_name':n,'role':'driver','environment':envn}); ids.append(d['d']['id'])
    vin='WDB96340310779957'; VID='VIN:'+vin; check(api('POST','/api/vehicles',{'plate':'TZ-AB 557','vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
    for i in ids: check(api('POST',f'/api/vehicles/{VID}/drivers',{'user_id':i})['s']==201,'Zuordnung')
    from datetime import datetime, timezone, timedelta
    import time; time.sleep(2)
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':'AZ-TZ-557','offense_type':'parken','offense_at':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':'TZ-AB 557','request_key':'tz-557'})
    check(fi['s']==201,f'Schreiben erfasst ({fi["s"]})'); FID=fi['d']['id']
    f2=api('POST','/api/fines',{'kind':'bussgeldbescheid','authority':'Stadt Test','reference':'AZ-TZ-565','offense_type':'parken','offense_at':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':'TZ-AB 557','response_due':(datetime.now(timezone.utc)+timedelta(days=10)).strftime('%Y-%m-%d'),'request_key':'tz-565'})
    check(f2['s']==201,f'zweites Schreiben mit Frist ({f2["s"]} {f2["d"]})')
    d=api('GET',f'/api/fines/{FID}')['d']; sd=d.get('same_day_assignments') or []
    check(len(sd)==2 and all(x['change']=='start' for x in sd),f'API: zwei Zuordnungen am Tattag ({len(sd)})')
    tm=sd[0]['time'] if sd else '??:??'
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tz.inhaber','password':PW}])
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('[data-fcsameday]', state='attached', timeout=15000)
        txt=q.inner_text('[data-fcsameday]')
        check(TITLE[lang] in txt and txt.count(tm)>=2,f'{lang} {w}px: Wechsel am Tattag mit Uhrzeit')
        check(q.locator('[data-fcmulti]').count()==1,f'{lang} {w}px: Hinweis mehrere Zuordnungen bleibt')
        q.locator('input[name=cand]').first.check()
        ev=q.eval_on_selector('#cf [name=evidence]','e => e.value')
        check(tm in ev,f'{lang} {w}px: Nachweis mit Uhrzeit ({ev[:60]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('[data-fcsameday]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tz_fine_{lang}_{w}.png',full_page=True)
        check(q.locator('[data-fnodue]').count()==1,f'{lang} {w}px: 558 Chip „Antwortfrist fehlt“ im Detail')
        q.goto(B+'/#/fines'); q.wait_for_selector('#fnodue', state='attached', timeout=15000)
        n0=q.locator('a.row[href^="#/fines/"]').count(); q.check('#fnodue'); q.wait_for_function("()=>document.querySelectorAll('a.row[href^=\"#/fines/\"]').length===1", timeout=10000)
        n1=q.locator('a.row[href^="#/fines/"]').count()
        check(n0==2 and n1==1 and q.locator('a.row [data-fnodue]').count()==1,f'{lang} {w}px: 565 Auswahl „Antwortfrist fehlt“ ({n0} → {n1})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Liste ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/tz_fines_{lang}_{w}.png',full_page=True)
        q.uncheck('#fnodue'); q.wait_for_timeout(300)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
