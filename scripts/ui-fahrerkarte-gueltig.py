# [CLAUDE] UI-Test (21.11.2026, Backlog 1656, Blickwinkel „Leitung erfasst eine neue Fahrerkarte mit vertipptem Jahr“): Fahrerakte →
# „Nachweis hinzufügen“: Ausgestellt am mit min/max (heute), Gültig bis bei Fahrerkarte höchstens Ausstellung (sonst heute) + 63 Monate,
# bei anderen Arten heute + 20 Jahre; der Browser hält ein vertipptes Jahr zurück; ohne Browser-Grenze lehnt der Server mit Feld valid_until
# ab (Feld markiert, Meldung übersetzt, nichts gespeichert). DE/UK/EN, 390/820/1366 px. Frischer Dev-Server nötig. CFP_SHOTS=<Ordner>.
import os, datetime, calendar
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Fahrerkarte gilt höchstens 5 Jahre','uk':'Картка водія дійсна не більше 5 років','en':'A driver card is valid for at most 5 years'}
def addm(d, n):
    m=d.month-1+n; y=d.year+m//12; m=m%12+1; return datetime.date(y,m,min(d.day,calendar.monthrange(y,m)[1]))
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.today(); iss=addm(today,-12)
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        D=api('POST','/api/drivers',{'display_name':f'Fahrer FK {n}'})['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/drivers/{D}'); q.reload(); q.wait_for_selector('#ddf',state='attached',timeout=15000)
        q.evaluate("()=>{const d=document.getElementById('ddf').closest('details'); d.open=true;}")
        mx=lambda: q.evaluate("()=>[document.getElementById('ddissued').min, document.getElementById('ddissued').max, document.getElementById('ddvalid').min, document.getElementById('ddvalid').max]")
        at=mx(); check(at[0]=='1950-01-01' and at[1]==today.isoformat() and at[3]==addm(today,240).isoformat(), f'{tag}: Führerschein min/max {at}')
        q.select_option('#ddkind','fahrerkarte'); at=mx(); check(at[3]==addm(today,63).isoformat(), f'{tag}: Fahrerkarte max heute+63 Monate {at[3]}')
        q.fill('#ddissued',iss.isoformat()); q.dispatch_event('#ddissued','change'); at=mx(); check(at[3]==addm(iss,63).isoformat(), f'{tag}: Fahrerkarte max Ausstellung+63 Monate {at[3]}')
        far=addm(iss,72).isoformat()
        q.fill('#ddvalid',far); q.fill('#ddev','Kopie Fahrerkarte'); q.click('#ddf button:not([type=button])'); q.wait_for_timeout(600)
        check(q.evaluate("()=>document.getElementById('ddvalid').validity.rangeOverflow"), f'{tag}: Browser hält Tippfehler zurück')
        q.evaluate("()=>document.getElementById('ddvalid').removeAttribute('max')"); q.fill('#ddvalid',''); q.fill('#ddvalid',far); q.click('#ddf button:not([type=button])')
        try: q.wait_for_function("()=>document.getElementById('ddvalid') && document.getElementById('ddvalid').getAttribute('aria-invalid')==='true'", timeout=8000); mk=True
        except Exception: mk=False
        check(mk, f'{tag}: Server-Fehler am Feld Gültig bis markiert')
        txt=q.evaluate("()=>{const i=document.getElementById('ddvalid'); return (i.getAttribute('aria-describedby')||'').split(' ').map((x)=>document.getElementById(x)).filter(Boolean).map((e)=>e.innerText).join(' ')}")
        check(EXP[lang] in txt, f'{tag}: Meldung übersetzt „{txt[:70]}“')
        check(not api('GET',f'/api/drivers/{D}')['d']['documents'], f'{tag}: nichts gespeichert')
        q.evaluate("()=>document.getElementById('ddvalid').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fk_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
