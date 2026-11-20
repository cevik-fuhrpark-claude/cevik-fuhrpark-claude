# [CLAUDE] UI-Test (20.11.2026, Backlog 1631, Blickwinkel „Leitung kopiert Aktenzeichen, Rechnungsnummer oder Text aus PDF, E-Mail oder Webseite“):
# Meldeformular – eine Beschreibung nur aus unsichtbaren Zeichen (Breite-null-Leerzeichen, weiches Trennzeichen) gilt als „zu kurz“: Feld markiert
# (aria-invalid + Hinweis), kein Vorgang angelegt; beim Verlassen des Felds werden die Zeichen entfernt (Backlog 1632). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uz.inhaber','display_name':'UZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'uz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'UZ-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM76{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    vid=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']==plate][0]['id']
    count=lambda: len([c for c in (api('GET','/api/cases?status=alle')['d'] or {}).get('cases',[]) if c.get('vehicle_id')==vid])
    n0=count()
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'uz.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        r=q.locator(f'input[name=veh][value="{vid}"]')
        if r.count(): r.first.check(force=True)
        q.fill('#d','\u200b'*12+'\u00ad'*3); q.wait_for_timeout(100)
        q.locator('#f #sb').click(); q.wait_for_timeout(600)
        check(q.get_attribute('#d','aria-invalid')=='true',f'{lang}/{w}: Beschreibung nur aus unsichtbaren Zeichen markiert')
        q.fill('#d','Spie\u00adgel ab\u200bgefahren'); q.locator('#d').blur(); q.wait_for_timeout(150)
        check(q.input_value('#d')=='Spiegel abgefahren',f'{lang}/{w}: unsichtbare Zeichen beim Verlassen des Felds entfernt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/unsichtbar_{lang}_{w}.png',full_page=False)
        ctx.close()
    check(count()==n0,'kein Vorgang angelegt')
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle Prüfungen bestanden'); raise SystemExit(1 if fails else 0)
