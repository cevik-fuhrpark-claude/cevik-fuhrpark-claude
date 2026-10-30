# [CLAUDE] UI-Test (30.10.2026, Backlog 633, Blickwinkel „Diebstahl über Nacht auf dem Rastplatz“): Lkw und Auflieger je ein Vorgang, Versicherungsfall
# mit Polizeiangaben am Lkw → Vorgang am Auflieger nennt unter „Zum Fahrzeug“ die Zugmaschine mit offenem Vorgang und Versicherungsfall; im eigenen
# Versicherungsfall „Polizeiangaben aus … übernehmen“ füllt Dienststelle/Aktenzeichen/Datum; gleiche Schadennummer → Hinweis.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gp.inhaber','display_name':'GP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'gp.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['dr.inhaber','ex.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000; n=0; today=api('GET','/api/meta')['d'].get('today') or time.strftime('%Y-%m-%d')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; lk=f'GP-LK {R%900}{n}'; ah=f'GP-AH {R%900}{n}'; vl=f'WDB97{R:05d}L{n:04d}00'; va=f'WDB97{R:05d}A{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':ah,'vin':va,'kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),'Auflieger')
        check(api('POST','/api/vehicles',{'plate':lk,'vin':vl,'kind':'lkw','site':'Dortmund','trailer_plate':ah})['s'] in (200,201),'Lkw mit Auflieger')
        t=api('POST','/api/cases',{'vehicle_id':'VIN:'+vl,'description':'Diesel abgezapft, Tankdeckel aufgebrochen','priority':'mittel','driveability':'fahrbereit','request_key':f'gp-t-{R}-{n}'})['d']['id']
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':'Plane aufgeschlitzt, Ladung fehlt','priority':'mittel','driveability':'fahrbereit','request_key':f'gp-r-{R}-{n}'})['d']['id']
        no=f'SN-{R}-{n}'
        check(api('PUT',f'/api/cases/{t}/claim',{'insurer':'Teilkasko Test AG','claim_no':no,'reported_on':today,'evidence':'Schadenmeldung','police_station':'PI Bielefeld','police_ref':f'AZ {n}/26','police_reported_on':today})['s']==200,'Versicherungsfall Lkw')
        check(api('PUT',f'/api/cases/{r}/claim',{'insurer':'Teilkasko Test AG','claim_no':no.lower(),'reported_on':today,'evidence':'Schadenmeldung'})['s']==200,'Versicherungsfall Auflieger')
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+r); m.reload(); m.wait_for_selector('[data-vicoupled]',timeout=15000)
        tx=m.inner_text('[data-vicoupled]')
        check(lk in m.inner_text('.vinfo') and 'Teilkasko Test AG' in tx,f'{lang} {w}px: Auflieger-Vorgang nennt Zugmaschine {lk} mit Vorgang und Versicherungsfall')
        check(m.locator('[data-vicoupled] a[href^="#/cases/"]').count()==1,f'{lang} {w}px: Link zum Lkw-Vorgang')
        if SHOTS: m.locator('[data-vicoupled]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/gespann_{lang}_{w}.png')
        m.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
        check(m.locator('[data-claimsameno]').count()==1,f'{lang} {w}px: Hinweis gleiche Schadennummer')
        m.click('[data-cppull]')
        check(m.input_value('input[name=police_ref]')==f'AZ {n}/26' and m.input_value('input[name=police_station]')=='PI Bielefeld' and m.input_value('input[name=police_reported_on]')==today,f'{lang} {w}px: Polizeiangaben übernommen')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: m.locator('[data-cppull]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/gespann_polizei_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
