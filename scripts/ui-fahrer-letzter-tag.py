# [CLAUDE] UI-Test (30.10.2026, Backlog 656–658, Blickwinkel „Fahrer verlässt das Unternehmen – letzter Arbeitstag“): Benutzer → Deaktivieren
# eines Fahrers zeigt offene Meldungen und die fehlende Auslesung der Fahrerkarte; Hilfe-Abschnitt „Fahrer scheidet aus“ für den Inhaber.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HELP={'de':'Fahrer scheidet aus','uk':'Водій звільняється','en':'Driver leaves'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lt.inhaber','display_name':'LT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'LT-ZM {tag}'
    me=api('GET','/api/me')['d']; env=(me.get('user') or me).get('environment','production')
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM77{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    vid=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']==plate][0]['id']
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; un=f'lt.fahrer{tag}{n}'
        r=api('POST','/api/users',{'username':un,'display_name':f'LT Fahrer {n}','role':'driver','environment':env}); uid=r['d']['id']
        b=br.new_page(); b.goto(B); b.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None])
        b.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None])
        cr=b.evaluate(JS,['POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel locker','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())},None]); b.close()
        check(cr['s']==201,f'{lang}/{w}: Meldung des Fahrers')
        dr=api('POST','/api/drivers',{'display_name':f'LT Fahrer {n}','user_id':uid}); 
        api('POST',f"/api/drivers/{dr['d']['id']}/documents",{'kind':'fahrerkarte','valid_until':'2030-01-31','evidence':'Kopie'})
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e))); q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lt.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/users'); q.wait_for_selector(f'[data-act="{uid}"]',timeout=15000)
        q.click(f'[data-act="{uid}"]'); q.wait_for_selector('.toast.err',timeout=10000)
        tx=q.inner_text('.toast.err')
        check(cr['d']['case_no'] in tx and 'ue_' not in tx,f'{lang}/{w}: Hinweis nennt offene Meldung')
        check(len(tx)>120,f'{lang}/{w}: Hinweis nennt Fahrerkarte')
        if SHOTS: q.screenshot(path=f'{SHOTS}/letzter-tag-{lang}-{w}.png')
        q.goto(B+'/#/help'); q.wait_for_selector('#help-leaver',timeout=15000)
        check(HELP[lang] in q.inner_text('#help-leaver'),f'{lang}/{w}: Hilfe-Abschnitt')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Hilfe)')
        if SHOTS and w==390: q.locator('#help-leaver').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/letzter-tag-hilfe-{lang}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
