# [CLAUDE] UI-Test (21.11.2026, Backlog 1655, Blickwinkel „Werkstatt vermerkt eine Bestellung mit vertipptem Liefertermin“): Formular
# „Bestellung vermerken“ am Lagerartikel – Liefertermin mit min (heute) und max (+2 Jahre), Beschriftung (for/id); ein Liefertermin über
# 2 Jahre wird vom Server mit Feld eta abgelehnt (Feld markiert, Meldung übersetzt, nichts vermerkt). DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Liefertermin liegt mehr als 2 Jahre nach dem Bestelldatum','uk':None,'en':None}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bv.inhaber','display_name':'BV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    today=datetime.date.today()
    y2=today.replace(year=today.year+2) if not (today.month==2 and today.day==29) else today.replace(year=today.year+2, day=28)
    far=today.replace(year=today.year+3, day=min(today.day,28)).isoformat()
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        sid=api('POST','/api/stock',{'site':site,'name':f'Bremsbelag BV {n}','min_qty':10,'initial_qty':2,'unit_price_net':5})['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bv.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/stock/{sid}'); q.reload(); q.wait_for_selector('#ordp summary',timeout=15000)
        q.click('#ordp summary'); q.wait_for_selector('#oeta',timeout=15000)
        at=q.evaluate("()=>{const i=document.getElementById('oeta'); return [i.min, i.max, !!document.querySelector('label[for=oeta]')]}")
        check(at[0]==today.isoformat() and at[1]==y2.isoformat() and at[2], f'{tag}: min/max/Beschriftung {at}')
        q.fill('#oqty','5'); q.fill('#oeta',far); q.click('#of button:not([type=button])'); q.wait_for_timeout(600)
        check(q.evaluate("()=>document.getElementById('oeta').validity.rangeOverflow") and not api('GET',f'/api/stock/{sid}')['d'].get('item',{}).get('ordered_on'), f'{tag}: Browser hält Liefertermin > 2 Jahre zurück (max)')
        # Ältere Browser ohne Datumsprüfung / zwischengespeichertes Formular: max entfernen und neu eingeben (Eingabe hebt den Browser-Hinweis auf) → Server lehnt mit Feld eta ab
        q.evaluate("()=>document.getElementById('oeta').removeAttribute('max')"); q.fill('#oeta',''); q.fill('#oeta',far); q.click('#of button:not([type=button])')
        try: q.wait_for_function("()=>document.getElementById('oeta') && document.getElementById('oeta').getAttribute('aria-invalid')==='true'", timeout=8000); mk=True
        except Exception: mk=False
        check(mk, f'{tag}: Feld Liefertermin markiert, Formular offen')
        txt=q.evaluate("()=>{const i=document.getElementById('oeta'); const d=(i.getAttribute('aria-describedby')||'').split(' ').map((x)=>document.getElementById(x)).filter(Boolean); return d.map((e)=>e.innerText).join(' ')}")
        check(bool(txt.strip()) and (lang!='de' or EXP['de'] in txt) and (lang=='de' or EXP['de'] not in txt), f'{tag}: Meldung am Feld übersetzt „{txt[:80]}“')
        check(not api('GET',f'/api/stock/{sid}')['d'].get('item',{}).get('ordered_on'), f'{tag}: nichts vermerkt')
        q.evaluate("()=>document.getElementById('oeta').scrollIntoView({block:'center'})")
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/bv_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
