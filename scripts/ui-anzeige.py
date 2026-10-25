# [CLAUDE] UI-Test (25.10.2026, Backlog 324, Blickwinkel „Kombiinstrument, Display oder Hupe ausgefallen“): Meldeformular zeigt
# fünf Schritte (anhalten, Fahrtenschreiber, Leitung/Sicherungen, Foto/was fehlt, Auswahl Fahrbereitschaft);
# „Navi Display schwarz“ zeigt keinen Anzeige-Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Anzeige-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Kombiinstrument ausgefallen','uk':'Панель приладів не працює','en':'Horn doesn’t work'}
BOTH={'de':'Unfall, Display jetzt schwarz','uk':'ДТП, дисплей погас','en':'Accident, dashboard dead'}
NO={'de':'Spanngurt gerissen','uk':'Двері пошкоджені','en':'Phone screen broken'}
HT={'de':'Kombiinstrument, Display oder Hupe ausgefallen','uk':'Не працює панель приладів, дисплей чи звуковий сигнал','en':'Instrument cluster, display or horn failed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'an.inhaber','display_name':'AN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'an.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAN-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'an.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#dash'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#dash') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Anzeige-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#dash'),f'{lang}/{w}: Hinweis bei ausgefallener Anzeige/Hupe')
        tx=q.inner_text('#dash')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#dash').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/anzeige-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#dash') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#dash ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Anzeige eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=dash'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_dash' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
