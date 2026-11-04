# [CLAUDE] UI-Test (04.11.2026, Backlog 965, Blickwinkel „Fahrer diktiert per Sprachnachricht – lange Sätze ohne Satzzeichen“): ein Reparaturvermerk
# zu einem anderen Bauteil im selben Satz („… das radio wurde gewechselt“) blendet den Lenkungs-/Reifen-/Brems-Hinweis nicht mehr aus; gleiches Bauteil
# („… und das lenkrad wurde getauscht“) weiter ohne Hinweis; ebenso Geräte-Hinweise über noFixed (Navi, Fensterheber). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
YES={'de':[('#steer','also ich wollte sagen die lenkung zieht nach rechts das radio wurde gewechselt'),('#brake','hallo die bremse zieht nach links und der spiegel wurde letzte woche getauscht'),('#telem','navi geht nicht der spiegel wurde getauscht')],
     'uk':[('#tyre','колесо спускає а двірники замінили'),('#brake','тормоза тянут влево а зеркало заменили'),('#window','склопідйомник не працює а дзеркало замінили')],
     'en':[('#steer','the steering pulls to the right and the radio was replaced'),('#tyre','tyre losing air on the rear and the wiper was fixed yesterday')]}
NO={'de':('#steer','lenkung zieht nach rechts und das lenkrad wurde getauscht'),'uk':('#tyre','колесо спускає а колесо вже замінили'),'en':('#steer','steering pulls right and the steering rack was replaced')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ds.inhaber','display_name':'DS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ds.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM79' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nDS-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ds.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for i,(sel,x) in enumerate(YES[lang]):
            q.fill('#d',x); q.wait_for_timeout(120)
            check(vis(sel),f'{lang}/{w}: „{x}“ → Hinweis {sel}')
            if SHOTS and i==0: q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/diktat-{lang}-{w}.png')
        sel,x=NO[lang]; q.fill('#d',x); q.wait_for_timeout(120)
        check(not vis(sel),f'{lang}/{w}: „{x}“ → kein Hinweis {sel} (gleiches Bauteil repariert)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
