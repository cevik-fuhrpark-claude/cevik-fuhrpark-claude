# [CLAUDE] UI-Test (04.11.2026, Backlog 973, Blickwinkel „Mechaniker erfasst Arbeitszeit in Stunden und Minuten“): Stundenfeld zeigt ein Beispiel,
# darunter die Umrechnung („1,30“ → „= 1 Std. 18 Min.“, „1:30“ → „= 1 Std. 30 Min.“); „1:30“ wird als 1,5 Std. gebucht, „1:75“ in der App-Sprache
# abgewiesen (Formular bleibt offen). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CONV={'de':('= 1 Std. 18 Min.','= 1 Std. 30 Min.'),'uk':('= 1 год 18 хв','= 1 год 30 хв'),'en':('= 1 h 18 min','= 1 h 30 min')}
MIN={'de':'Minuten nur 0 bis 59','uk':'хвилини лише від 0 до 59','en':'minutes only 0 to 59'}
PH={'de':'1:30','uk':'1:30','en':'1:30'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'am.inhaber','display_name':'AM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'am.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    vin='WDB9634031B'+str(uuid.uuid4().int)[:6]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':'AM-UI '+str(uuid.uuid4().int)[:3],'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'UI-Test Arbeitszeit in Minuten','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['id']
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Minuten-Test','payload':{'workshop_site':ws}})['s']==200,'zur Reparatur freigegeben')
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'am.inhaber','password':PW},None])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act=record_work]',timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_selector('#whours',timeout=5000)
        check(PH[lang] in (q.get_attribute('#whours','placeholder') or ''),f'{tag}: Beispiel im Feld ({q.get_attribute("#whours","placeholder")!r})')
        check(q.locator('#whconv').is_hidden(),f'{tag}: leer → keine Umrechnung')
        q.fill('#whours','1,30' if lang!='en' else '1.30')
        t1=q.inner_text('#whconv'); check(t1==CONV[lang][0],f'{tag}: „1,30“ → {t1!r}')
        q.fill('#whours','1:30'); t2=q.inner_text('#whconv'); check(t2==CONV[lang][1],f'{tag}: „1:30“ → {t2!r}')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Formular)')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/arbeitszeit-minuten-{lang}-{w}.png')
        q.fill('#af input[name=description]',f'Minuten-Test {n}')
        q.fill('#whours','1:75'); check(q.locator('#whconv').is_hidden(),f'{tag}: „1:75“ ohne Umrechnung')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('.toast.err',timeout=10000)
        msg=q.inner_text('.toast.err'); check(MIN[lang] in msg,f'{tag}: Meldung Minuten in der App-Sprache ({msg[:80]!r})')
        check(q.locator('#whours').count()==1 and q.input_value('#whours')=='1:75',f'{tag}: Formular bleibt mit Eingabe offen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/arbeitszeit-minuten-fehler-{lang}-{w}.png')
        q.evaluate("document.querySelectorAll('.toast').forEach((x) => x.remove())")
        q.fill('#whours','0:30'); q.click('#af button.btn:not(.secondary)'); work=[]
        for _ in range(40):
            q.wait_for_timeout(250); work=api('GET','/api/cases/'+cid)['d'].get('work') or []
            if any(x.get('description')==f'Minuten-Test {n}' for x in work): break
        check(any(x.get('description')==f'Minuten-Test {n}' and abs(x.get('hours')-0.5)<1e-9 for x in work),f'{tag}: „0:30“ als 0,5 Std. gebucht')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Vorgang)')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
