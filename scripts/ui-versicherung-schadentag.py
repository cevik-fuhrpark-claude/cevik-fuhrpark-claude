# [CLAUDE] UI-Test (21.11.2026, Backlog 1650, Blickwinkel „Leitung erfasst einen Versicherungsfall mit vertipptem Jahr“): Vorgang mit
# Schadenzeitpunkt → Formular „Versicherungsfall“ setzt min (Schadentag) und for/id an Gemeldet am, Erstattet am, Besichtigung, Gutachten,
# Anzeige; ein Meldedatum vor dem Schadentag lehnt der Server mit Feld reported_on ab (Formular offen, Feld markiert, Meldung übersetzt).
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Datum liegt vor dem Schadenzeitpunkt des Vorgangs – bitte Jahr prüfen.','uk':'Дата раніша за час пошкодження у заявці – перевірте рік.','en':'The date is before the damage time of the case – please check the year.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vs.inhaber','display_name':'VS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    d=lambda n:(datetime.date.today()+datetime.timedelta(days=n)).isoformat()
    VID='VIN:WDB96340310165001'; api('POST','/api/vehicles',{'plate':'VS-UI 1650','vin':'WDB96340310165001','kind':'lkw'})
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        cid=api('POST','/api/cases',{'vehicle_id':VID,'description':f'Unfall Heck beim Rangieren {n}','priority':'mittel','driveability':'fahrbereit','request_key':f'vs-{os.getpid()}-{n}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        o=api('POST',f'/api/cases/{cid}/commands',{'action':'set_occurred_at','command_id':f'vso-{os.getpid()}-{n}','expected_version':v,'payload':{'occurred_at':d(-3)}})
        check(o['s']==200, f'{tag}: Schadenzeitpunkt {o["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vs.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('#clf',state='attached',timeout=15000)
        q.evaluate("()=>{ document.querySelector('#clf').closest('details').open=true; }")
        at=q.evaluate("()=>['clrep','clreimb','caon','carec','cpon'].map((i)=>{const e=document.getElementById(i); return e && e.min===arguments[0] && !!document.querySelector('label[for='+i+']');})".replace('arguments[0]',repr(d(-3))))
        check(all(at), f'{tag}: min/Beschriftung {at}')
        q.fill('#clf [name=insurer]','Test-Versicherung AG'); q.fill('#clf [name=evidence]','Schadenmeldung')
        q.evaluate("()=>document.getElementById('clrep').removeAttribute('min')"); q.fill('#clrep', d(-4))
        q.click('#clf button.btn')
        try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=8000); shown=True
        except Exception: shown=False
        check(shown, f'{tag}: Meldung übersetzt sichtbar')
        check(q.evaluate("()=>document.getElementById('clrep') && document.getElementById('clrep').getAttribute('aria-invalid')")=='true', f'{tag}: Feld markiert')
        check(not api('GET',f'/api/cases/{cid}')['d'].get('claim'), f'{tag}: nichts gespeichert')
        q.evaluate("()=>document.getElementById('clrep').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vs_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
