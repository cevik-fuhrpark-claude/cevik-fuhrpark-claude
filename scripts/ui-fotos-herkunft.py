# [CLAUDE] UI-Test (24.10.2026, Backlog 223, Teilagent „Werkstatt-Tablet auf Ukrainisch mit Fotos“): Leitung hängt ein Schadensfoto an,
# gibt an die Werkstatt Dortmund frei; die Werkstatt lädt über „Fotos/PDF hinzufügen“ ein eigenes Foto hoch (Dateiauswahl ohne
# Kamera-Zwang). Unter jeder Datei stehen Zeitpunkt, Rolle und Name. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, io, base64
from playwright.sync_api import sync_playwright
from PIL import Image
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, b64]) => { const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-cfp': '1', 'x-filename': 'schaden-meldung.jpg' }, body: bin }); return r.status; }"""
BTN={'de':'Fotos/PDF hinzufügen','uk':'Додати фото/PDF','en':'Add photos/PDF'}
ROLE_FLEET={'de':'Inhaber','uk':'Власник','en':'Owner'}
ROLE_WS={'de':'Werkstatt','uk':'Майстерня','en':'Workshop'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def jpeg(color, path=None):
    im=Image.new('RGB',(2400,1800),color); b=io.BytesIO(); im.save(b,'JPEG',quality=85)
    if path: open(path,'wb').write(b.getvalue())
    return b.getvalue()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=uuid.uuid4().hex[:4].lower()
    u=api('POST','/api/users',{'username':'fh.werkstatt.'+tag,'display_name':'FH Werkstatt Dortmund','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    vin='WDB9634031F'+str(uuid.uuid4().int)[:6]; plate='FH-T '+str(uuid.uuid4().int)[:3]
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Stoßfänger hinten eingedrückt','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else r['d']['id']
    check(a.evaluate(UP,['/api/cases/'+cid+'/files',base64.b64encode(jpeg((180,40,40))).decode()])==201,'Schadensfoto der Leitung')
    c=api('GET','/api/cases/'+cid)['d']['case']
    check(api('POST','/api/cases/'+cid+'/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'note':'reparieren','payload':{'workshop_site':'DORTMUND'}})['s']==200,'Freigabe an Werkstatt Dortmund')
    tmp=os.environ.get('TMPDIR','/tmp'); photo=os.path.join(tmp,'fh-reparatur-'+tag+'.jpg'); jpeg((40,120,40),photo)
    uploaded=False
    for lang,(w,h) in [(l,v) for l in ['uk','de','en'] for v in [(820,1180),(390,844),(1366,900)]]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fh.werkstatt.'+tag,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('.thumbs figure.thumb',timeout=15000)
        if not uploaded:
            lab=q.locator('label.btn:has(#file)')
            check(lab.inner_text().strip()==BTN[lang],f'{lang}/{w}: Knopf „{BTN[lang]}“ ({lab.inner_text().strip()!r})')
            check(q.locator('#file').get_attribute('capture') is None,f'{lang}/{w}: Dateiauswahl ohne Kamera-Zwang')
            check('application/pdf' in (q.locator('#file').get_attribute('accept') or ''),f'{lang}/{w}: PDF wählbar')
            q.set_input_files('#file',photo)
            q.wait_for_selector('.thumbs figure.thumb:nth-of-type(2)',timeout=20000); uploaded=True
            q.wait_for_timeout(300)
        figs=q.locator('.thumbs figure.thumb')
        check(figs.count()==2,f'{lang}/{w}: zwei Dateien ({figs.count()})')
        caps=[figs.nth(i).locator('figcaption').inner_text() for i in range(figs.count())]
        check(ROLE_FLEET[lang] in caps[0] and 'AS Inhaber' in caps[0],f'{lang}/{w}: 1. Datei: Rolle und Name ({caps[0]!r})')
        check(ROLE_WS[lang] in caps[1] and 'FH Werkstatt' in caps[1],f'{lang}/{w}: 2. Datei: Werkstatt ({caps[1]!r})')
        check(all(any(ch.isdigit() for ch in cp.split('\n')[0]) for cp in caps),f'{lang}/{w}: Zeitpunkt je Datei')
        alt=figs.nth(1).locator('img').get_attribute('alt') or ''
        check(ROLE_WS[lang] in alt,f'{lang}/{w}: Alternativtext nennt Rolle ({alt[:60]!r})')
        # Bildunterschrift bleibt in der Kachelbreite
        wid=q.evaluate("Math.max(...[...document.querySelectorAll('.thumbs figure.thumb figcaption')].map((e)=>e.scrollWidth))")
        check(wid<=100,f'{lang}/{w}: Unterschrift in Kachelbreite ({wid}px)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('.thumbs').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fotos-herkunft-{lang}-{w}.png')
        if w==820:
            q.goto(B+'/#/help?s=ws'); q.wait_for_timeout(800)
            check(BTN[lang] in q.evaluate('document.body.innerText'),f'{lang}/{w}: Hilfe Werkstatt nennt „{BTN[lang]}“')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
