# [CLAUDE] UI-Test (25.10.2026, Backlog 291, Blickwinkel „Steinschlag in der Windschutzscheibe“): Meldeformular zeigt bei Glasschaden
# vier Schritte (Fotos mit Größenvergleich, Lage/Größe, Weiterfahrt klären, früh melden); „Bremsscheibe gerissen“ zeigt nichts;
# Vorgang zeigt der Leitung im Versicherungsabschnitt den Hinweis nur ohne Versicherungsfall; Hilfe enthält den Abschnitt.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Steinschlag in der Windschutzscheibe, unten rechts','uk':'Скол на лобовому склі знизу справа','en':'Stone chip on the windscreen, bottom right'}
NEG={'de':'Bremsscheibe gerissen','uk':'Дзеркало зламано','en':'Mirror glass broken'}
HT={'de':'Glasschaden (Steinschlag, Riss)','uk':'Пошкодження скла (скол, тріщина)','en':'Glass damage (stone chip, crack)'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gs.inhaber','display_name':'GS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM72' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nGS-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gs.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#glass'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NEG[lang]); q.wait_for_timeout(100)
        check(not vis('#glass'),f'{lang}/{w}: „{NEG[lang]}“ ohne Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#glass') and not vis('#theft') and not vis('#acc'),f'{lang}/{w}: Glasschaden-Hinweis sichtbar (nur dieser)')
        tx=q.inner_text('#glass')
        check(tx.count('\n')>=4,f'{lang}/{w}: Titel und 4 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#glass').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/glasschaden-{lang}-{w}.png')
        q.fill('#d','')
        # Vorgang: Hinweis im Versicherungsabschnitt nur ohne Versicherungsfall
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':TXT[lang],'priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        check(r['s'] in (200,201),f'{lang}/{w}: Vorgang angelegt'); cid=r['d']['id']
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-claimglass]',timeout=15000)
        check('{b}' not in q.inner_text('[data-claimglass]') and q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Hinweis im Versicherungsabschnitt')
        if SHOTS and w==390: q.locator('[data-claimglass]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/glasschaden-vorgang-{lang}.png')
        check(api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Test-Versicherung','reported_on':datetime.date.today().isoformat(),'status':'gemeldet','evidence':'Mail'})['s']==200,f'{lang}/{w}: Versicherungsfall erfasst')
        q.reload(); q.wait_for_selector('#clf',state='attached',timeout=15000); q.wait_for_timeout(200)
        check(q.locator('[data-claimglass]').count()==0,f'{lang}/{w}: mit Versicherungsfall kein Hinweis')
        q.goto(B+'/#/help?s=glass'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_glass' not in bt,f'{lang}/{w}: Hilfe mit Glasschaden-Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
