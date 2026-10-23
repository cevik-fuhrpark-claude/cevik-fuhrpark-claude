# [CLAUDE] UI-Test (Backlog 210, Teilagent „Versicherungsschaden mit Gutachter“): Versicherungsfall mit geplanter Besichtigung –
# Vorgangsansicht zeigt den Abschnitt „Gutachter“ mit „Gutachten ausstehend“, Formular hat die vier Felder, Liste „Versicherungsfälle“
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
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ga.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#clf',state='attached')
        body=q.inner_text('body')
        check(TXT[lang][0] in body and TXT[lang][1] in body,f'{lang} {w}px: Vorgang zeigt Gutachter und „ausstehend“')
        check(all(q.locator(f'#clf [name="{n}"]').count()==1 for n in ['appraiser','appraisal_on','appraisal_received_on','appraisal_net']),f'{lang} {w}px: vier Formularfelder')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS and w==390:
            q.locator('#clf').evaluate('f=>f.closest("details").open=true'); q.locator('#clf').scroll_into_view_if_needed()
            q.screenshot(path=f'{SHOTS}/gutachter_fall_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/claims'); q.wait_for_selector('[data-clf="gutachten"]')
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
