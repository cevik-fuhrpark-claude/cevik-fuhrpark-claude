# [CLAUDE] UI-Test (04.11.2026, Backlog 982, Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert den Arbeitsbericht“): Zahlwörter im Stundenfeld
# („zweieinhalb Stunden“, „півтори години“, „two and a half hours“) zeigen die Umrechnung; steht die Dauer im diktierten Tätigkeitstext und ist das
# Stundenfeld leer, übernimmt ein Knopf sie (Stundenfeld = erkannter Text, Tätigkeit ohne Dauer), Buchung mit richtigen Stunden.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Diktat je Sprache: Stundenfeld (Wörter), Tätigkeit mit Dauer am Ende, erwartete Umrechnung, Rest der Tätigkeit
DIK={'de':('zweieinhalb Stunden','= 2 Std. 30 Min.','Bremsbeläge vorne getauscht, anderthalb Stunden','1 Std. 30 Min.','Bremsbeläge vorne getauscht','anderthalb Stunden'),
     'uk':('півтори години','= 1 год 30 хв','Замінили колодки, пів години','30 хв','Замінили колодки','пів години'),
     'en':('two and a half hours','= 2 h 30 min','Brake pads replaced – an hour and a half','1 h 30 min','Brake pads replaced','an hour and a half')}
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
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'UI-Test Arbeitszeit diktiert','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['id']
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Diktat-Test','payload':{'workshop_site':ws}})['s']==200,'zur Reparatur freigegeben')
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'; words,conv,dtext,dconv,rest,part=DIK[lang]
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'am.inhaber','password':PW},None])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act=record_work]',timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_selector('#whours',timeout=5000)
        q.fill('#whours',words); t1=q.inner_text('#whconv'); check(t1==conv,f'{tag}: „{words}“ → {t1!r}')
        q.fill('#af input[name=description]',dtext)
        check(q.locator('#whdesc').is_hidden(),f'{tag}: Stundenfeld gefüllt → kein Übernahme-Knopf')
        q.fill('#whours','')
        q.locator('#af input[name=description]').press('End')
        q.fill('#af input[name=description]',dtext)
        q.wait_for_selector('[data-whtake]',timeout=3000); bt=q.inner_text('[data-whtake]')
        check(part in bt and dconv in bt,f'{tag}: Knopf nennt Dauer und Umrechnung ({bt!r})')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Formular)')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/arbeitszeit-diktat-{lang}-{w}.png')
        q.click('[data-whtake]')
        check(q.input_value('#whours')==part,f'{tag}: Stundenfeld = {q.input_value("#whours")!r}')
        check(q.input_value('#af input[name=description]')==rest,f'{tag}: Tätigkeit ohne Dauer ({q.input_value("#af input[name=description]")!r})')
        check(q.locator('#whdesc').is_hidden() and not q.locator('#whconv').is_hidden(),f'{tag}: Knopf weg, Umrechnung sichtbar')
        q.fill('#af input[name=description]',f'{rest} {n}')
        q.click('#af button.btn:not(.secondary)'); work=[]
        for _ in range(40):
            q.wait_for_timeout(250); work=api('GET','/api/cases/'+cid)['d'].get('work') or []
            if any(x.get('description')==f'{rest} {n}' for x in work): break
        exp={'de':1.5,'uk':0.5,'en':1.5}[lang]
        check(any(x.get('description')==f'{rest} {n}' and abs(x.get('hours')-exp)<1e-9 for x in work),f'{tag}: gebucht mit {exp} Std.')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Vorgang)')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
