# [CLAUDE] UI-Test Backlog 1589 (Backlog 195, Blickwinkel „Ukrainischer Fahrer liest den deutschen Radmuttern-Hinweis“):
# Leitung speichert einen Hinweis zum Fahrzeug für Fahrer mit deutschem Standardsatz „Radmuttern nachziehen“ plus Freitext.
# Der zugeordnete Fahrer sieht auf „Mein Fahrzeug“ den Standardsatz in seiner Sprache (DE/UK/EN), der Freitext bleibt wörtlich;
# eine Leitung mit Sprache EN/UK sieht ihn in der Fahrzeugakte ebenso übertragen. 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Räder wurden gewechselt: Radmuttern nach Herstellervorgabe nachziehen lassen.','uk':'Колеса замінено: підтягнути колісні гайки згідно з вимогами виробника.','en':'Wheels were changed: have the wheel nuts re-torqued as specified by the manufacturer.'}
FREE='Schlüssel im Kasten.'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ss.inhaber','display_name':'SS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ss.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ra.inhaber','rm.inhaber','ab.inhaber','ws.inhaber','ls.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def login(ctx,role,lang,extra=None):
        un=f'ss.{role}{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'SS {role} {n}','role':role,'environment':envn,'language':lang,**(extra or {})})
        check(u['s'] in (200,201),f'{role}-Konto angelegt')
        q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        return q,errs,u['d'].get('id') or (u['d'].get('user') or {}).get('id')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'SS-R {R%900}{n}'; vin=f'WDB98{R:05d}A{n:04d}00'
        v=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(v['s']==201,'Fahrzeug angelegt')
        vid=v['d'].get('id') or (v['d'].get('vehicle') or {}).get('id')
        nt=api('POST',f'/api/vehicles/{vid}/notes',{'text':f'{FREE} {TXT["de"]}','for_driver':True,'valid_until':None,'request_key':f'ss{R}{n}'})
        check(nt['s']==201,f'Hinweis gespeichert {nt["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h})
        q,errs,uid=login(ctx,'driver',lang)
        check(api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uid})['s']<300,'Fahrer zugeordnet')
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('.vnotes-drv',timeout=15000)
        t=q.inner_text('.vnotes-drv')
        check(TXT[lang] in t,f'{lang} {w}px Fahrer: Standardsatz in eigener Sprache')
        check(FREE in t,f'{lang} {w}px Fahrer: Freitext wörtlich')
        if lang!='de': check(TXT['de'] not in t,f'{lang} {w}px Fahrer: kein deutscher Standardsatz')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px Fahrer: ohne Querscrollen')
        if SHOTS: q.locator('.vnotes-drv').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/standardsatz_fahrer_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px Fahrer: keine Skriptfehler {errs[:2]}')
        ctx.close()
        ctx=br.new_context(viewport={'width':w,'height':h})
        q,errs,_=login(ctx,'fleet',lang)
        q.goto(B+f'/#/vehicles/VIN:{vin}'); q.reload(); q.wait_for_selector('#vnotes ul.vnotes li',timeout=15000)
        t=q.inner_text('#vnotes ul.vnotes')
        check(TXT[lang] in t and FREE in t,f'{lang} {w}px Leitung: Fahrzeugakte zeigt Satz in eigener Sprache')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px Leitung: ohne Querscrollen')
        if SHOTS: q.locator('#vnotes').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/standardsatz_akte_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px Leitung: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
