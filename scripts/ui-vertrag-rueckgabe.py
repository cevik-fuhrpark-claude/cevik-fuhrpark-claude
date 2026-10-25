# [CLAUDE] UI-Test (25.10.2026, Backlog 288 – Blickwinkel „Leasingrückgabe“): Vertragsübersicht zeigt bei Leasing/Miete, die bald enden,
# „Vor der Rückgabe: offene Vorgänge: N“ bzw. „keine offenen Vorgänge …“; DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler/Wortumbruch.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
RET={'de':'Vor der Rückgabe','uk':'Перед поверненням','en':'Before return'}
OPEN={'de':'offene Vorgänge: 1','uk':'відкриті справи: 1','en':'open cases: 1'}
CLEAR={'de':'keine offenen Vorgänge','uk':'немає відкритих справ','en':'no open cases'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); d=lambda n: str(today+datetime.timedelta(days=n))
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vr.inhaber','display_name':'VR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='vr.inhaber' if s['s']==200 else None
    if not user:
        # Server schon eingerichtet: Inhaber anderer Skripte nutzen
        for u in ['vs.inhaber','yilmaz','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: user=u; break
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    V1='VIN:WDB96340310528801'; V2='VIN:WDB96340310528802'
    api('POST','/api/vehicles',{'vin':V1[4:],'plate':'VR-LR 2881','site':'Dortmund'})
    api('POST','/api/vehicles',{'vin':V2[4:],'plate':'VR-LR 2882','site':'Dortmund'})
    r1=api('POST',f'/api/vehicles/{V1}/contracts',{'kind':'leasing','partner':'UI-Rückgabe-Leasing','evidence':'UI-Test','start_date':d(-700),'end_date':d(25)})
    r2=api('POST',f'/api/vehicles/{V2}/contracts',{'kind':'miete','partner':'UI-Rückgabe-Miete','evidence':'UI-Test','start_date':d(-60),'end_date':d(15)})
    check(r1['s'] in (200,201) and r2['s'] in (200,201),f'Verträge angelegt {r1["s"]}/{r2["s"]}')
    c=api('POST','/api/cases',{'vehicle_id':V1,'description':'Delle Seitenverkleidung (UI-Test Rückgabe)','priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    check(c['s'] in (200,201),'Vorgang angelegt '+str(c['s'])+' '+str(c['d'])[:200])
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        cx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=cx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctasof', timeout=15000)
        rows=q.locator('a.row').filter(has_text='UI-Rückgabe-Leasing'); rowm=q.locator('a.row').filter(has_text='UI-Rückgabe-Miete')
        check(rows.count()==1 and RET[lang] in rows.inner_text() and OPEN[lang] in rows.inner_text(),f'{lang} {w}px: Leasing mit offenem Vorgang')
        check(rowm.count()==1 and CLEAR[lang] in rowm.inner_text(),f'{lang} {w}px: Miete ohne Offenes')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/rueckgabe_{lang}_{w}.png', full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        cx.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
