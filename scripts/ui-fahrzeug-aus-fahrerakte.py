# [CLAUDE] UI-Test (16.11.2026, Backlog 1532, Blickwinkel „Leitung legt einen neuen Fahrer an und will ihm gleich sein Fahrzeug geben“):
# Fahrerakte zeigt die zugeordneten Fahrzeuge als Link mit „Beenden“, „zurzeit keins zugeordnet“, Formular „Fahrzeug zuordnen“ (Fahrzeuge
# erst beim Aufklappen geladen, Anhänger hinten, eigene Fahrzeuge fehlen), Fahrzeugwechsel, Hinweis bei Akte ohne App-Konto. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ASG={'de':'Fahrzeug zuordnen','uk':'Закріпити ТЗ','en':'Assign vehicle'}
NONE={'de':'zurzeit keins zugeordnet','uk':'зараз не закріплено жодного','en':'none assigned at present'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fa.inhaber','display_name':'FA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    def invite(un,dn,role):
        u=api('POST','/api/users',{'username':un,'display_name':dn,'role':role,'environment':envn})
        check(u['s']==201,f'Konto {un}')
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d']['id']
    invite('fa.leitung','FA Leitung','fleet')
    for plate,vin,kind in [('FA-AB 1532','WDB96340315320001','lkw'),('FA-CD 1532','WDB96340315320002','lkw'),('FA-AH 1532','WDB96340315320003','anhaenger')]:
        check(api('POST','/api/vehicles',{'plate':plate,'vin':vin,'site':'Dortmund','kind':kind})['s'] in (200,201),f'Fahrzeug {plate}')
    akten={}
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        k=f'{lang}{wd}'
        u=invite(f'fa.f{k}',f'Neu Fahrer {k}','driver')
        r=api('POST','/api/drivers',{'display_name':f'Neu Fahrer {k}','user_id':u}); check(r['s']==201,f'Akte {k}'); akten[k]=r['d']['id']
    kl=api('POST','/api/drivers',{'display_name':'Ivan Kontolos'}); check(kl['s']==201,'Akte ohne Konto')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        k=f'{lang}{wd}'; did=akten[k]
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fa.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/drivers/'+did); q.reload(); q.wait_for_selector('#dvasg',timeout=15000); q.wait_for_timeout(400)
        check(NONE[lang] in q.locator('[data-dveh]').inner_text(),f'{k}: „{NONE[lang]}“')
        q.evaluate("()=>{const d=document.querySelector('#dvasg'); if(!d.open) d.open=true}"); q.wait_for_function("()=>document.querySelectorAll('#dvsel option').length>1",timeout=10000)
        opts=q.evaluate("()=>[...document.querySelectorAll('#dvsel option')].map(o=>o.textContent)")
        check(len(opts)>=4 and 'FA-AH 1532' in opts[-1],f'{k}: Anhänger hinten {opts[-1:]}')
        check(not q.locator('#dvend').is_checked(),f'{k}: ohne Fahrzeug kein Haken „bisherige beenden“')
        q.select_option('#dvsel',index=[i for i,o in enumerate(opts) if o.startswith('FA-AB 1532')][0]); q.locator('#dvf button').click()
        q.wait_for_selector('[data-dveh] a[href*="WDB96340315320001"]',timeout=10000); q.wait_for_timeout(400)
        check(q.locator('[data-dveh] [data-dend]').count()==1,f'{k}: Beenden-Knopf')
        # Fahrzeugwechsel: Haken jetzt gesetzt
        q.evaluate("()=>{const d=document.querySelector('#dvasg'); if(!d.open) d.open=true}"); q.wait_for_function("()=>document.querySelectorAll('#dvsel option').length>1",timeout=10000)
        opts=q.evaluate("()=>[...document.querySelectorAll('#dvsel option')].map(o=>o.textContent)")
        check(not any(o.startswith('FA-AB 1532') for o in opts),f'{k}: eigenes Fahrzeug nicht in der Auswahl')
        check(q.locator('#dvend').is_checked(),f'{k}: mit Fahrzeug Haken gesetzt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrzeug_aus_fahrerakte_{k}.png',full_page=False)
        q.select_option('#dvsel',index=[i for i,o in enumerate(opts) if o.startswith('FA-CD 1532')][0]); q.locator('#dvf button').click()
        q.wait_for_selector('[data-dveh] a[href*="WDB96340315320002"]',timeout=10000); q.wait_for_timeout(400)
        check(q.locator('[data-dveh] a').count()==1,f'{k}: Wechsel – nur noch FA-CD 1532')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{k}: ohne Querscrollen')
        q.locator('[data-dveh] [data-dend]').click(); q.wait_for_function(f"()=>(document.querySelector('[data-dveh]')||{{}}).textContent?.includes({NONE[lang]!r})",timeout=10000)
        check(True,f'{k}: Zuordnung beendet')
        if wd==390:
            q.goto(B+'/#/drivers/'+kl['d']['id']); q.wait_for_selector('[data-asgnoacc]',timeout=10000)
            check(q.locator('#dvasg').count()==0 and q.locator('[data-dveh]').count()==0,f'{k}: ohne Konto kein Formular, Hinweis')
        check(not errs,f'{k}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
