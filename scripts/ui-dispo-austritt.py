# [CLAUDE] UI-Test Backlog 1582 (Backlog 195, Blickwinkel „Disponent scheidet aus – seine Handynummer steht noch als Notfallnummer“):
# Disposition legt einen Fahrzeughinweis und eine Notfallnummer an; der Inhaber deaktiviert das Konto in der Benutzerverwaltung → Hinweis nennt
# Fahrzeughinweis (mit Kennzeichen) und Notfallnummer; danach wieder aktiviert (nächster Durchlauf). DE/UK/EN bei 390/820/1366 px.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOTES={'de':'Aktive Fahrzeughinweise dieses Kontos: 1','uk':'Активні примітки до транспорту від цього облікового запису: 1','en':'Active vehicle notes by this account: 1'}
EMERG={'de':'Notfallnummern dieses Kontos: 1','uk':'Номери екстреного зв’язку цього облікового запису: 1','en':'Emergency numbers by this account: 1'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'da.inhaber','display_name':'DA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'da.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production'); pid=os.getpid()
    plate=f'DA-AB {pid%10000}'
    check(api('POST','/api/vehicles',{'vin':'WDB96340310781582','plate':plate,'site':'Dortmund','kind':'lkw'})['s'] in (201,409),'Fahrzeug')
    veh=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['id']=='VIN:WDB96340310781582'][0]; plate=veh['plate']
    u=api('POST','/api/users',{'username':f'da.dispo{pid}','display_name':'DA Dispo','role':'dispatch','environment':envn})
    check(u['s'] in (200,201),'Dispositionskonto '+str(u['s'])); UID=u['d']['id']
    dc=br.new_context(); dp=dc.new_page(); dp.goto(B); dp.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    dp.evaluate(JS,['POST','/api/login',{'username':f'da.dispo{pid}','password':PW}])
    n=dp.evaluate(JS,['POST','/api/vehicles/VIN:WDB96340310781582/notes',{'text':'Bei Panne Dispo-Handy anrufen (Test)'}]); check(n['s']==201,f'Fahrzeughinweis der Disposition {n}')
    c=dp.evaluate(JS,['POST','/api/emergency/contacts',{'kind':'dispo','label':'Dispo Nacht (Test)','phone':f'+49 170 {pid%10000000:07d}'}]); check(c['s']==201,f'Notfallnummer der Disposition {c}')
    dc.close()
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'da.inhaber','password':PW}])
        q.goto(B+'/#/users'); q.wait_for_selector(f'[data-act="{UID}"]',state='attached',timeout=15000)
        q.evaluate(f"()=>{{ const b = document.querySelector('[data-act=\"{UID}\"]'); for (let d = b.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; b.scrollIntoView(); }}")
        q.click(f'[data-act="{UID}"]'); q.wait_for_selector('.toast',timeout=15000); tx=q.inner_text('.toast')
        check(NOTES[lang] in tx and plate in tx,f'{lang} {w}px: Fahrzeughinweis mit Kennzeichen ({tx[:120]})')
        check(EMERG[lang] in tx,f'{lang} {w}px: Notfallnummer')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/da_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('PATCH',f'/api/users/{UID}',{'active':True})['s']==200,f'{lang} {w}px: wieder aktiv')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
