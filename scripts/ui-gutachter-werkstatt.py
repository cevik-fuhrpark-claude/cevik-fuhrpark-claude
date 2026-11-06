# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 903, Blickwinkel „Versicherer schickt einen Gutachter – Lkw steht schon in der Werkstatt“):
# Die Werkstatt sah eine geplante Besichtigung nicht (Versicherungsfall nur Leitung) und konnte den Schaden vorher reparieren.
# Geprüft: Werkstatt sieht im Vorgang den Hinweis mit Datum (#[data-apwcase]), im Formular „Reparatur beginnen“ ([data-apwform]) und auf
# der Werkstatt-Tafel/Liste ([data-apwlist]); weder Gutachter noch Versicherer im Text; Leitung sieht ihren Hinweis; kein Querscrollen,
# keine Skriptfehler; DE 390 / UK 820 / EN 1366. Braucht den Dev-Server.
# Backlog 1084/1085 (06.11.2026, Blickwinkel „Unfallschaden: Gutachter muss vor der Reparatur besichtigen“): Dispo-Tafel zeigt die Gruppe
# „Gutachter-Besichtigung geplant“ (#dapw) auch für einen gemeldeten, eingeschränkt fahrenden Lkw; Leitung sieht im Formular
# „Reparatur freigeben“ den Hinweis ([data-apwform]).
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
TITLE={'de':'gutachter','uk':'експерт','en':'appraiser'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gw.inhaber','display_name':'GW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own=None
    for un in ['gw.inhaber','ba.inhaber','ae.inhaber','ab.inhaber','ws.inhaber','ui.inhaber','inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: own=un; break
    check(own,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    u=api('POST','/api/users',{'username':f'gw.ws{R}','display_name':'GW Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    wctx=br.new_context(); w=wctx.new_page(); w.goto(B)
    w.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    check(w.evaluate(JS,['POST','/api/login',{'username':f'gw.ws{R}','password':PW}])['s']==200,'Werkstatt angemeldet')
    def cmd(page,cid,action,payload=None,note=None):
        global n; n+=1
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'gw-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    vin=f'WDB97{R:05d}G000903'; pl=f'GW-T {R%900}3'
    check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    day=lambda k: time.strftime('%Y-%m-%d',time.localtime(time.time()+k*86400))
    cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Unfall: Seitenschaden rechts, Plane eingerissen (Test Gutachter)','priority':'mittel','driveability':'fahrbereit','request_key':f'gw-{R}'})['d']['id']
    check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Seitenschaden')==200 and cmd(w,cid,'acknowledge')==200,'Auftrag an Werkstatt')
    r=api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Versicherung GW (Test)','reported_on':day(-1),'evidence':'Schadenmeldung (Test)','appraiser':'Büro Geheim (Test)','appraisal_on':day(2),'expected_updated_at':None})
    check(r['s']==200,f'Versicherungsfall mit Besichtigung {r}')
    for lang,(vw,vh) in [('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]:
        w.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        ctx=br.new_context(viewport={'width':vw,'height':vh}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'gw.ws{R}','password':PW}])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('[data-apwcase]',timeout=15000)
        t=q.inner_text('[data-apwcase]'); body=q.inner_text('body')
        check(TITLE[lang] in t.lower(),f'{lang}/{vw}: Hinweis im Vorgang ({t[:60]})')
        check('Geheim' not in body and 'Versicherung GW' not in body,f'{lang}/{vw}: ohne Gutachter/Versicherer')
        q.click('button[data-act="start_repair"]'); q.wait_for_selector('#af [data-apwform]',timeout=5000)
        check(q.locator('#af [data-apwform]').is_visible(),f'{lang}/{vw}: Hinweis im Formular „Reparatur beginnen“')
        check(q.evaluate(noscroll),f'{lang}/{vw}: Vorgang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/gw-case-{lang}-{vw}.png',full_page=True)
        q.goto(B+'/#/'); q.wait_for_timeout(1500)
        q.goto(B+'/#/cases'); q.wait_for_selector(f'a[href="#/cases/{cid}"]',timeout=15000)
        check(q.locator(f'a[href="#/cases/{cid}"] [data-apwlist]').count()==1,f'{lang}/{vw}: Liste nennt die Besichtigung')
        check(q.evaluate(noscroll),f'{lang}/{vw}: Liste ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/gw-list-{lang}-{vw}.png',full_page=False)
        check(not errs,f'{lang}/{vw}: ohne Skriptfehler {errs[:2]}'); ctx.close()
    # Leitung: eigener Hinweis
    m=br.new_context(viewport={'width':1366,'height':900}).new_page(); m.goto(B); m.evaluate(JS,['POST','/api/login',{'username':own,'password':PW}]); m.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    m.goto(B+'/#/cases/'+cid); m.wait_for_selector('[data-apwcase]',timeout=15000)
    check('nur dieses Datum' in m.inner_text('[data-apwcase]'),'Leitung: Hinweis „Werkstatt und Disposition sehen nur dieses Datum“')
    # Backlog 1085: gemeldeter, eingeschränkt fahrender Lkw mit Besichtigung morgen → Dispo-Tafel
    vin2=f'WDB97{R:05d}G001085'; pl2=f'GW-T {R%900}5'
    check(api('POST','/api/vehicles',{'plate':pl2,'vin':vin2,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug 2 angelegt')
    cid2=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin2,'description':'Unfall: Stoßfänger eingedrückt, fährt noch (Test 1085)','priority':'mittel','driveability':'eingeschraenkt','request_key':f'gw2-{R}'})['d']['id']
    check(api('PUT',f'/api/cases/{cid2}/claim',{'insurer':'Versicherung GW2 (Test)','reported_on':day(0),'evidence':'Test','appraisal_on':day(1),'expected_updated_at':None})['s']==200,'Besichtigung morgen')
    du=api('POST','/api/users',{'username':f'gw.dispo{R}','display_name':'GW Dispo','role':'dispatch','environment':envn})
    dctx=br.new_context(); dp=dctx.new_page(); dp.goto(B); dp.evaluate(JS,['POST','/api/invite/accept',{'token':du['d']['invite_token'],'password':PW}]); dctx.close()
    DT={'de':'Gutachter','uk':'експерт','en':'Appraiser'}
    for lang,(vw,vh) in [('de',(390,844)),('uk',(820,1180)),('en',(1366,900))]:
        ctx=br.new_context(viewport={'width':vw,'height':vh}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'gw.dispo{R}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dapw',timeout=15000)
        check(DT[lang].lower() in q.inner_text('#dapw').lower(),f'{lang}/{vw}: Dispo-Gruppe „Gutachter-Besichtigung geplant“')
        row=q.locator(f'a[data-dapw][href="#/cases/{cid2}"]')
        check(row.count()==1 and row.locator('[data-tomorrow]').count()==1,f'{lang}/{vw}: Zeile mit „morgen“')
        check('GW2' not in q.inner_text('body'),f'{lang}/{vw}: ohne Versicherer')
        check(q.evaluate(noscroll),f'{lang}/{vw}: Dispo ohne Querscrollen')
        if SHOTS: row.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gw-dispo-{lang}-{vw}.png',full_page=False)
        check(not errs,f'{lang}/{vw}: Dispo ohne Skriptfehler {errs[:2]}'); ctx.close()
    m.goto(B+'/#/cases/'+cid2); m.wait_for_selector('button[data-act="approve_repair"]',timeout=15000)
    m.click('button[data-act="approve_repair"]'); m.wait_for_selector('#af [data-apwform]',timeout=5000)
    check('Versicherer' in m.inner_text('#af [data-apwform]'),'Leitung: Hinweis im Formular „Reparatur freigeben“')
    if SHOTS: m.screenshot(path=f'{SHOTS}/gw-approve-de-1366.png',full_page=False)
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK – Gutachter-Besichtigung für die Werkstatt')
raise SystemExit(1 if fails else 0)
