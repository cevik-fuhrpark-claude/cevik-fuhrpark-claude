# [CLAUDE] UI-Test (01.11.2026, Backlog 831, Blickwinkel „Werkstatt schließt Reparatur am Anhänger mit km der Zugmaschine ab“):
# „Kontrolle nach Reparatur“ am Anhänger zeigt am km-Feld den Hinweis „nur Achskilometerzähler des Anhängers“ (#irvkmtr), beim Lkw nicht.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Wortbruch im Hinweis/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Achskilometerzählers','uk':'на осі причепа','en':'hub odometer'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ka.inhaber','display_name':'KA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ka.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'ka-{action}-{R}-{n}-{cid[-6:]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        u=api('POST','/api/users',{'username':f'ka.ws{R}.{n}','display_name':f'KA Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'ka.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for kind,pl in [('anhaenger',f'KA-A {R%900}{n}'),('lkw',f'KA-L {R%900}{n}')]:
            vin=f'WKA{kind[0].upper()}{R:05d}K{n:04d}000'[:17]
            check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':kind,'site':'Dortmund'})['s']==201,f'{lang}/{w}: {kind} angelegt')
            c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rückleuchte defekt (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'ka-{R}-{n}-{kind}'})
            check(c['s']==201,f'{lang}/{w}: Vorgang {kind} ({c["s"]})')
            if c['s']!=201: continue
            cid=c['d']['id']
            check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Rückleuchte tauschen')==200,f'{lang}/{w}: freigegeben')
            check(cmd(q,cid,'start_repair')==200,f'{lang}/{w}: Reparatur begonnen')
            q.goto(B+f'/#/inspect/{cid}'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
            has=q.locator('#irvkmtr').count()==1
            if kind=='anhaenger':
                tx=q.inner_text('#irvkmtr') if has else ''
                check(has and HINT[lang] in tx,f'{lang}/{w}: Anhänger-Hinweis am km-Feld ({tx[:40]!r})')
                check(q.evaluate("(()=>{const e=document.querySelector('#irvkmtr'); const l=e.closest('label'); return !!l && l.getAttribute('for')==='km';})()"),f'{lang}/{w}: Hinweis gehört zum km-Feld')
                check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
                if SHOTS: q.locator('#km').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/irv-anh-{lang}-{w}.png')
            else:
                check(not has,f'{lang}/{w}: Lkw ohne Anhänger-Hinweis')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
