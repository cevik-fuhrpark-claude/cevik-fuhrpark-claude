# [CLAUDE] UI-Test (27.10.2026, Backlog 421, Blickwinkel „Fahrer tauscht unterwegs den Lkw mit einem Kollegen“): Fahrer mit zugeordnetem Lkw
# wählt in Abfahrtskontrolle bzw. Meldeformular den Lkw eines Kollegen → Hinweis „nicht dir zugeordnet (dein Fahrzeug: …)“; eigenes Fahrzeug
# ohne Hinweis. Leitung sieht im Vorgang „Zuordnung des Melders: nicht diesem Fahrzeug zugeordnet“ mit eigenem Kennzeichen und Kollegen.
# Backlog 422: Bußgeld am Lkw des Kollegen – Kandidat „Kollege“ nennt seine Abfahrtskontrolle am anderen Fahrzeug.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ELSE={'de':'anderen Fahrzeug','uk':'іншому транспортному засобі','en':'different vehicle'}
NOTA={'de':'nicht diesem Fahrzeug zugeordnet','uk':'не закріплений за цим','en':'not assigned to this vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ft.inhaber','display_name':'FT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ft.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    n=0; R=os.getpid()%100000  # wiederholbar am selben Dev-Server
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; own=f'FT-TA {R%900}{n}'; other=f'FT-TB {R%900}{n}'; vo=f'VIN:WDB96{R:05d}A{n:04d}00'; vk=f'VIN:WDB96{R:05d}B{n:04d}00'
        api('POST','/api/vehicles',{'plate':own,'vin':vo[4:],'kind':'lkw','site':'Dortmund'}); api('POST','/api/vehicles',{'plate':other,'vin':vk[4:],'kind':'lkw','site':'Dortmund'})
        u=api('POST','/api/users',{'username':f'ft.tausch{R}.{n}','display_name':f'FT Tausch {n}','role':'driver','environment':envn,'language':lang})
        k=api('POST','/api/users',{'username':f'ft.kollege{R}.{n}','display_name':f'FT Kollege {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201) and k['s'] in (200,201),f'Fahrer {n} angelegt')
        check(api('POST',f'/api/vehicles/{vo}/drivers',{'user_id':u['d']['id'],'end_previous':False})['s']==201 and api('POST',f'/api/vehicles/{vk}/drivers',{'user_id':k['d']['id'],'end_previous':False})['s']==201,'zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); check(q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s'] in (200,201),'Einladung angenommen')
        q.evaluate(JS,['POST','/api/login',{'username':f'ft.tausch{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(800)
        # Abfahrtskontrolle: eigenes Fahrzeug vorausgewählt, kein Hinweis; Kollegen-Lkw → Hinweis mit eigenem Kennzeichen
        q.goto(B+'/#/check'); q.wait_for_selector('.checkitem',timeout=15000); q.wait_for_timeout(300)
        check(q.input_value('#v')==vo and q.locator('[data-notmine]').count()==0,f'{lang} {w}px: Kontrolle eigenes Fahrzeug ohne Hinweis')
        q.select_option('#v',vk); q.wait_for_timeout(200)
        check(q.locator('[data-notmine]').count()==1 and own in q.inner_text('[data-notmine]'),f'{lang} {w}px: Kontrolle Kollegen-Lkw → Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Kontrolle ohne Querscrollen')
        if SHOTS: q.locator('[data-notmine]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tausch_kontrolle_{lang}_{w}.png')
        q.select_option('#v',vo); q.wait_for_timeout(200); check(q.locator('[data-notmine]').count()==0,f'{lang} {w}px: zurück aufs eigene → kein Hinweis')
        q.select_option('#v',''); q.wait_for_timeout(200)
        # Meldeformular
        q.goto(B+'/#/new'); q.wait_for_selector('input[name=veh]',timeout=15000); q.wait_for_timeout(300)
        check(q.locator('[data-notmine]').count()==0,f'{lang} {w}px: Meldung eigenes Fahrzeug ohne Hinweis')
        q.evaluate("()=>document.querySelectorAll('details').forEach(d=>d.open=true)")
        q.locator(f'input[name=veh][value="{vk}"]').check(force=True); q.wait_for_timeout(200)
        check(q.locator('[data-notmine]').count()==1 and own in q.inner_text('[data-notmine]'),f'{lang} {w}px: Meldung Kollegen-Lkw → Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Meldung ohne Querscrollen')
        if SHOTS: q.locator('[data-notmine]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tausch_meldung_{lang}_{w}.png')
        r=q.evaluate(JS,['POST','/api/cases',{'vehicle_id':vk,'description':'Spiegel rechts lose (Test Tausch)','priority':'niedrig','driveability':'fahrbereit','request_key':f'ft-tausch-{n}-{os.getpid()}'}])
        check(r['s']==201,f'{lang} {w}px: Meldung gesendet')
        check(not errs,f'{lang} {w}px: Fahrer ohne Skriptfehler {errs[:1]}')
        ctx.close()
        # Backlog 422: Kollege (zugeordnet „other“) macht die Abfahrtskontrolle am eigenen Lkw des Fahrers → Bußgeld an „other“ nennt das beim Kandidaten
        kc=br.new_context(); kq=kc.new_page(); kq.goto(B)
        kq.evaluate(JS,['POST','/api/invite/accept',{'token':k['d']['invite_token'],'password':PW}]); kq.evaluate(JS,['POST','/api/login',{'username':f'ft.kollege{R}.{n}','password':PW}])
        keys=[i['key'] for i in kq.evaluate(JS,['GET','/api/meta',None])['d']['checklist']]
        check(kq.evaluate(JS,['POST','/api/inspections',{'kind':'abfahrt','vehicle_id':vo,'request_key':f'ft-tk-{R}-{n}','items':[{'key':x,'result':'ok'} for x in keys]}])['s']==201,'Kollege kontrolliert den Lkw des Fahrers')
        kc.close()
        fz=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund','reference':f'AZ-FT-{R}-{n}','offense_type':'parken','offense_at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':other,'amount_eur':30})
        check(fz['s']==201,f'Bußgeld angelegt {fz["s"]}')
        # Leitung sieht den Hinweis im Vorgang
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.evaluate(JS,['POST','/api/login',{'username':'ft.inhaber','password':PW}]); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+r['d']['id']); m.reload(); m.wait_for_selector('[data-repassign]',timeout=15000)
        tx=m.inner_text('[data-repassign]')
        check(NOTA[lang] in tx and own in tx and f'FT Kollege {n}' in tx,f'{lang} {w}px: Leitung sieht Zuordnung des Melders ({tx[:60]!r})')
        check(m.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: m.locator('[data-repassign]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/tausch_vorgang_{lang}_{w}.png')
        m.goto(B+'/#/fines/'+fz['d']['id']); m.reload(); m.wait_for_selector('input[name=cand]',timeout=15000)
        row=[x for x in m.locator('label.row').all_inner_texts() if f'FT Kollege {n}' in x]
        check(row and ELSE[lang] in row[0] and own in row[0],f'{lang} {w}px: Bußgeld-Kandidat nennt Kontrolle am anderen Fahrzeug ({(row or [""])[0][:90]!r})')
        check(m.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Bußgeld ohne Querscrollen')
        if SHOTS: m.locator('input[name=cand]').first.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/tausch_bussgeld_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: Leitung ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
