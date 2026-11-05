# [CLAUDE] UI-Test Backlog 1014: zulässige Gesamtmasse (Fahrzeugakte → HU / SP → Prüfrelevante Daten) – „18 t“/„18 т“/„18 tonnes“ am Feld
# in der App-Sprache erklärt und nicht gespeichert; „18.000 kg“ beim Verlassen zu „18.000“, gespeichert 18000; DE/UK/EN 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh bzw. PORT=8788 + CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TON={'de':'18 t','uk':'18 т','en':'18 tonnes'}
WANT={'de':'Tonnen','uk':'тоннах','en':'tonnes'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gm.inhaber','display_name':'GM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'gm.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['kk.inhaber','mr.inhaber','i.inhaber','km.inhaber','tz.inhaber','nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    for i,lang in enumerate(['de','uk','en']):
      for j,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        tag=f'{lang} {w}px'
        vin=f'WDB96340321{R%10000:04d}{i}{j}'; vid='VIN:'+vin
        r=api('POST','/api/vehicles',{'plate':f'GM-V{R%1000} {i}{j}4','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/vehicles/'+vid); m.reload(); m.wait_for_selector('#specf',state='attached',timeout=20000)
        m.evaluate("()=>{ const d=document.querySelector('#specf').closest('details'); if(d) d.open=true; d.scrollIntoView(); }")
        m.fill('#specf input[name=spec_source]','Fahrzeugschein F.2')
        m.fill('#specf input[name=zgm_kg]',TON[lang]); m.press('#specf input[name=zgm_kg]','Tab')
        msg=m.evaluate("()=>document.querySelector('#specf input[name=zgm_kg]').validationMessage")
        check(WANT[lang] in msg,f'{tag}: „{TON[lang]}“ am Feld erklärt ({msg[:60]!r})')
        if SHOTS: m.screenshot(path=f'{SHOTS}/gesamtmasse-{lang}-{w}.png')
        m.click('#specf button.btn'); m.wait_for_timeout(600)
        d=api('GET',f'/api/vehicles/{vid}')['d']; v=d.get('vehicle') or d
        check(not v.get('zgm_kg'),f'{tag}: Tonnenwert nicht gespeichert ({v.get("zgm_kg")})')
        m.fill('#specf input[name=zgm_kg]','18.000 kg'); m.press('#specf input[name=zgm_kg]','Tab')
        check(m.input_value('#specf input[name=zgm_kg]')=='18.000',f'{tag}: Einheit beim Verlassen entfernt ({m.input_value("#specf input[name=zgm_kg]")!r})')
        m.click('#specf button.btn')
        for _ in range(40):
            d=api('GET',f'/api/vehicles/{vid}')['d']; v=d.get('vehicle') or d
            if v.get('zgm_kg'): break
            m.wait_for_timeout(250)
        check(v.get('zgm_kg')==18000,f'{tag}: 18000 kg gespeichert ({v.get("zgm_kg")})')
        check(m.evaluate(noscroll),f'{tag}: ohne Querscrollen')
        check(not errs,f'{tag}: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
