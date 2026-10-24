# [CLAUDE] UI-Test (24.10.2026, Backlog 224, Teilagent „Leitung gibt Kostenvoranschlag als PDF frei“): Leitung lädt einen Kostenvoranschlag
# als PDF in den Vorgang, erfasst unter „Fremdrechnung erfassen“ den Betrag als Schätzung und wählt die Datei als „Beleg“; die Kostenliste
# zeigt den Beleg als Link, „Kosten freigeben“ listet die Belege über dem Vermerk. Vorgang ohne Datei zeigt den Hinweis statt der Auswahl.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, name]) => { const head = new TextEncoder().encode('%PDF-1.4\\n'); const b = new Uint8Array(head.length + 300); b.set(head); crypto.getRandomValues(b.subarray(head.length));
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-filename': name, 'x-cfp': '1' }, body: b }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
DOCS={'de':'Belege der Fremdleistungen','uk':'Документи до сторонніх послуг','en':'Supporting documents of external services'}
FILE={'de':'Beleg','uk':'Документ-підстава','en':'Supporting document'}
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
    vin='WDB9634031B'+str(uuid.uuid4().int)[:6]; plate='KV-A '+str(uuid.uuid4().int)[:3]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    def mk(desc):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
        c=api('GET','/api/cases/'+cid)['d']['case']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Fremdwerkstatt','payload':{'workshop_site':'DORTMUND'}})['s']==200,'Auftrag freigegeben')
        return cid
    cid=mk('Getriebe schaltet schwer – Kostenvoranschlag Fremdwerkstatt'); empty=mk('Spiegel links lose')
    fn='KVA-Getriebe-Schmidt.pdf'
    check(a.evaluate(UP,[f'/api/cases/{cid}/files',fn])['s']==201,'Kostenvoranschlag hochgeladen')
    old=api('GET','/api/settings')['d']; oldlim=(old.get('settings') or old).get('repair_cost_limit_net') if isinstance(old,dict) else None
    check(api('PUT','/api/settings',{'repair_cost_limit_net':500})['s']==200,'Kostengrenze 500 € (Test)')
    first=True
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        if first:
            q.goto(B+'/#/cases/'+empty); q.wait_for_selector('button[data-act="add_external_cost"]',timeout=15000)
            q.click('button[data-act="add_external_cost"]'); q.wait_for_selector('#af input[name=supplier]',timeout=5000)
            check(q.locator('#extfile-none').count()==1 and q.locator('#extfile').count()==0,f'{lang}/{w}: ohne Datei Hinweis statt Auswahl')
            q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act="add_external_cost"]',timeout=15000)
            q.click('button[data-act="add_external_cost"]'); q.wait_for_selector('#extfile',timeout=5000)
            opts=q.locator('#extfile option').all_inner_texts()
            check(any(fn in o and 'PDF' in o for o in opts),f'{lang}/{w}: Auswahl nennt die Datei ({opts[-1][:50]!r})')
            check(FILE[lang] in q.inner_text('#af'),f'{lang}/{w}: Feld „{FILE[lang]}“')
            q.fill('#af input[name=supplier]','Getriebe Schmidt'); q.fill('#af input[name=invoice_no]','KVA-77'); q.fill('#af input[name=amount_net]','1.240,00')
            q.check('#af input[name=estimate]'); q.select_option('#extfile',label=[o for o in opts if fn in o][0])
            if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fremdbeleg-form-{lang}-{w}.png')
            q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('[data-extfile]',timeout=10000); first=False
        else:
            q.goto(B+'/#/cases/'+cid); q.wait_for_selector('[data-extfile]',timeout=15000)
        lk=q.locator('[data-extfile] a')
        check(lk.count()==1 and lk.inner_text()==fn and '/api/files/' in (lk.get_attribute('href') or ''),f'{lang}/{w}: Kostenliste verlinkt den Beleg')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('[data-extfile]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fremdbeleg-kosten-{lang}-{w}.png')
        q.click('button[data-act="approve_costs"]'); q.wait_for_selector('#extdocs',timeout=5000)
        ed=q.inner_text('#extdocs')
        check(DOCS[lang] in ed and fn in ed and 'Getriebe Schmidt' in ed,f'{lang}/{w}: Kostenfreigabe listet den Beleg ({ed[:60]!r})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Freigabeformular ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fremdbeleg-freigabe-{lang}-{w}.png')
        q.goto(B+'/#/help?s=costlimit'); q.wait_for_timeout(800)
        check(FILE[lang] in q.evaluate('document.body.innerText'),f'{lang}/{w}: Hilfe nennt „{FILE[lang]}“')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PUT','/api/settings',{'repair_cost_limit_net':oldlim if oldlim not in (None,'') else ''})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
