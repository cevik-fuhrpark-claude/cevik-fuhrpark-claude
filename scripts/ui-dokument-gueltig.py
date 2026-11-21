# [CLAUDE] UI-Test (21.11.2026, Backlog 1658, Blickwinkel „Leitung lädt die Versicherungsbestätigung hoch und vertippt „gültig bis““):
# Fahrzeugakte → Dokument hochladen/korrigieren: „Gültig bis“ mit min 1990/max heute + 20 Jahre, Beschriftungen mit for/id; ohne
# Browser-Grenze lehnt der Server mit Feld valid_until ab (Feld markiert, Meldung übersetzt, nichts hochgeladen/geändert).
# DE/UK/EN, 390/820/1366 px. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, tempfile
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'„Gültig bis“ liegt vor 1990','uk':None,'en':None}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
y20=today.replace(year=today.year+20) if not (today.month==2 and today.day==29) else today.replace(year=today.year+20, day=28)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dg.inhaber','display_name':'DG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310165801'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'DG-AB 1658','vin':VIN,'site':'Dortmund','kind':'lkw'})
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        f=tempfile.NamedTemporaryFile(suffix='.pdf',delete=False); f.write(f'%PDF-1.4\n% Versicherung {n}\n%%EOF'.encode()); f.close()
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dg.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{vid}'); q.reload(); q.wait_for_selector('#docf',state='attached',timeout=15000)
        q.evaluate("()=>{const d=document.getElementById('docf').closest('details'); if(d) d.open=true;}")
        at=q.evaluate("()=>{const i=document.getElementById('dfvalid'); return [i.min,i.max,['dfkind','dfnote','dfvalid','dffile'].every((x)=>document.querySelector('label[for='+x+']'))]}")
        check(at==['1990-01-01',y20.isoformat(),True], f'{tag}: Hochladen min/max/Beschriftungen {at}')
        before=len(api('GET',f'/api/vehicles/{vid}')['d'].get('documents') or [])
        q.set_input_files('#dffile',f.name); q.select_option('#dfkind','versicherung')
        q.evaluate("()=>document.getElementById('dfvalid').removeAttribute('min')"); q.fill('#dfvalid','1989-12-31')
        q.click('#docf button:not([type=button])')
        try: q.wait_for_function("()=>document.getElementById('dfvalid') && document.getElementById('dfvalid').getAttribute('aria-invalid')==='true'", timeout=10000); mk=True
        except Exception: mk=False
        check(mk, f'{tag}: Feld markiert, Formular offen')
        txt=q.evaluate("()=>{const i=document.getElementById('dfvalid'); return (i.getAttribute('aria-describedby')||'').split(' ').map((x)=>document.getElementById(x)).filter(Boolean).map((e)=>e.innerText).join(' ')}")
        check(bool(txt.strip()) and ((EXP['de'] in txt) == (lang=='de')), f'{tag}: Meldung am Feld übersetzt „{txt[:60]}“')
        check(len(api('GET',f'/api/vehicles/{vid}')['d'].get('documents') or [])==before, f'{tag}: nichts hochgeladen')
        q.evaluate("()=>document.getElementById('dfvalid').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dg_{lang}_{w}.png')
        # Korrigieren: nach einem gültigen Upload hat das Formular dieselben Grenzen
        if n==1:
            q.fill('#dfvalid',''); q.fill('#dfvalid',(today+datetime.timedelta(days=200)).isoformat()); q.click('#docf button:not([type=button])')
            q.wait_for_selector('#docedit',state='attached',timeout=15000)
        if q.locator('#devalid').count():
            at=q.evaluate("()=>{const i=document.getElementById('devalid'); return [i.min,i.max,['desel','dekind','denote','devalid'].every((x)=>document.querySelector('label[for='+x+']'))]}")
            check(at==['1990-01-01',y20.isoformat(),True], f'{tag}: Korrigieren min/max/Beschriftungen {at}')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close(); os.unlink(f.name)
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
