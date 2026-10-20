# [CLAUDE] UI-Test Fehlersuche 20.10.2026 (9): Bußgeld-Verlauf nennt bestätigten und beim Zurücksetzen abgelösten Fahrer,
# gewählter Kandidat füllt den Nachweis in der Oberflächensprache (gespeichert deutsch wie vom Server), Fahrer-Startseite zeigt die aus
# HU + Erstzulassung berechnete SP, Reifenverlauf mit langer Größe ohne Querscrollen. DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SINCE={'de':'Fahrzeugzuordnung seit','uk':'Закріплено за транспортом з','en':'Assigned to the vehicle since'}
PREV={'de':'bisher: BV Fahrer','uk':'раніше: BV Fahrer','en':'previously: BV Fahrer'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bv.inhaber','display_name':'BV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bv.inhaber','password':PW})['s']==200,'Anmeldung')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    drv=api('POST','/api/users',{'username':'bv.fahrer','display_name':'BV Fahrer','role':'driver','environment':envn}); did=drv['d']['id']
    an=br.new_page(); an.goto(B); an.evaluate(JS,['POST','/api/invite/accept',{'token':drv['d']['invite_token'],'password':PW}]); an.close()
    vin='WDB96340310779901'; VID='VIN:'+vin; check(api('POST','/api/vehicles',{'plate':'BV-SP 1','vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
    check(api('POST',f'/api/vehicles/{VID}/drivers',{'user_id':did,'evidence':'Test-Zuordnung'})['s']==201,'Zuordnung')
    check(api('POST',f'/api/vehicles/{VID}/spec',{'zgm_class':'ueber_12','first_registration':'2015-03-01','spec_source':'Fahrzeugschein'})['s']==200,'Gewichtsklasse/EZ')
    check(api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'HU','last_done_date':'2026-01-15','interval_months':12,'evidence':'Bericht'})['s']==201,'HU')
    big='315/80R22.5-315/80R22.5-315/80R22.5-3158'
    check(api('POST',f'/api/vehicles/{VID}/tires/events',{'event_type':'wechsel','position':'VA-L','size':big,'brand':'X'*60})['s']==201,'Reifenwechsel mit langer Größe')
    from datetime import datetime, timezone
    import time; time.sleep(2)  # Tatzeit (sekundengenau) nach Beginn der Zuordnung
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':'AZ-BV-1','offense_type':'parken','offense_at':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':'BV-SP 1','request_key':'bv-1'})
    check(fi['s']==201,f'Schreiben erfasst ({fi["s"]})'); FID=fi['d']['id']
    first=True
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bv.inhaber','password':PW}])
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#cf', state='attached', timeout=15000)
        q.locator('input[name=cand]').first.check()
        ev=q.eval_on_selector('#cf [name=evidence]','e => e.value')
        check(ev.startswith(SINCE[lang]),f'{lang} {w}px: Nachweis in der Oberflächensprache ({ev[:50]})')
        if first:
            first=False
            q.locator('#cf button[type=submit], #cf button').last.click(); q.wait_for_timeout(1200)
            f=api('GET',f'/api/fines/{FID}')['d']['fine']
            check(f['status']=='fahrer_ermittelt' and (f.get('driver_evidence') or '').startswith('Fahrzeugzuordnung seit'),f'gespeichert deutsch ({f["status"]}, {f.get("driver_evidence")})')
            v=f['version']; r=api('POST',f'/api/fines/{FID}/commands',{'action':'set_status','expected_version':v,'note':'falsch','payload':{'status':'eingegangen'}})
            check(r['s']==200,f'zurückgesetzt ({r["s"]})')
            q.reload(); q.wait_for_selector('#cf', state='attached', timeout=15000)
        body=q.inner_text('body')
        check('→ BV Fahrer' in body and PREV[lang] in body,f'{lang} {w}px: Verlauf nennt Fahrer und bisherigen Fahrer')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Schreiben ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bv_fine_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#tirehist', state='attached', timeout=15000)
        q.evaluate("()=>document.querySelector('#tirehist').closest('details').open=true"); q.wait_for_timeout(200)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Reifenverlauf ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
        # Fahrer-Startseite: berechnete SP
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bv.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('dl.kv dt', state='attached', timeout=15000); q.wait_for_timeout(300)
        dts=q.eval_on_selector_all('dl.kv dt','els => els.map(e => e.textContent.trim())')
        check(any(d.startswith('SP') for d in dts),f'{lang} {w}px: Fahrer sieht SP ({dts})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Startseite ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bv_home_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: Fahrer ohne Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
