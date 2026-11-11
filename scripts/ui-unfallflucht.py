# [CLAUDE] UI-Test (30.10.2026, Backlog 653–654, Blickwinkel „Parkschaden – Unfallgegner unbekannt (Unfallflucht)“): Meldeformular zeigt
# bei Unfallflucht/Parkschaden eigene Schritte statt der allgemeinen Unfall-Hinweise (#acc ausgeblendet), normaler Unfall weiter #acc;
# Vorgang zeigt der Leitung im Versicherungsabschnitt den Hinweis „Anzeige eintragen, Gegner unbekannt → leer lassen“.
# Backlog 1274: diktierte Sätze ohne Satzzeichen (Unfall bzw. „angefahren und ist weg“).
# Backlog 1308: russisch/ukrainisch diktiert – Auffahrunfall → #acc, Parkschaden „мне помяли дверь на стоянке“ → #hitrun, „об столб“ → #fixobj.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Parkschaden über Nacht auf dem Rastplatz, Verursacher unbekannt','uk':'Водій втік з місця ДТП, бампер пошкоджено','en':'Hit-and-run at the rest area, bumper damaged'}
DIK={'de':'pkw hat mich beim spurwechsel gestreift','uk':'мене підрізали і зачепили бампер','en':'a car hit my trailer while turning'}  # Backlog 1274: Diktat ohne Satzzeichen
DIKH={'de':'auf dem rastplatz hat mich einer angefahren und ist weg','uk':'auf dem rastplatz hat mich einer angefahren und ist weg','en':'someone scraped the trailer and then drove off'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uf.inhaber','display_name':'UF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'uf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'UF-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM76{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    vid=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']==plate][0]['id']
    cr=api('POST','/api/cases',{'vehicle_id':vid,'description':'Fahrerflucht: Lkw über Nacht hinten links angefahren','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(cr['s']==201,'Vorgang angelegt'); cid=cr['d']['id']
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'uf.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#hitrun') and not vis('#acc'),f'{lang}/{w}: Unfallflucht-Schritte statt Unfall-Hinweis bei „{TXT[lang]}“')
        tx=q.inner_text('#hitrun'); check('hitrun_' not in tx and len(tx)>80,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#hitrun').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/unfallflucht-{lang}-{w}.png')
        q.fill('#d','Unfall beim Rangieren, Stoßstange beschädigt'); q.wait_for_timeout(150)
        check(vis('#acc') and not vis('#hitrun'),f'{lang}/{w}: normaler Unfall → allgemeiner Hinweis')
        q.fill('#d',DIK[lang]); q.wait_for_timeout(150)
        check(vis('#acc') and not vis('#hitrun'),f'{lang}/{w}: Diktat „{DIK[lang]}“ → Unfall-Hinweis')
        q.fill('#d',DIKH[lang]); q.wait_for_timeout(150)
        check(vis('#hitrun') and not vis('#acc'),f'{lang}/{w}: Diktat „{DIKH[lang]}“ → Unfallflucht-Schritte')
        if SHOTS and w==390: q.locator('#hitrun').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/unfallflucht-diktat-{lang}-{w}.png')
        for x,pan in [('мне въехали в зад','#acc'),('легківка в’їхала в причіп','#acc'),('мені пом’яли двері на стоянці','#hitrun'),('помял бампер об столб','#fixobj')]:  # Backlog 1308
            q.fill('#d',x); q.wait_for_timeout(150)
            check(vis(pan) and all(not vis(o) for o in ['#acc','#hitrun','#fixobj'] if o!=pan),f'{lang}/{w}: „{x}“ → {pan}')
        if SHOTS and w in (390,1366): q.fill('#d','мне въехали в зад'); q.wait_for_timeout(150); q.locator('#acc').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/unfall-ru-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-claimhitrun]',timeout=15000)
        tx=q.inner_text('[data-claimhitrun]')
        check(len(tx)>20 and 'cp_' not in tx,f'{lang}/{w}: Hinweis für die Leitung im Vorgang')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Vorgang)')
        if SHOTS: q.locator('[data-claimhitrun]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/unfallflucht-vorgang-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
