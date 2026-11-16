# [CLAUDE] UI-Test (16.11.2026, Backlog 1541, Folge aus 1540): Vorgangsansicht zeigt der Leitung im Versicherungsabschnitt den Hinweis
# „Diebstahl ohne Aktenzeichen“ (#cptheft) bzw. „Vandalismus ohne Aktenzeichen“ ([data-claimvandal]) auch bei fremdsprachigen Meldetexten
# (Hinglish „battery chura li“, „kisi ne tirpal kaat diya“ – Sprachtabellen aus app-sprachen.js); normale Meldung ohne diese Hinweise.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'af.inhaber','display_name':'AF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'af.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'AF-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM76{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    vid=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']==plate][0]['id']
    mk=lambda d: api('POST','/api/cases',{'vehicle_id':vid,'description':d,'priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
    c_theft=mk('raat ko parking mein battery chura li'); c_vandal=mk('kisi ne tirpal kaat diya'); c_plain=mk('brake kaam nahi kar raha')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'af.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+f'/#/cases/{c_theft}'); q.wait_for_selector('#cptheft',timeout=15000)
        tx=q.inner_text('#cptheft'); check(len(tx)>20 and 'cp_' not in tx,f'{lang}/{w}: Diebstahl-Hinweis bei „battery chura li“')
        check(q.locator('[data-claimvandal]').count()==0,f'{lang}/{w}: nicht zusätzlich Vandalismus')
        if SHOTS: q.locator('#cptheft').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/anzeige-fremd-{lang}-{w}.png')
        q.goto(B+f'/#/cases/{c_vandal}'); q.wait_for_selector('[data-claimvandal]',timeout=15000)
        check(q.locator('#cptheft').count()==0,f'{lang}/{w}: Vandalismus-Hinweis bei „kisi ne tirpal kaat diya“, kein Diebstahl')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.goto(B+f'/#/cases/{c_plain}'); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(800)
        check(q.locator('#cptheft').count()==0 and q.locator('[data-claimvandal]').count()==0,f'{lang}/{w}: „brake kaam nahi kar raha“ ohne Anzeige-Hinweis')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
