# [CLAUDE] UI-Test (04.11.2026, Backlog 971, Blickwinkel „Leitung erfasst die Rechnung einer Fremdwerkstatt am Handy“): Betrag wie auf der
# Rechnung („1.240,- €“) wird gebucht und in der Kostenliste angezeigt; „… € inkl. MwSt.“ wird mit eigener Meldung in der App-Sprache abgewiesen,
# das Formular bleibt offen. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
GROSS={'de':'ist ein Bruttobetrag','uk':'це сума брутто','en':'is a gross amount'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WDB9634031B'+str(uuid.uuid4().int)[:6]; plate='NT-A '+str(uuid.uuid4().int)[:3]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Druckluftleitung undicht – Fremdwerkstatt','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Fremdwerkstatt','payload':{'workshop_site':'DORTMUND'}})['s']==200,'Auftrag freigegeben')
    n=0; RUN=str(uuid.uuid4().int)[:5]
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="add_external_cost"]',timeout=15000)
        q.click('button[data-act="add_external_cost"]'); q.wait_for_selector('#af input[name=supplier]',timeout=5000)
        q.fill('#af input[name=supplier]','Truck-Service Nord'); q.fill('#af input[name=invoice_no]',f'R-971-{RUN}-{n}-B'); q.fill('#af input[name=amount_net]','1.475,60 € inkl. MwSt.')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('.toast.err',timeout=10000)
        msg=q.inner_text('.toast.err')
        check(GROSS[lang] in msg,f'{tag}: Brutto-Meldung in der App-Sprache ({msg[:70]!r})')
        check(q.locator('#af input[name=amount_net]').count()==1 and q.input_value('#af input[name=amount_net]')=='1.475,60 € inkl. MwSt.',f'{tag}: Formular bleibt mit Eingabe offen')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Meldung)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fremdrechnung-brutto-{lang}-{w}.png')
        q.evaluate("document.querySelectorAll('.toast').forEach((x) => x.remove())")
        q.fill('#af input[name=invoice_no]',f'R-971-{RUN}-{n}'); q.fill('#af input[name=amount_net]','1.240,- €')
        q.click('#af button.btn:not(.secondary)'); ext=[]
        for _ in range(40):
            q.wait_for_timeout(250); ext=api('GET','/api/cases/'+cid)['d'].get('external_costs') or []
            if any(x.get('invoice_no')==f'R-971-{RUN}-{n}' for x in ext): break
        check(any(x.get('invoice_no')==f'R-971-{RUN}-{n}' and x.get('amount_net')==1240 for x in ext),f'{tag}: „1.240,- €“ als 1240 gebucht')
        check(not any(x.get('invoice_no')==f'R-971-{RUN}-{n}-B' for x in ext),f'{tag}: Bruttobetrag nicht gebucht')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Vorgang)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fremdrechnung-gebucht-{lang}-{w}.png', full_page=False)
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
