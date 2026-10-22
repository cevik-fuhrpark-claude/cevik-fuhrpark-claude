# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „Rollenwechsel mitten im Vorgang“): Bußgeld im Status „Fahrer informiert“, ermittelter Fahrer
# danach deaktiviert → Bußgeld-Detail zeigt der Leitung den Hinweis, dass die Quittung nicht mehr kommen kann (DE/UK/EN, 390/820/1366 px,
# ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'kein aktiver Fahrer mehr','uk':'більше не є активним водієм','en':'no longer an active driver'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bi.inhaber','display_name':'BI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bi.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'bi.fahrer','display_name':'BI Fahrer','role':'driver','environment':envn})
    check(u['s'] in (200,201),'Fahrerkonto angelegt '+str(u['s'])); DID=u['d']['id']
    api('POST','/api/vehicles',{'vin':'WDB96340310777411','plate':'BI-LK 1','site':'Dortmund'})
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund','reference':'AZ-BI-1','offense_type':'parken','offense_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'plate_in_letter':'BI-LK 1','amount_eur':30})
    check(f['s']==201,'Bußgeld '+str(f['s'])); FID=f['d']['id']
    check(api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','payload':{'driver_id':DID,'basis':'manuell','evidence':'Tourenplan'}})['s']==200,'Fahrer ermittelt')
    check(api('POST',f'/api/fines/{FID}/commands',{'action':'inform_driver'})['s']==200,'Fahrer informiert')
    check(api('PATCH',f'/api/users/{DID}',{'active':False})['s']==200,'Fahrer deaktiviert')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'bi.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/fines/'+FID); q.reload()
        try: q.wait_for_selector('[data-funreach]',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('[data-funreach]');return e?e.innerText:''}")
        check(EXP[lang] in tx,f'{lang} {w}px Hinweis sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/bussgeld_fahrer_inaktiv_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
