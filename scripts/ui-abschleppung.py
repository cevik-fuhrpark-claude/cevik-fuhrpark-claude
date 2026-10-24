# [CLAUDE] UI-Test (24.10.2026, Backlog 222, Teilagent „Fahrzeug wird abgeschleppt – wer sieht was?“): Leitung trägt im Vorgang über
# „Standort / Abschleppung“ Standort, Abschleppdienst und Datum ein (Formular in der Oberfläche); Vorgang zeigt „Standort des Fahrzeugs“
# mit Chip „abgeschleppt“, Verlauf alt → neu; Vorgangsliste markiert „abgeschleppt“; Disposition sieht unter „Nicht einplanen“ den Standort
# und hat keinen Knopf. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ACT={'de':'Standort / Abschleppung','uk':'Місцезнаходження / евакуація','en':'Location / towing'}
TITLE={'de':'Standort des Fahrzeugs','uk':'Де стоїть транспорт','en':'Vehicle location'}
CHIP={'de':'abgeschleppt','uk':'евакуйовано','en':'towed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=uuid.uuid4().hex[:4].upper()
    u=api('POST','/api/users',{'username':'as.dispo.'+tag.lower(),'display_name':'AS Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    vin='WDB9634031A'+str(uuid.uuid4().int)[:6]; plate='AS-T '+str(uuid.uuid4().int)[:3]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Motorschaden auf der A1, Fahrzeug abgeschleppt','priority':'kritisch','driveability':'nicht_fahrbereit','location_note':'A1 Rastplatz','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    first=True
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="set_vehicle_location"]',timeout=15000)
        btn=q.locator('button[data-act="set_vehicle_location"]')
        check(btn.inner_text().strip()==ACT[lang],f'{lang}/{w}: Knopf „{ACT[lang]}“')
        if first:
            # einmal über das Formular eintragen (Datum mit Abschleppdienst)
            btn.click(); q.wait_for_selector('#af input[name=vehicle_location]',timeout=5000)
            check(q.locator('#vlhint').count()==1,f'{lang}/{w}: Hinweis im Formular')
            q.fill('#af input[name=vehicle_location]','Hof Abschlepp Muster, Gewerbestr. 1')
            q.fill('#af input[name=tow_service]','Abschlepp Muster GmbH')
            q.fill('#af input[name=towed_on]',q.evaluate("document.querySelector('#af input[name=towed_on]').max"))
            if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/abschlepp-form-{lang}-{w}.png')
            q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('#vehloc',timeout=10000); first=False
        else:
            q.wait_for_selector('#vehloc',timeout=10000)
        txt=q.inner_text('#vehloc')
        check('Hof Abschlepp Muster' in txt and 'Abschlepp Muster GmbH' in txt and CHIP[lang] in txt,f'{lang}/{w}: Vorgang zeigt Standort, Dienst, Chip ({txt[:60]!r})')
        check(TITLE[lang] in q.inner_text('dl.kv'),f'{lang}/{w}: Bezeichnung „{TITLE[lang]}“')
        hist=q.inner_text('ol.timeline')
        check(ACT[lang] in hist and 'Abschlepp Muster GmbH' in hist,f'{lang}/{w}: Verlauf mit Eintrag')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('#vehloc').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/abschlepp-vorgang-{lang}-{w}.png')
        q.goto(B+'/#/cases'); q.wait_for_selector('.list a.row',timeout=15000); q.wait_for_timeout(300)
        row=[x for x in q.locator('.list a.row').all_inner_texts() if plate in x]
        check(row and CHIP[lang] in row[0],f'{lang}/{w}: Vorgangsliste markiert „{CHIP[lang]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Liste ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler (Leitung) {errs[:1]}')
        ctx.close()
        # Disposition: „Nicht einplanen“ mit Standort, Vorgang ohne Knopf
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.dispo.'+tag.lower(),'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-vloc]',timeout=15000)
        vl=q.inner_text('[data-vloc]')
        check(CHIP[lang] in vl and 'Hof Abschlepp Muster' in vl,f'{lang}/{w}: Disposition „Nicht einplanen“ zeigt {vl!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Dispo ohne Querscrollen')
        if SHOTS and w==390: q.locator('[data-vloc]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/abschlepp-dispo-{lang}.png')
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('#vehloc',timeout=15000)
        check(q.locator('button[data-act="set_vehicle_location"]').count()==0,f'{lang}/{w}: Disposition ohne Knopf')
        q.goto(B+'/#/help?s=dispo'); q.wait_for_timeout(800)
        check(CHIP[lang] in q.evaluate('document.body.innerText'),f'{lang}/{w}: Hilfe Disposition nennt „{CHIP[lang]}“')
        check(not errs,f'{lang}/{w}: keine Skriptfehler (Disposition) {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
