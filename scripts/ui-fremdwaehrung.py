# [CLAUDE] UI-Test (04.11.2026, Backlog 1001, Blickwinkel „Lkw-Panne in Polen – Fremdwerkstatt rechnet in Złoty“): „1.250,00 zł“ im Betragsfeld
# wird beim Verlassen in der App-Sprache als fremde Währung gemeldet, Speichern bleibt gesperrt (nichts gebucht); nach Eingabe des Euro-Betrags
# verschwindet der Hinweis und „291,40 €“ wird gebucht. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FX={'de':'Betrag in PLN','uk':'Сума у PLN','en':'Amount in PLN'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fx.inhaber','display_name':'FX Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fx.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WDB9634031B'+str(uuid.uuid4().int)[:6]; plate='NT-A '+str(uuid.uuid4().int)[:3]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Panne bei Poznań – Fremdwerkstatt','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Fremdwerkstatt','payload':{'workshop_site':'DORTMUND'}})['s']==200,'Auftrag freigegeben')
    n=0; RUN=str(uuid.uuid4().int)[:5]
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fx.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="add_external_cost"]',timeout=15000)
        q.click('button[data-act="add_external_cost"]'); q.wait_for_selector('#af input[name=supplier]',timeout=5000)
        q.fill('#af input[name=supplier]','Serwis Truck Poznań'); q.fill('#af input[name=invoice_no]',f'FV-1001-{RUN}-{n}')
        q.fill('#af input[name=amount_net]','1.250,00 zł'); q.press('#af input[name=amount_net]','Tab'); q.wait_for_timeout(200)
        vm=q.eval_on_selector('#af input[name=amount_net]','e => e.validationMessage')
        check(FX[lang] in vm,f'{tag}: Hinweis fremde Währung am Feld in der App-Sprache ({vm[:60]!r})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fremdwaehrung-hinweis-{lang}-{w}.png')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_timeout(800)
        ext=api('GET','/api/cases/'+cid)['d'].get('external_costs') or []
        check(not any(x.get('invoice_no')==f'FV-1001-{RUN}-{n}' for x in ext),f'{tag}: Złoty-Betrag nicht gebucht')
        check(q.locator('#af input[name=amount_net]').count()==1,f'{tag}: Formular bleibt offen')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Hinweis)')
        q.fill('#af input[name=amount_net]','291,40 €' if lang!='en' else '291.40 €')
        check(q.eval_on_selector('#af input[name=amount_net]','e => e.validationMessage')=='',f'{tag}: Hinweis nach Eingabe aufgehoben')
        q.click('#af button.btn:not(.secondary)')
        for _ in range(40):
            q.wait_for_timeout(250); ext=api('GET','/api/cases/'+cid)['d'].get('external_costs') or []
            if any(x.get('invoice_no')==f'FV-1001-{RUN}-{n}' for x in ext): break
        check(any(x.get('invoice_no')==f'FV-1001-{RUN}-{n}' and x.get('amount_net')==291.4 for x in ext),f'{tag}: Euro-Betrag 291,40 gebucht')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Vorgang)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fremdwaehrung-gebucht-{lang}-{w}.png', full_page=False)
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
