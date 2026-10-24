# [CLAUDE] UI-Test (Backlog 210, Teilagent „Versicherungsschaden mit Gutachter“): Versicherungsfall mit geplanter Besichtigung –
# Vorgangsansicht zeigt den Abschnitt „Gutachter“ mit „Gutachten ausstehend“, Formular hat die vier Felder, Liste „Versicherungsfälle“
# (24.10.2026, Backlog 218 ergänzt: Abschnitt „Unfallgegner“ mit Kennzeichen/Versicherer/Schadennummer und Kennzeichnung in der Liste;
#  Backlog 220: Abschnitt „Polizeiliche Anzeige“ beim zweiten Fall, Kennzeichnung in der Liste, Suche nach dem Aktenzeichen;
#  Backlog 221: Diebstahlsmeldung ohne Aktenzeichen zeigt Hinweis im Versicherungsfall)
# hat den Filter „Gutachten ausstehend“, Zeitleiste der Fahrzeugakte zeigt Besichtigung und Gutachten-Eingang. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':('Gutachter','Gutachten ausstehend'),'uk':('Експерт','Висновок очікується'),'en':('Appraiser','Appraisal pending')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ga.inhaber','display_name':'GA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ga.inhaber','password':PW})
    d=lambda n:(datetime.date.today()+datetime.timedelta(days=n)).isoformat()
    VID='VIN:WDB96340310778801'; api('POST','/api/vehicles',{'plate':'GA-UI 1','vin':'WDB96340310778801','kind':'lkw'})
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Unfall Heck','priority':'mittel','driveability':'fahrbereit','request_key':'ga-ui-1'})
    check(c['s']==201,f'Vorgang ({c["s"]})'); cid=c['d']['id']
    r=api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Vers AG','reported_on':d(-3),'evidence':'Schadenmeldung','appraiser':'Sachverständigenbüro Muster','appraisal_on':d(2)})
    check(r['s']==200,f'Versicherungsfall mit Besichtigung ({r["s"]} {r["d"]})')
    # zweiter Fall: Besichtigung gestern, Gutachten heute → Zeitleiste der Fahrzeugakte
    VID2='VIN:WDB96340310778802'; api('POST','/api/vehicles',{'plate':'GA-UI 2','vin':'WDB96340310778802','kind':'lkw'})
    c2=api('POST','/api/cases',{'vehicle_id':VID2,'description':'Unfall Seite','priority':'mittel','driveability':'fahrbereit','request_key':'ga-ui-2'})['d']['id']
    r2=api('PUT',f'/api/cases/{c2}/claim',{'insurer':'Vers AG','reported_on':d(-3),'evidence':'Schadenmeldung','appraiser':'SV Zeitleiste','appraisal_on':d(-1),'appraisal_received_on':d(0),'appraisal_net':'1234,50'})
    check(r2['s']==200,f'Versicherungsfall mit Gutachten ({r2["s"]} {r2["d"]})')
    TLX={'de':('Besichtigung am','Gutachten eingegangen am'),'uk':('Огляд','Висновок отримано'),'en':('Inspection on','Appraisal received on')}
    CO={'de':('Unfallgegner (Haftpflichtfall)','Unfallgegner erfasst'),'uk':('Друга сторона ДТП (відповідальність)','Другу сторону внесено'),'en':('Other party (liability claim)','Other party recorded')}
    # Unfallgegner nur beim ersten Fall (Backlog 218): Kennzeichen, Versicherer und deren Schadennummer laut Unfallbericht
    r3=api('PUT',f'/api/cases/{cid}/claim',{'opponent_plate':'DO-XY 987','opponent_insurer':'Gegner Vers AG','opponent_claim_no':'FR-2026/77'})
    check(r3['s']==200,f'Unfallgegner eingetragen ({r3["s"]} {r3["d"]})')
    # polizeiliche Anzeige nur beim zweiten Fall (Backlog 220)
    CP={'de':('Polizeiliche Anzeige','Anzeige erfasst'),'uk':('Заява до поліції','Заяву внесено'),'en':('Police report','Police report recorded')}
    r4=api('PUT',f'/api/cases/{c2}/claim',{'police_station':'Autobahnpolizei Muster','police_ref':'ST/0815/26','police_reported_on':d(-2)})
    check(r4['s']==200,f'Anzeige eingetragen ({r4["s"]} {r4["d"]})')
    # Backlog 221: Diebstahlsmeldung mit Versicherungsfall ohne Aktenzeichen → Hinweis im Versicherungsfall
    VID3='VIN:WDB96340310778803'; api('POST','/api/vehicles',{'plate':'GA-UI 3','vin':'WDB96340310778803','kind':'lkw'})
    c3=api('POST','/api/cases',{'vehicle_id':VID3,'description':'Diesel am Rastplatz abgezapft, Tankdeckel aufgebrochen','priority':'mittel','driveability':'fahrbereit','request_key':'ga-ui-3'})['d']['id']
    check(api('PUT',f'/api/cases/{c3}/claim',{'insurer':'Vers AG','reported_on':d(-1),'evidence':'Meldung Fahrer'})['s']==200,'Diebstahls-Versicherungsfall')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ga.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#clf',state='attached')
        body=q.inner_text('body')
        check(TXT[lang][0] in body and TXT[lang][1] in body,f'{lang} {w}px: Vorgang zeigt Gutachter und „ausstehend“')
        check(all(q.locator(f'#clf [name="{n}"]').count()==1 for n in ['appraiser','appraisal_on','appraisal_received_on','appraisal_net']),f'{lang} {w}px: vier Formularfelder')
        check(CO[lang][0] in body and 'DO-XY 987' in body and 'Gegner Vers AG' in body and 'FR-2026/77' in body,f'{lang} {w}px: Vorgang zeigt den Unfallgegner')
        check(all(q.locator(f'#clf [name="{n}"]').count()==1 for n in ['opponent_plate','opponent_insurer','opponent_claim_no']),f'{lang} {w}px: drei Felder zum Unfallgegner')
        check(all(q.locator(f'#clf [name="{n}"]').count()==1 for n in ['police_station','police_ref','police_reported_on']),f'{lang} {w}px: drei Felder zur Anzeige')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS and w==390:
            q.locator('#clf').evaluate('f=>f.closest("details").open=true'); q.locator('#clf').scroll_into_view_if_needed()
            q.screenshot(path=f'{SHOTS}/gutachter_fall_{lang}_{w}.png',full_page=True)
        q.goto(B+f'/#/cases/{c2}'); q.wait_for_function('()=>document.body.innerText.includes("Autobahnpolizei Muster")',timeout=15000)  # Hash-Wechsel: altes #clf ist noch da
        b2=q.inner_text('body')
        check(CP[lang][0] in b2 and 'Autobahnpolizei Muster' in b2 and 'ST/0815/26' in b2,f'{lang} {w}px: Vorgang zeigt die Anzeige')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang mit Anzeige ohne Querscrollen')
        if SHOTS and w==390:
            q.locator('#clf').evaluate('f=>f.closest("details").open=true'); q.locator('[name="police_station"]').scroll_into_view_if_needed()
            q.screenshot(path=f'{SHOTS}/anzeige_fall_{lang}_{w}.png',full_page=True)
        check(q.locator('#cptheft').count()==0,f'{lang} {w}px: kein Diebstahlshinweis beim Unfall')
        q.goto(B+f'/#/cases/{c3}'); q.wait_for_function('()=>document.body.innerText.includes("abgezapft")',timeout=15000)
        check(q.locator('#cptheft').count()==1 and CP[lang][0] in q.locator('#cptheft').inner_text(),f'{lang} {w}px: Diebstahlsmeldung ohne Aktenzeichen zeigt Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Diebstahlsfall ohne Querscrollen')
        if SHOTS and w==390: q.locator('#cptheft').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/anzeige_hinweis_{lang}_{w}.png')
        q.goto(B+'/#/claims'); q.wait_for_selector('[data-clf="alle"]')
        q.locator('[data-clf="alle"]').click(); q.wait_for_timeout(400)
        check(q.inner_text('body').count(CO[lang][1])==1,f'{lang} {w}px: Liste kennzeichnet genau einen Haftpflichtfall')
        check(q.inner_text('body').count(CP[lang][1])==1,f'{lang} {w}px: Liste kennzeichnet genau einen Fall mit Anzeige')
        q.fill('#clq','ST/0815'); q.wait_for_timeout(600)
        check(q.locator('a.row').count()==1 and CP[lang][1] in q.inner_text('body'),f'{lang} {w}px: Suche findet das Aktenzeichen')
        # Suche nach der Schadennummer der Gegenseite (Backlog 219): nur der Haftpflichtfall bleibt stehen
        q.fill('#clq','FR-2026/77'); q.wait_for_timeout(600)
        check(q.locator('a.row').count()==1 and CO[lang][1] in q.inner_text('body'),f'{lang} {w}px: Suche findet den Haftpflichtfall')
        check(q.locator('#clqinfo').count()==1,f'{lang} {w}px: Trefferzeile sichtbar')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/unfallgegner_suche_{lang}_{w}.png',full_page=True)
        q.fill('#clq','gibt-es-nicht'); q.wait_for_timeout(600)
        check(q.locator('a.row').count()==0,f'{lang} {w}px: Suche ohne Treffer zeigt keine Zeile')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Suche ohne Querscrollen')
        q.fill('#clq',''); q.wait_for_timeout(600)
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/unfallgegner_liste_{lang}_{w}.png',full_page=True)
        q.wait_for_selector('[data-clf="gutachten"]')
        q.locator('[data-clf="gutachten"]').click(); q.wait_for_timeout(400)
        lb=q.inner_text('body')
        check(q.locator('a.row').count()==1 and TXT[lang][1] in lb,f'{lang} {w}px: Filter „ausstehend“ zeigt den Fall')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Liste ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/gutachter_liste_{lang}_{w}.png',full_page=True)
        q.goto(B+f'/#/vehicles/{VID2}/timeline?f=claim'); q.wait_for_timeout(1500)
        tb=q.inner_text('body')
        check(all(x in tb for x in TLX[lang]) and 'SV Zeitleiste' in tb,f'{lang} {w}px: Zeitleiste zeigt Besichtigung und Gutachten')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Zeitleiste ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/gutachter_zeitleiste_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
