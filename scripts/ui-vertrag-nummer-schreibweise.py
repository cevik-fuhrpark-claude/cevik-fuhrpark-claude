# [CLAUDE] UI-Test (04.11.2026, Backlog 996, Blickwinkel „Leasinggeber schickt die Vertragsbestätigung erneut, Kollegin erfasst sie ein zweites Mal“):
# Fahrzeugakte → „Vertrag erfassen“ mit mitkopierter Bezeichnung („Versicherungsschein-Nr.: …“, länger als 60 Zeichen) → gespeichert ohne Bezeichnung;
# zweites Erfassen derselben Nummer in anderer Schreibweise („lv2024.0815.3“) → Meldung „gibt es bereits“, kein zweiter Vertrag.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DUP={'de':'gibt es für das Fahrzeug bereits','uk':'вже існує','en':'already exists'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    for i,lang in enumerate(['de','uk','en']):
      for j,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        vin=f'WDB96340310{R:05d}{i}{j}'[:17]; vid='VIN:'+vin
        r=api('POST','/api/vehicles',{'plate':f'TZ-V{R%1000} {i}{j}6','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/vehicles/'+vid); m.reload(); m.wait_for_selector('#ctf',state='attached',timeout=20000)
        def fill(no):
            m.evaluate("()=>{ const d=document.querySelector('#ctf').closest('details'); if(d) d.open=true; }")
            m.select_option('#ctf select[name=kind]','leasing'); m.fill('#ctf input[name=partner]','Straßen-Leasing GmbH')
            m.fill('#ctf input[name=contract_no]',no)
            ev=m.query_selector('#ctf [name=evidence]')
            if ev: ev.fill('Vertragsbestätigung')
            m.click('#ctf button.btn')
        fill('Leasingvertrag Nummer:   LV 2024/0815-3')
        for _ in range(40):
            cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
            if cs: break
            m.wait_for_timeout(250)
        check(len(cs)==1 and cs[0]['contract_no']=='LV 2024/0815-3',f'{lang} {w}px: gespeichert ohne Bezeichnung {[c["contract_no"] for c in cs]}')
        m.wait_for_selector('#ctf',state='attached',timeout=20000); m.wait_for_timeout(300)
        page_txt=m.inner_text('body')
        check('Leasingvertrag Nummer' not in page_txt and 'LV 2024/0815-3' in page_txt,f'{lang} {w}px: Akte zeigt Nummer ohne Bezeichnung')
        ml=m.evaluate("()=>document.querySelector('#ctf input[name=contract_no]').maxLength")
        check(ml==90,f'{lang} {w}px: Feld nimmt mitkopierte Bezeichnung auf ({ml})')
        fill('lv2024.0815.3')
        m.wait_for_function("(t)=>[...document.querySelectorAll('.toast,#toast,[role=alert],[role=status]')].some(e=>e.textContent.includes(t))",arg=DUP[lang],timeout=10000)
        check(True,f'{lang} {w}px: Meldung „gibt es bereits“')
        if SHOTS: m.screenshot(path=f'{SHOTS}/vertrag_nummer_{lang}_{w}.png')
        cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
        check(len(cs)==1,f'{lang} {w}px: kein zweiter Vertrag ({len(cs)})')
        check(m.input_value('#ctf input[name=contract_no]')=='lv2024.0815.3',f'{lang} {w}px: Eingabe bleibt')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
