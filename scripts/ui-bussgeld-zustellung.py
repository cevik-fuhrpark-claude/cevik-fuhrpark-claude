# [CLAUDE] UI-Test Bußgeld: Zustellstand der Fahrerinformation (26.10.2026, Backlog 375, Blickwinkel „Zeugenfragebogen, Frist 1 Woche,
# Fahrer im Urlaub“): informiert am …, Quittung offen, Push-Stand, Hinweis „nicht per Push erreicht“ und zur Antwortfrist; nach der
# Quittung „Quittiert am …“ ohne Hinweise; Einwand des Fahrers über die Oberfläche (Backlog 377) und Anzeige für die Leitung. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OPEN={'de':'Quittung offen','uk':'Підтвердження очікується','en':'Acknowledgement pending'}
DONE={'de':'Quittiert am','uk':'Підтверджено','en':'Acknowledged on'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zs.inhaber','display_name':'ZS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'zs.inhaber','password':PW})
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    api('POST','/api/vehicles',{'plate':'ZS-BG 375','vin':'WDB96340310737501','kind':'lkw'})
    du=api('POST','/api/users',{'username':'zs.fahrer','display_name':'ZS Fahrer','role':'driver','environment':envn}); DUID=du['d']['id']
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=5)).strftime('%Y-%m-%dT%H:%M:%SZ')
    due=(datetime.date.today()+datetime.timedelta(days=7)).isoformat()
    fi=api('POST','/api/fines',{'kind':'zeugenfragebogen','authority':'Stadt ZS','reference':'AZ-ZS-375','offense_type':'parken','offense_at':off,'plate_in_letter':'ZS-BG 375','response_due':due,'request_key':'zs-1'})
    check(fi['s']==201,f'Zeugenfragebogen erfasst ({fi["s"]} {fi["d"]})'); FID=fi['d']['id']
    ver=lambda: api('GET',f'/api/fines/{FID}')['d']['fine']['version']
    c=api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','expected_version':ver(),'payload':{'driver_id':DUID,'basis':'manuell','evidence':'Tourenplan (Test)'}}); check(c['s']==200,f'Fahrer bestätigt ({c["s"]})')
    c=api('POST',f'/api/fines/{FID}/commands',{'action':'inform_driver','expected_version':ver()}); check(c['s']==200,f'Fahrer informiert ({c["s"]} {c["d"]})')
    def view(lang,w,h,acked):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zs.inhaber','password':PW}])
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('[data-finf]', timeout=15000)
        txt=q.inner_text('[data-finf]')
        if not acked:
            check(OPEN[lang] in txt and 'Push:' in txt,f'{lang} {w}px: informiert, Quittung offen, Push-Stand ({txt!r})')
            check(q.locator('[data-fpushmiss]').count()==1,f'{lang} {w}px: Hinweis „nicht per Push erreicht“ (kein Gerät)')
            check(q.locator('[data-fackdue]').count()==1,f'{lang} {w}px: Hinweis Antwortfrist läuft unabhängig')
        else:
            check(DONE[lang] in txt and OPEN[lang] not in txt,f'{lang} {w}px: quittiert ({txt!r})')
            check(q.locator('[data-fpushmiss]').count()==0 and q.locator('[data-fackdue]').count()==0,f'{lang} {w}px: nach Quittung keine Hinweise')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zustellung_{"q" if acked else "o"}_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]: view(lang,w,h,False)
    # Fahrer quittiert
    dctx=br.new_context(); d=dctx.new_page(); d.goto(B)
    r=d.evaluate(JS,['POST','/api/invite/accept',{'token':du['d']['invite_token'],'password':PW}]); check(r['s'] in (200,201),f'Fahrerkonto aktiviert ({r["s"]})')
    d.evaluate(JS,['POST','/api/login',{'username':'zs.fahrer','password':PW}])
    # Einwand über die Oberfläche (Backlog 377), Handy 390 px
    dctx2=br.new_context(viewport={'width':390,'height':844}); q=dctx2.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zs.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'uk'}])
    q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#dpf', state='attached', timeout=15000)
    q.evaluate("()=>document.querySelector('#dpf').closest('details').open=true")
    if SHOTS: q.screenshot(path=f'{SHOTS}/einwand_fahrer_uk_390.png',full_page=True)
    q.fill('#dpn','Відпустка 18–25.10, керував інший водій'); q.locator('#dpf button').click(); q.wait_for_selector('[data-fmydisp]', timeout=15000)
    check(q.locator('#dpf').count()==0,'Fahrer: Einwand gesendet, Formular weg')
    check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),'Fahrer 390px: ohne Querscrollen')
    check(not errs,f'Fahrer: keine Skriptfehler {errs[:2]}')
    dctx2.close()
    for lang,w,h in [('de',390,844),('en',1366,900)]:
      api('PATCH','/api/me',{'language':lang})
      ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zs.inhaber','password':PW}])
      q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#fdisp', timeout=15000)
      check('Відпустка' in q.inner_text('#fdisp'),f'{lang} {w}px: Leitung sieht den Einwand')
      check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
      if SHOTS: q.screenshot(path=f'{SHOTS}/einwand_leitung_{lang}_{w}.png',full_page=True)
      check(not errs,f'{lang} {w}px Einwand: keine Skriptfehler {errs[:2]}')
      ctx.close()
    r=d.evaluate(JS,['POST',f'/api/fines/{FID}/commands',{'action':'driver_ack'}]); check(r['s']==200,f'Fahrer quittiert ({r["s"]} {r["d"]})')
    r=d.evaluate(JS,['GET',f'/api/fines/{FID}',None]); check(r['s']==200 and 'inform_delivery' not in r['d'],'Fahrer sieht keinen Zustellstand')
    dctx.close()
    for lang in ['de','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(1366,900)]: view(lang,w,h,True)
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
