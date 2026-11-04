# [CLAUDE] UI-Test (04.11.2026, Backlog 983, Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert Teile und Mengen“): Zahlwörter im Mengenfeld
# („vier Liter“, „дві штуки“, „two and a half litres“) zeigen, was gelesen wird; steht die Menge im diktierten Teilenamen und ist das Mengenfeld
# unverändert (1), übernimmt ein Knopf sie (Menge = erkannter Text, Name ohne Menge); Buchung mit Menge und Einheit.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# je Sprache: Mengenfeld (Wörter), erwartete Anzeige, diktierter Name, Teil im Knopf, Anzeige im Knopf, Rest-Name, gebuchte Menge/Einheit
DIK={'de':('vier Liter','= 4 l','Motoröl 10W-40, zwei Liter','zwei Liter','2 l','Motoröl 10W-40',2,'l'),
     'uk':('дві штуки','= 2 шт.','три гальмівні колодки','три','3','гальмівні колодки',3,'Stk'),
     'en':('two and a half litres','= 2.5 l','2 litres of coolant','2 litres','2 l','coolant',2,'l')}
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
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'UI-Test Teile diktiert','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['id']
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'Diktat-Test','payload':{'workshop_site':ws}})['s']==200,'zur Reparatur freigegeben')
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'; words,conv,dtext,part,qconv,rest,qn,qu=DIK[lang]
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'am.inhaber','password':PW},None])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('button[data-act=add_part]',timeout=15000); q.click('button[data-act=add_part]')
        q.wait_for_selector('#pqty',timeout=5000)
        q.fill('#pqty',words); t1=q.inner_text('#pqconv'); check(t1==conv,f'{tag}: „{words}“ → {t1!r}')
        q.fill('#af input[name=name]',dtext)
        check(q.locator('#pqname').is_hidden(),f'{tag}: Menge geändert → kein Übernahme-Knopf')
        q.fill('#pqty','1')
        q.fill('#af input[name=name]',dtext)
        q.wait_for_selector('[data-pqtake]',timeout=3000); bt=q.inner_text('[data-pqtake]')
        check(part in bt and qconv in bt,f'{tag}: Knopf nennt Menge ({bt!r})')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Formular)')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teile-diktat-{lang}-{w}.png')
        q.click('[data-pqtake]')
        check(q.input_value('#pqty')==part,f'{tag}: Mengenfeld = {q.input_value("#pqty")!r}')
        check(q.input_value('#af input[name=name]')==rest,f'{tag}: Name ohne Menge ({q.input_value("#af input[name=name]")!r})')
        check(q.locator('#pqname').is_hidden() and not q.locator('#pqconv').is_hidden(),f'{tag}: Knopf weg, Anzeige sichtbar')
        q.fill('#af input[name=name]',f'{rest} {n}')
        q.click('#af button.btn:not(.secondary)'); parts=[]
        for _ in range(40):
            q.wait_for_timeout(250); parts=api('GET','/api/cases/'+cid)['d'].get('parts') or []
            if any(x.get('name')==f'{rest} {n}' for x in parts): break
        check(any(x.get('name')==f'{rest} {n}' and abs(x.get('quantity')-qn)<1e-9 and x.get('unit')==qu for x in parts),f'{tag}: gebucht {qn} {qu}')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Vorgang)')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
