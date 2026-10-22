# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „Standortschlüssel“): Leitung mit Standard-Standort „Dortmund“ – Fahrerakten und
# Auslese-Fristen nennen ausgeblendete Fahrer ohne Standort („mit Alle sichtbar“); Werkstattauftrag aus Prüftermin wählt bei Standort
# „Muenchen“ die Werkstatt München (Code), bei „Hamburg“ keine (statt still Dortmund). DE/UK/EN, 390/820/1366 px, ohne Querscrollen/
# Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'ohne Standort sind ausgeblendet','uk':'без локації приховані','en':'without a site are hidden'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sk.inhaber','display_name':'SK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'sk.leitung','display_name':'SK Leitung','role':'fleet','environment':envn})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
    check(q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s']==200,'Leitung angelegt')
    for n,site in [('SK Ohne A',None),('SK Ohne B',None),('SK Dortmund','Dortmund')]:
        b={'display_name':n}; 
        if site: b['site']=site
        check(q0.evaluate(JS,['POST','/api/drivers',b])['s']==201,'Fahrerakte '+n)
    q0.evaluate(JS,['PATCH','/api/me',{'home_site':'Dortmund'}]); c0.close()
    V={}
    for vin,pl,site in [('WDB96340310779101','SK-MU 1','Muenchen'),('WDB96340310779102','SK-HH 1','Hamburg'),('WDB96340310779103','SK-DO 1','Dortmund')]:
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':site}); V[site]='VIN:'+vin
        r=api('POST',f"/api/vehicles/{V[site]}/maintenance",{'kind':'UVV','last_done_date':str(today-datetime.timedelta(days=300)),'interval_months':12,'evidence':'UI-Test Standort'})
        check(r['s'] in (200,201),'UVV '+site)
    WANT={'Muenchen':'MUENCHEN','Hamburg':'','Dortmund':'DORTMUND'}
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'sk.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for route,shot in [('/#/drivers','fahrer'),('/#/tacho','auslese')]:
            q.goto(B+route); q.reload()
            try: q.wait_for_selector('[data-nositehidden]',timeout=15000)
            except Exception: pass
            tx=q.evaluate("()=>{const e=document.querySelector('[data-nositehidden]');return e?e.innerText:''}")
            check(EXP[lang] in tx and '2' in tx,f'{lang} {w}px {shot}: Hinweis 2 ausgeblendet')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px {shot}: kein Querscrollen')
            if SHOTS: q.screenshot(path=f'{SHOTS}/standort_{shot}_{lang}_{w}.png')
        if w==390:
          for site,want in WANT.items():
            q.goto(B+'/#/vehicles/'+V[site]); q.reload()
            try: q.wait_for_selector('form[data-mord] select[name=workshop_site]',state='attached',timeout=15000)
            except Exception: pass
            val=q.evaluate("()=>{const e=document.querySelector('form[data-mord] select[name=workshop_site]');return e?e.value:null}")
            check(val==want,f'{lang} Werkstatt-Vorauswahl {site}: {val!r}')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
