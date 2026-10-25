# [CLAUDE] UI-Test (25.10.2026, Backlog 293, Blickwinkel „Wildunfall nachts auf der Landstraße“): Meldeformular zeigt bei Wildunfall
# vier eigene Schritte statt der allgemeinen Unfall-Hinweise; „Unfall beim Rangieren“ zeigt weiter die Unfall-Hinweise;
# Vorgang zeigt der Leitung im Versicherungsabschnitt die Erinnerung an die Wildunfallbescheinigung; Hilfe enthält den Abschnitt.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Wildunfall: Reh angefahren, Scheinwerfer kaputt','uk':'Збив косулю, фара розбита','en':'Hit a deer, headlight broken'}
ACC={'de':'Unfall beim Rangieren','uk':'ДТП під час маневрування','en':'Accident while manoeuvring'}
HT={'de':'Wildunfall','uk':'ДТП з дикою твариною','en':'Collision with a wild animal'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wu.inhaber','display_name':'WU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wu.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM73' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nWU-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wu.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#wild') and not vis('#acc'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',ACC[lang]); q.wait_for_timeout(100)
        check(vis('#acc') and not vis('#wild'),f'{lang}/{w}: „{ACC[lang]}“ → allgemeine Unfall-Hinweise')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#wild') and not vis('#acc'),f'{lang}/{w}: Wildunfall-Hinweis statt Unfall-Hinweis')
        tx=q.inner_text('#wild')
        check('110' in tx and '112' in tx and tx.count('\n')>=4,f'{lang}/{w}: Titel und 4 Schritte mit 110/112')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#wild').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wildunfall-{lang}-{w}.png')
        q.fill('#d','')
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':TXT[lang],'priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})
        check(r['s'] in (200,201),f'{lang}/{w}: Vorgang angelegt'); cid=r['d']['id']
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-claimwild]',timeout=15000)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Hinweis im Versicherungsabschnitt')
        if SHOTS and w==390: q.locator('[data-claimwild]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wildunfall-vorgang-{lang}.png')
        q.goto(B+'/#/help?s=wild'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_wild' not in bt,f'{lang}/{w}: Hilfe mit Wildunfall-Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
