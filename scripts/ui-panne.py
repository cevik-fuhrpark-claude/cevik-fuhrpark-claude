# [CLAUDE] UI-Test (11.11.2026, Backlog 1347, Blickwinkel „Fahrer meldet eine Panne / liegengeblieben ohne Ursache“): Meldeformular zeigt
# fünf Pannen-Schritte (absichern/Schutzplanke, 112/110, Leitung + „Panne & Notfall“, Standort notieren, „nicht fahrbereit“); „Reifenpanne“/„keine Panne“
# zeigen ihn nicht; „Panne, Getriebe schaltet nicht“ zeigt beide (Getriebe offen, Panne eingeklappt); Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Panne auf der Autobahn A2','uk':'Зламалася на трасі, стою на узбіччі','en':'Broke down on the motorway'}
BOTH={'de':'Panne, Getriebe schaltet nicht mehr','uk':'Зламалася на трасі, коробка передач не перемикає','en':'Broke down, clutch slipping'}
NO={'de':'Reifenpanne hinten links','uk':'Двері пошкоджені','en':'no breakdown, just a scratch'}
HT={'de':'Panne – Fahrzeug liegengeblieben','uk':'Поломка – авто зупинилося в дорозі','en':'Breakdown – vehicle stranded'}
EN_NEW=['stuck on the hard shoulder','need a tow','Lkw liegengeblieben','стою на обочине']
EN_NO=['keine Panne','breakdown cover number','Panne behoben, fährt wieder']
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pa.inhaber','display_name':'PA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nPA-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#breakdown'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#breakdown') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Pannen-Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#breakdown'),f'{lang}/{w}: Hinweis bei Panne')
        tx=q.inner_text('#breakdown')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#breakdown').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/panne-{lang}-{w}.png')
        for x in EN_NEW:  # weitere Formulierungen in jeder Oberflächensprache
            q.fill('#d',x); q.wait_for_timeout(100); check(vis('#breakdown'),f'{lang}/{w}: „{x}“ → Pannen-Hinweis')
        for x in EN_NO:
            q.fill('#d',x); q.wait_for_timeout(100); check(not vis('#breakdown'),f'{lang}/{w}: „{x}“ → kein Pannen-Hinweis')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#breakdown') and vis('#gear') and q.evaluate("!document.querySelector('#gear ul').hidden && document.querySelector('#breakdown ul').hidden"),f'{lang}/{w}: mit Getriebe zusammen → Getriebe offen, Panne eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=breakdown'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_breakdown' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
