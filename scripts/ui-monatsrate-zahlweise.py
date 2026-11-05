# [CLAUDE] UI-Test (05.11.2026, Backlog 1004, Blickwinkel „Versicherung und Kfz-Steuer werden jährlich bezahlt – Leitung trägt die Jahresprämie ein“):
# Fahrzeugakte → „Vertrag erfassen“: „4.800 € jährlich“ (UK „4800 на рік“, EN „4,800 per year“) im Feld Monatsrate wird beim Verlassen in der App-Sprache
# erklärt (Jahresbetrag, nicht umgerechnet), Speichern legt keinen Vertrag an; „400 €/Monat“ wird zu „400 €“ und als Monatsrate 400 gespeichert.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
YEAR={'de':'4.800 € jährlich','uk':'4800 на рік','en':'4,800 per year'}
MON={'de':'400 €/Monat','uk':'400 €/місяць','en':'400 €/month'}
WANT={'de':'Jahresbetrag','uk':'річна сума','en':'annual amount'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'mr.inhaber','display_name':'MR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'mr.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['km.inhaber','tz.inhaber','nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    for i,lang in enumerate(['de','uk','en']):
      for j,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        tag=f'{lang} {w}px'
        vin=f'WDB96340310{R%10000:04d}{i}{j}'; vid='VIN:'+vin
        r=api('POST','/api/vehicles',{'plate':f'MR-V{R%1000} {i}{j}4','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/vehicles/'+vid); m.reload(); m.wait_for_selector('#ctf',state='attached',timeout=20000)
        m.evaluate("()=>{ const d=document.querySelector('#ctf').closest('details'); if(d) d.open=true; }")
        m.select_option('#ctf select[name=kind]','versicherung'); m.fill('#ctf input[name=partner]','Muster-Versicherung AG')
        ev=m.query_selector('#ctf [name=evidence]')
        if ev: ev.fill('Police 2027')
        f=m.locator('#ctf input[name=monthly_rate_net]'); f.click(); f.type(YEAR[lang]); f.evaluate('el => el.blur()')
        msg=m.evaluate("document.querySelector('#ctf input[name=monthly_rate_net]').validationMessage")
        check(WANT[lang] in msg,f'{tag}: „{YEAR[lang]}“ als Jahresbetrag erklärt ({msg[:60]!r})')
        check(m.input_value('#ctf input[name=monthly_rate_net]')==YEAR[lang],f'{tag}: Wert nicht umgerechnet/verändert')
        if SHOTS and j==0 or SHOTS and (i,j) in ((1,1),(2,2)): f.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/monatsrate-{lang}-{w}.png')
        m.click('#ctf button.btn'); m.wait_for_timeout(700)
        cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
        check(len(cs)==0,f'{tag}: Jahresbetrag nicht gespeichert ({len(cs)})')
        f.fill(''); f.type(MON[lang]); f.evaluate('el => el.blur()')
        check(m.evaluate("document.querySelector('#ctf input[name=monthly_rate_net]').validity.valid"),f'{tag}: „{MON[lang]}“ gültig')
        check(m.input_value('#ctf input[name=monthly_rate_net]')=='400 €',f'{tag}: Zahlweise entfernt ({m.input_value("#ctf input[name=monthly_rate_net]")!r})')
        m.click('#ctf button.btn')
        for _ in range(40):
            cs=api('GET',f'/api/vehicles/{vid}')['d'].get('contracts') or []
            if cs: break
            m.wait_for_timeout(250)
        check(len(cs)==1 and cs[0]['monthly_rate_net']==400,f'{tag}: Monatsrate 400 gespeichert {[c.get("monthly_rate_net") for c in cs]}')
        check(m.evaluate(noscroll),f'{tag}: ohne Querscrollen')
        check(not errs,f'{tag}: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
