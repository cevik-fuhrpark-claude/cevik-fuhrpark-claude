# [CLAUDE] UI-Test Backlog 1581 (Backlog 195, Blickwinkel „Leitung setzt die Fahrerakte auf ausgeschieden, das App-Konto ist schon
# deaktiviert“): Fahrer ist bei einer Anhörung als Fahrer ermittelt (ohne seine Bestätigung), sein App-Konto ist deaktiviert → die Leitung
# setzt die Fahrerakte auf „ausgeschieden“ → Hinweis nennt den Bußgeldvorgang ohne Bestätigung; danach Akte wieder aktiv (nächster Durchlauf).
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Bußgeldvorgänge ohne Bestätigung dieses Fahrers: 1','uk':'Справи щодо штрафів без підтвердження цього водія: 1','en':'Fine cases not yet confirmed by this driver: 1'}
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
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production'); pid=os.getpid()
    u=api('POST','/api/users',{'username':f'fa.fahrer{pid}','display_name':'FA Fahrer','role':'driver','environment':envn})
    check(u['s'] in (200,201),'Fahrerkonto angelegt '+str(u['s'])); UID=u['d']['id']
    api('POST','/api/vehicles',{'vin':'WDB96340310781581','plate':'FA-LK 1581','site':'Dortmund','kind':'lkw'})
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund','reference':f'AZ-1581-{pid}','offense_type':'parken','offense_at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':'FA-LK 1581','amount_eur':30})
    check(f['s']==201,'Anhörung erfasst '+str(f['s'])); FID=f['d']['id']
    check(api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','payload':{'driver_id':UID,'basis':'manuell','evidence':'Tourenplan'}})['s']==200,'Fahrer ermittelt')
    d=api('POST','/api/drivers',{'display_name':'FA Fahrer','personnel_no':f'P-1581-{pid}','user_id':UID})
    check(d['s']==201,'Fahrerakte angelegt '+str(d['s'])); DRID=d['d']['id']
    check(api('PATCH',f'/api/users/{UID}',{'active':False})['s']==200,'App-Konto deaktiviert')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fa.inhaber','password':PW}])
        q.goto(B+'/#/drivers/'+DRID); q.wait_for_selector('#edf',state='attached',timeout=15000)
        q.evaluate("()=>{ const f = document.getElementById('edf'); const dd = f.closest('details'); if (dd) dd.open = true; }")
        q.uncheck('#edf input[name=active]'); q.click('#edf button')
        q.wait_for_selector('.toast',timeout=15000); tx=q.inner_text('.toast')
        check(HINT[lang] in tx,f'{lang} {w}px: Hinweis auf Bußgeldvorgang ohne Bestätigung ({tx[:90]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fa_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('PATCH',f'/api/drivers/{DRID}',{'active':True})['s']==200,f'{lang} {w}px: Akte wieder aktiv')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
