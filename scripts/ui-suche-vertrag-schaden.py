# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 899, Blickwinkel „Leasinggesellschaft/Versicherer ruft an und nennt nur die Vertrags- bzw. Schadennummer“):
# Die globale Suche findet für Inhaber/Fuhrparkleitung jetzt auch Verträge (Vertragsnummer – Leerzeichen/Bindestrich/Punkt egal –, Vertragspartner)
# und Versicherungsfälle (Schadennummer, Schadennummer der Gegenseite, Versicherer – Server-Suche wie die Versicherungsliste).
# Geprüft: Treffer „Verträge“ (#gcontracts) führt zur Fahrzeugakte, „Versicherungsfälle“ (#gclaims) zum Vorgang; Nummer anders geschrieben
# („lv 1234 77a“) wird gefunden; Werkstatt sieht keine dieser Bereiche und bekommt keinen Fehler; Hinweistext DE/UK/EN nennt die neuen Bereiche;
# kein Querscrollen; 390/820/1366. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sv.inhaber','display_name':'SV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='sv.inhaber' if s['s']==200 else None
    if not own:
        for u in ['sv.inhaber','mtn.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM99'+sfx; pl=f'SV-K {sfx}'
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{pl};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    vid='VIN:'+vin; KN=f'LV-{sfx}-77A'; SN=f'SN/{sfx}/0815'; GN=f'GS{sfx}4242'
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    check(api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':f'Suchleasing {sfx} GmbH','evidence':'Vertrag','contract_no':KN,'start_date':'2026-01-01','end_date':'2029-12-31'})['s'] in (200,201),'Vertrag')
    c=api('POST','/api/cases',{'vehicle_id':vid,'description':'Heckschaden (Test Suche Schadennummer)','priority':'mittel','driveability':'eingeschraenkt','request_key':'sv-'+sfx})
    check(c['s']==201,'Vorgang'); cid=c['d']['id']
    check(api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Suchversicherung AG','claim_no':SN,'opponent_insurer':'Gegner AG','opponent_claim_no':GN,'reported_on':time.strftime('%Y-%m-%d'),'evidence':'Schadenmeldung'})['s']==200,'Versicherungsfall')
    wu=f'sv.werkstatt{sfx}'; r=api('POST','/api/users',{'username':wu,'display_name':'SV Werkstatt','role':'workshop','environment':envn,'language':'de','workshop_site':'DORTMUND'})
    if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
        c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
    else: wu=None
    check(wu,'Werkstattkonto')
    def page(user,w,h,lang):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None]); return ctx,q,errs
    def search(q,txt):
        q.goto(B+'/#/search'); q.wait_for_selector('#gq'); q.fill('#gq',txt); q.wait_for_timeout(1300)
    HINT={'de':'Vertragsnummer','uk':'номер договору','en':'contract number'}
    for lang,(w,h) in [('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]:
        ctx,q,errs=page(own,w,h,lang)
        q.goto(B+'/#/search'); q.wait_for_selector('#gq'); q.wait_for_timeout(600)
        check(HINT[lang] in q.inner_text('#gr'),f'{lang}/{w}: Hinweis nennt Verträge/Versicherungsfälle')
        search(q,f'lv {sfx} 77a')
        check(q.locator('#gcontracts a').count()==1 and KN in q.inner_text('#gcontracts'),f'{lang}/{w}: Vertrag über anders geschriebene Vertragsnummer gefunden')
        check(q.locator('#gcontracts [translate="no"]').count()>=1,f'{lang}/{w}: Vertragsnummer translate="no"')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sv-{lang}-{w}-vertrag.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: ohne Querscrollen')
        q.click('#gcontracts a'); q.wait_for_timeout(1200)
        check('#/vehicles/' in q.url and KN in q.inner_text('body'),f'{lang}/{w}: Treffer öffnet die Fahrzeugakte mit dem Vertrag')
        search(q,SN)
        check(q.locator('#gclaims a').count()==1 and SN in q.inner_text('#gclaims'),f'{lang}/{w}: Versicherungsfall über Schadennummer gefunden')
        search(q,GN)
        check(q.locator('#gclaims a').count()==1 and GN in q.inner_text('#gclaims'),f'{lang}/{w}: Versicherungsfall über Schadennummer der Gegenseite gefunden')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sv-{lang}-{w}-schaden.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: ohne Querscrollen (Schaden)')
        q.click('#gclaims a'); q.wait_for_timeout(1200)
        check(cid in q.url,f'{lang}/{w}: Treffer öffnet den Vorgang')
        search(q,f'Suchleasing {sfx}')
        check(q.locator('#gcontracts a').count()==1,f'{lang}/{w}: Vertrag über Vertragspartner gefunden')
        check(not errs,f'{lang}/{w}: ohne Skriptfehler {errs[:2]}')
        ctx.close()
    if wu:
        ctx,q,errs=page(wu,390,844,'de'); search(q,KN)
        check(q.locator('#gcontracts').count()==0 and q.locator('#gclaims').count()==0 and q.locator('#gr .alert').count()==0,'Werkstatt: keine Verträge/Versicherungsfälle, kein Fehler')
        check(not errs,f'Werkstatt ohne Skriptfehler {errs[:2]}'); ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK – Suche nach Vertrags-/Schadennummer')
raise SystemExit(1 if fails else 0)
