# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 900, Blickwinkel „Bußgeld/Mautnachforderung aus dem Ausland“):
# Ausländische Behörden schreiben das deutsche Kennzeichen mit Länderkennung („D SZ-YC 5501“, „SZYC5501 (D)“). Vorher: „Fahrzeug unbekannt“,
# keine Fahrerermittlung. Geprüft: Erfassung über das Formular ordnet das Fahrzeug zu, Detail zeigt den Hinweis „mit Länderkennung“
# (#fcountry) statt „früheres Kennzeichen“ (#fformer), Hinweis unter Kennzeichen/Betrag im Formular (#fplh, Euro nur), Gegenprobe ohne
# Trennzeichen („DSZYC…“ bleibt unbekannt); kein Querscrollen, keine Skriptfehler; DE 390/UK 820/EN 1366. Braucht den Dev-Server.
import os, uuid, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
HINT={'de':'Länderkennung','uk':'кодом країни','en':'country code'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ba.inhaber','display_name':'BA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='ba.inhaber' if s['s']==200 else None
    if not own:
        for u in ['ba.inhaber','sv.inhaber','mtn.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15BAZ2HM99'+sfx; pl=f'BA-Q {sfx}'
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{pl};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    for i,(lang,(w,h)) in enumerate([('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/fines'); q.wait_for_selector('#nf',state='attached'); q.wait_for_timeout(500)
        q.click('details:has(#nf) > summary')
        check(q.locator('#fplh').is_visible() and len(q.inner_text('#fplh'))>20,f'{lang}/{w}: Hinweis Länderkennung/Euro im Formular')
        q.fill('#nf [name=authority]','ANTAI Rennes'); q.fill('#nf [name=reference]',f'FR-{sfx}-{i}')
        q.fill('#nf [name=offense_at]',time.strftime('%Y-%m-%dT08:30',time.localtime(time.time()-86400)))
        q.fill('#nf [name=plate_in_letter]',['D '+pl, pl.replace('-','').replace(' ','')+' (D)', 'DE-'+pl][i])
        q.click('#nf button.btn'); q.wait_for_timeout(1500)
        check('#/fines/' in q.url,f'{lang}/{w}: Schreiben angelegt')
        check(q.locator('#fcountry').count()==1 and HINT[lang] in q.inner_text('#fcountry') and q.locator('#fformer').count()==0,f'{lang}/{w}: Hinweis „mit Länderkennung“, nicht „früheres Kennzeichen“')
        check(q.locator('#fvu').count()==0,f'{lang}/{w}: Fahrzeug zugeordnet (kein „unbekannt“)')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ba-{lang}-{w}.png',full_page=True)
        q.goto(B+'/#/search'); q.wait_for_selector('#gq'); q.fill('#gq','D '+pl); q.wait_for_timeout(1300)
        check(pl in q.inner_text('#gr') and q.locator('#gr a[href^="#/vehicles/"]').count()>=1,f'{lang}/{w}: Suche „D {pl}“ findet das Fahrzeug (Backlog 902)')
        check(not errs,f'{lang}/{w}: ohne Skriptfehler {errs[:2]}'); ctx.close()
    # Gegenprobe: ohne Trennzeichen keine Vermutung
    r=api('POST','/api/fines',{'kind':'anhoerung','authority':'ANTAI Rennes','reference':f'FR-{sfx}-x','offense_type':'geschwindigkeit','offense_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(time.time()-86400)),'plate_in_letter':'D'+pl.replace('-','').replace(' ','')})
    check(r['s']==201 and r['d']['vehicle_matched'] is False,'Gegenprobe: „DBAQ…“ ohne Trennzeichen bleibt unbekannt')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK – Bußgeld aus dem Ausland (Länderkennung)')
raise SystemExit(1 if fails else 0)
