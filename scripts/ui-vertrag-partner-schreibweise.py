# [CLAUDE] UI-Test (04.11.2026, Backlog 997, Folge aus 996): Vertragsübersicht → Auswahl „Vertragspartner“ fasst „STRASSEN-VERSICHERUNG AG“,
# „Straßen–Versicherung  AG“ und „straßen-versicherung ag“ zu einem Eintrag „Straßen–Versicherung AG (3)“ zusammen; Auswahl zeigt alle drei Verträge.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
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
    for i,sp in enumerate([f'STRASSEN-VERSICHERUNG {R} AG',f'Straßen–Versicherung {R}  AG',f'straßen-versicherung {R} ag']):
        vin=f'WDB96340320{R:05d}P{i}'[:17]; vid='VIN:'+vin
        r=api('POST','/api/vehicles',{'plate':f'TZ-P{R%1000} {i}7','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
        r=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'versicherung','partner':sp,'contract_no':f'P{R}-{i}','evidence':'Police (Test)','start_date':'2025-01-01'}); check(r['s']==201,f'Vertrag {i} {r["s"]}')
    r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',{'kind':'leasing','partner':f'Anderer Partner {R}','evidence':'Vertrag (Test)','start_date':'2025-01-01'}); check(r['s']==201,f'anderer Partner {r["s"]}') # Auswahl erscheint erst ab zwei Partnern
    want=f'Straßen–Versicherung {R} AG'
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/contracts'); m.reload(); m.wait_for_selector('#ctpartner',state='attached',timeout=20000)
        opts=m.eval_on_selector_all('#ctpartner option','os=>os.map(o=>o.textContent)')
        mine=[o for o in opts if str(R) in o and 'ersicherung' in o]
        check(mine==[f'{want} (3)'],f'{lang} {w}px: ein Eintrag mit 3 Verträgen {mine}')
        m.select_option('#ctpartner',value=want)
        m.wait_for_function("(r)=>{ const s=document.querySelector('#ctpartner'); return s && s.value===r; }",arg=want,timeout=15000)
        m.wait_for_timeout(300)
        n=m.evaluate(f"()=>[...document.querySelectorAll('#app a.row')].filter(a=>a.textContent.includes('P{R}-')).length")
        check(n==3,f'{lang} {w}px: Auswahl zeigt alle drei Verträge ({n})')
        if SHOTS: m.screenshot(path=f'{SHOTS}/vertrag_partner_{lang}_{w}.png')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
