# [CLAUDE] UI-Test (17.10.2026, Backlog 88): Halb ausgefülltes Aktionsformular im Vorgang („Teil erfassen“) bleibt beim Neuaufbau nach einer
# anderen Aktion (Kommentar) offen samt Eingaben; nach dem Absenden bzw. „Abbrechen“ ist es zu; auf einer anderen Seite nicht wieder offen.
# Vertragsformular bei Zähler-Rücksprung mit eigenem Häkchen (Migration 0058). DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'af.inhaber','display_name':'AF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'af.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310775001'; api('POST','/api/vehicles',{'plate':'AF-AB 1','vin':'WDB96340310775001','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'af.ws','display_name':'AF Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wsapi=lambda m,pa,b=None: pg.evaluate(JS,[m,pa,b])
    # Vertrag mit Zähler-Rücksprung nach Vertragsbeginn: Formular zeigt das Häkchen
    api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'AF-Leasing','evidence':'Vertrag','km_allowance':100000,'start_km':1000,'start_date':'2026-01-01'})
    api('POST',f'/api/vehicles/{vid}/odometer',{'km':90000,'measured_on':'2026-09-01'})
    api('POST',f'/api/vehicles/{vid}/odometer',{'km':500,'note':'Tachotausch'})
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,w)
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'AF Bremse {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'af-{os.getpid()}-{n}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'ap-{os.getpid()}-{n}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
        wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'st-{os.getpid()}-{n}','expected_version':v})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'af.ws','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-act=add_part]',timeout=15000)
        q.click('[data-act=add_part]'); q.wait_for_selector('#af')
        q.fill('#af input[name=name]','Bremsscheibe vorne'); q.fill('#af input[name=part_number]','A-123')
        q.fill('#ct','Teil bestellt, kommt morgen'); q.click('#cf button.btn'); q.wait_for_timeout(1500)
        check(q.locator('#af').count()==1,'Teilformular nach Kommentar noch offen')
        check(q.locator('#af input[name=name]').count()==1 and q.input_value('#af input[name=name]')=='Bremsscheibe vorne','Eingaben erhalten')
        check(q.input_value('#ct')=='','Kommentarfeld geleert (gesendet)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/aktionsformular_{lang}_{w}.png')
        q.fill('#af input[name=quantity]','1') if q.locator('#af input[name=quantity]').count() else None
        q.click('#af button.btn'); q.wait_for_timeout(1500)
        check(q.locator('#af').count()==0,'nach dem Absenden geschlossen')
        parts=[x for x in q.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d'].get('parts',[]) if x['name']=='Bremsscheibe vorne']
        check(len(parts)==1,'Teil einmal gespeichert')
        q.click('[data-act=add_part]'); q.wait_for_selector('#af'); q.click('#ac')
        q.fill('#ct','Noch ein Kommentar'); q.click('#cf button.btn'); q.wait_for_timeout(1500)
        check(q.locator('#af').count()==0,'nach „Abbrechen“ nicht wieder offen')
        q.click('[data-act=add_part]'); q.wait_for_selector('#af'); q.goto(B+'/#/'); q.wait_for_timeout(800); q.goto(B+f'/#/cases/{cid}'); q.wait_for_timeout(1500)
        check(q.locator('#af').count()==0,'andere Seite dazwischen: nicht wieder offen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
        # Vertrag (Inhaber, Sprache): Häkchen statt verdecktem Feld
        api('PATCH','/api/me',{'language':lang})
        cx=br.new_context(viewport={'width':w,'height':h}); r=cx.new_page(); r.goto(B); r.evaluate(JS,['POST','/api/login',{'username':'af.inhaber','password':PW}])
        r.goto(B+f'/#/vehicles/{vid}'); r.wait_for_timeout(1800)
        check(r.locator('[data-ctedit] input[type=checkbox][name=confirm_km_basis]').count()==1,'Vertrag: Häkchen km-Grundlage')
        check(r.locator('[data-ctedit] input[type=hidden][name=confirm_km_basis]').count()==0,'kein verdecktes Feld')
        cx.close()
    api('PATCH','/api/me',{'language':'de'})
    c.close(); br.close()
print('Aktionsformular/Vertrag: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
