# [CLAUDE] UI-Test Backlog 1013: km-Kontingent als Jahreswert („120.000 km/Jahr“, „на рік“, „per year“) im Vertragsformular der Fahrzeugakte
# mit Hinweis in der App-Sprache DE/UK/EN abgewiesen (nicht gespeichert, nicht umgerechnet); „360.000 km gesamt“ gespeichert; 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh bzw. PORT=8788 + CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
YEAR={'de':'120.000 km/Jahr','uk':'120 000 км на рік','en':'120,000 km per year'}
WANT={'de':'Laufleistung pro Jahr','uk':'пробіг за рік','en':'mileage per year'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kk.inhaber','display_name':'KK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'kk.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['mr.inhaber','i.inhaber','km.inhaber','tz.inhaber','nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    for i,lang in enumerate(['de','uk','en']):
      for j,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        tag=f'{lang} {w}px'
        vin=f'WDB96340320{R%10000:04d}{i}{j}'; vid='VIN:'+vin
        r=api('POST','/api/vehicles',{'plate':f'KK-V{R%1000} {i}{j}4','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/vehicles/'+vid); m.reload(); m.wait_for_selector('#ctf',state='attached',timeout=20000)
        m.evaluate("()=>{ const d=document.querySelector('#ctf').closest('details'); if(d) d.open=true; }")
        m.select_option('#ctf select[name=kind]','leasing'); m.fill('#ctf input[name=partner]','Muster-Leasing GmbH')
        ev=m.query_selector('#ctf [name=evidence]')
        if ev: ev.fill('Leasingvertrag')
        m.fill('#ctf input[name=start_km]','10000'); m.fill('#ctf input[name=km_allowance]',YEAR[lang])
        m.click('#ctf button.btn'); m.wait_for_selector('.toast.err',timeout=8000)
        msg=m.inner_text('.toast.err')
        check(WANT[lang] in msg,f'{tag}: „{YEAR[lang]}“ als Jahreswert erklärt ({msg[:60]!r})')
        cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
        check(len(cs)==0,f'{tag}: Jahreswert nicht gespeichert ({len(cs)})')
        check(m.input_value('#ctf input[name=km_allowance]')==YEAR[lang],f'{tag}: Eingabe bleibt stehen')
        if SHOTS: m.screenshot(path=f'{SHOTS}/kmkont-{lang}-{w}.png')
        m.evaluate("()=>document.querySelectorAll('.toast').forEach((x)=>x.remove())")
        m.fill('#ctf input[name=km_allowance]','360.000 km gesamt')
        m.click('#ctf button.btn')
        for _ in range(40):
            cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
            if cs: break
            m.wait_for_timeout(250)
        check(len(cs)==1 and cs[0].get('km_allowance')==360000,f'{tag}: Gesamtkontingent 360000 gespeichert {[c.get("km_allowance") for c in cs]}')
        check(m.evaluate(noscroll),f'{tag}: ohne Querscrollen')
        check(not errs,f'{tag}: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
