# [CLAUDE] UI-Test (09.11.2026, Backlog 1238/1239, Blickwinkel „Fahrer meldet ausgelösten Airbag“ bzw. „Wasser im Diesel“): Meldeformular zeigt
# eigene Schritte (#airbag bzw. #waterfuel); „Airbag nicht ausgelöst“ bzw. „Wasserabscheider abgelassen“ nicht. Hilfe zeigt beide Abschnitte.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
AIR={'de':'Airbag ausgelöst beim Bremsen','uk':'спрацювала подушка безпеки','en':'the airbag deployed'}
WAT={'de':'Wasser im Diesel Anzeige leuchtet','uk':'вода в паливі','en':'water in fuel warning'}
HELP={'de':('Airbag oder Gurtstraffer ausgelöst','Wasser im Diesel, Wasserabscheider voll'),'uk':('Спрацювала подушка безпеки','Вода в дизелі, повний водовідокремлювач'),'en':('Airbag or seat-belt pretensioner deployed','Water in the diesel, water separator full')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ab.inhaber','display_name':'AB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ab.inhaber','password':PW})['s']==200,'Anmeldung Inhaber'); user='ab.inhaber'
    tag=str(uuid.uuid4().int)[:4]; plate=f'AB-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM78{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',AIR[lang]); q.wait_for_timeout(150)
        check(vis('#airbag'),f'{lang}/{w}: Airbag-Schritte bei „{AIR[lang]}“')
        check(not vis('#waterfuel'),f'{lang}/{w}: keine Wasser-Schritte beim Airbag')
        tx=q.inner_text('#airbag'); check('airbag_' not in tx and len(tx)>200,f'{lang}/{w}: Airbag-Text übersetzt')
        if SHOTS: q.locator('#airbag').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/airbag-{lang}-{w}.png')
        q.fill('#d','Airbag nicht ausgelöst'); q.wait_for_timeout(150)
        check(not vis('#airbag'),f'{lang}/{w}: „Airbag nicht ausgelöst“ → kein Hinweis')
        q.fill('#d',WAT[lang]); q.wait_for_timeout(150)
        check(vis('#waterfuel'),f'{lang}/{w}: Wasser-Schritte bei „{WAT[lang]}“')
        check(not vis('#airbag'),f'{lang}/{w}: keine Airbag-Schritte beim Wasser')
        tx=q.inner_text('#waterfuel'); check('waterfuel_' not in tx and len(tx)>200,f'{lang}/{w}: Wasser-Text übersetzt')
        if SHOTS: q.locator('#waterfuel').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wasser-diesel-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','Wasserabscheider abgelassen'); q.wait_for_timeout(150)
        check(not vis('#waterfuel'),f'{lang}/{w}: „Wasserabscheider abgelassen“ → kein Hinweis')
        q.fill('#d','')
        q.goto(B+'/#/help'); q.wait_for_timeout(1200)
        ht=q.inner_text('#app'); check('help_airbag' not in ht and 'help_waterfuel' not in ht and all(x in ht for x in HELP[lang]),f'{lang}/{w}: Hilfe-Abschnitte vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
