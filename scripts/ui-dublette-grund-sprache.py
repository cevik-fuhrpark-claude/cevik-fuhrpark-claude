# [CLAUDE] UI-Test Backlog 1590 (Backlog 195, Blickwinkel „Ukrainischer Fahrer liest, warum seine Meldung als Dublette abgelehnt wurde“):
# Fahrer meldet einen Schaden, die Leitung lehnt die Meldung als Dublette eines älteren Vorgangs ab (ohne eigenen Grund → Server setzt
# „Dublette von <Nr>“ auf Deutsch, mit Zusatz „– Fotos dort“). Der Fahrer sieht im Ablehnungskasten und im Verlauf den Vorsatz in seiner
# Sprache (DE/UK/EN), die Vorgangsnummer und den Zusatz wörtlich. 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PRE={'de':'Dublette von','uk':'Дублікат','en':'Duplicate of'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dg.inhaber','display_name':'DG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'dg.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ss.inhaber','ra.inhaber','rm.inhaber','ab.inhaber','ws.inhaber','ls.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'DG-R {R%900}{n}'; vin=f'WDB97{R:05d}D{n:04d}00'
        v=api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'}); check(v['s']==201,'Fahrzeug angelegt')
        vid=v['d'].get('id') or (v['d'].get('vehicle') or {}).get('id')
        un=f'dg.fahrer{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'DG Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Fahrer-Konto angelegt')
        uid=u['d'].get('id') or (u['d'].get('user') or {}).get('id')
        check(api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uid})['s']<300,'Fahrer zugeordnet')
        o=api('POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel links gebrochen','priority':'mittel','driveability':'fahrbereit','request_key':f'dgo{R}{n}'})
        check(o['s']==201,f'Ursprungsvorgang {o["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        dr=q.evaluate(JS,['POST','/api/cases',{'vehicle_id':vid,'description':'Außenspiegel links kaputt','priority':'mittel','driveability':'fahrbereit','request_key':f'dgd{R}{n}'}])
        check(dr['s']==201,f'Fahrer meldet {dr["s"]}')
        did=dr['d']['id']; c=api('GET',f'/api/cases/{did}')['d']['case']; ono=api('GET',f'/api/cases/{o["d"]["id"]}')['d']['case']['case_no']
        note=None if n%2 else f'Dublette von {ono} – Fotos dort'
        r=api('POST',f'/api/cases/{did}/commands',{'action':'reject','command_id':f'dgr{R}{n}','expected_version':c['version'],'note':note,'payload':{'duplicate_of':o['d']['id']}})
        check(r['s']==200,f'als Dublette abgelehnt {r["s"]}')
        q.goto(B+f'/#/cases/{did}'); q.reload(); q.wait_for_selector('#rejbox',timeout=15000)
        t=q.inner_text('#rejbox'); exp=f'{PRE[lang]} {ono}'
        check(exp in t,f'{lang} {w}px Ablehnungskasten: „{exp}“')
        if note: check('– Fotos dort' in t,f'{lang} {w}px Zusatz wörtlich')
        if lang!='de': check('Dublette von' not in t,f'{lang} {w}px kein deutscher Vorsatz im Kasten')
        tl=q.inner_text('ol.timeline')
        check(exp in tl,f'{lang} {w}px Verlauf: „{exp}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px ohne Querscrollen')
        if SHOTS: q.locator('#rejbox').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dublette_grund_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
