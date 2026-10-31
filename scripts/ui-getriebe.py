# [CLAUDE] UI-Test (25.10.2026, Backlog 319, Blickwinkel „Getriebe schaltet nicht, Gang geht nicht rein oder Kupplung rutscht“): Meldeformular zeigt
# fünf Schritte (anhalten, Feststellbremse/nicht mit Gewalt schalten, Leitung, Display-Foto/Gänge, Auswahl Fahrbereitschaft);
# „Auflieger lässt sich nicht kuppeln“ zeigt keinen Getriebe-Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Getriebe-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Kupplung geht schwer','uk':'Зчеплення туге','en':'Clutch is heavy'}
BOTH={'de':'Unfall, Getriebe schaltet nicht mehr','uk':'ДТП, коробка передач не перемикає','en':'Accident, clutch slipping now'}
NO={'de':'Auflieger lässt sich nicht kuppeln','uk':'Двері пошкоджені','en':'Reefer unit fault'}
HT={'de':'Getriebe schaltet nicht, Gang geht nicht rein oder Kupplung rutscht','uk':'Коробка передач не перемикає, передача не вмикається або буксує зчеплення','en':'Gearbox not shifting, gear won’t engage or clutch slipping'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ge.inhaber','display_name':'GE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ge.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nGE-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ge.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#gear'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#gear') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Getriebe-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#gear'),f'{lang}/{w}: Hinweis bei Getriebe-/Kupplungsproblem')
        tx=q.inner_text('#gear')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#gear').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/getriebe-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#gear') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#gear ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Getriebe eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=gear'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_gear' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
