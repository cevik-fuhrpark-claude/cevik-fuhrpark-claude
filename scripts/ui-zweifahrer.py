# [CLAUDE] UI-Test Backlog 854/855 (Blickwinkel „Zweifahrerbetrieb“): Bußgeld ohne Zuordnung, zwei Fahrer mit Abfahrtskontrolle vor der Tatzeit
# → Hinweis [data-fcchk]; Zuordnung eines zweiten Fahrers in der Fahrzeugakte → Meldung „Weiterhin diesem Fahrzeug zugeordnet: …“.
# DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os, time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CHK={'de':'mehrere Fahrer','uk':'кілька водіїв','en':'several drivers'}
OTH={'de':'Weiterhin diesem Fahrzeug zugeordnet','uk':'До цього транспорту й далі закріплено','en':'Still assigned to this vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zf.inhaber','display_name':'ZF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'zf.inhaber','password':PW})['s']==200,'Anmeldung')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    vin='WDB96340310779854'; VID='VIN:'+vin; check(api('POST','/api/vehicles',{'plate':'ZF-AB 854','vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
    drivers=[]
    for i,n in enumerate(['ZF Fahrer Eins','ZF Beifahrerin Kowalczyk-Wiśniewska']):
        u=api('POST','/api/users',{'username':f'zf.d{i}','display_name':n,'role':'driver','environment':envn}); drivers.append((u['d']['id'],n))
        c=br.new_context(); k=c.new_page(); k.goto(B)
        k.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); k.evaluate(JS,['POST','/api/login',{'username':f'zf.d{i}','password':PW}])
        keys=[x['key'] for x in k.evaluate(JS,['GET','/api/meta',None])['d']['checklist']]
        check(k.evaluate(JS,['POST','/api/inspections',{'kind':'abfahrt','vehicle_id':VID,'request_key':f'zf-{i}','items':[{'key':x,'result':'ok'} for x in keys]}])['s']==201,f'Abfahrtskontrolle {n}')
        c.close()
    time.sleep(2)
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':'AZ-ZF-854','offense_type':'parken','offense_at':datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),'plate_in_letter':'ZF-AB 854','request_key':'zf-854'})
    check(fi['s']==201,f'Schreiben erfasst ({fi["s"]})'); FID=fi['d']['id']
    check(api('GET',f'/api/fines/{FID}')['d'].get('checks_ambiguous') is True,'API: checks_ambiguous')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        # vor jedem Lauf: nur Fahrer 1 zugeordnet
        for z in (api('GET',f'/api/vehicles/{VID}')['d'].get('drivers') or []):
            if not z.get('valid_to'): api('DELETE','/api/assignments/'+z['id'])
        check(api('POST',f'/api/vehicles/{VID}/drivers',{'user_id':drivers[0][0]})['s']==201,'Fahrer 1 zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'zf.inhaber','password':PW}])
        # Bußgeld: Zuordnung jetzt (nach der Tat) zählt nicht zur Tatzeit → Hinweis bleibt
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('[data-fcchk]', state='attached', timeout=15000)
        check(CHK[lang] in q.inner_text('[data-fcchk]'),f'{lang} {w}px: 854 Hinweis mehrere Kontrollen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Bußgeld ohne Querscrollen')
        if SHOTS: q.locator('[data-fcchk]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/zf_fine_{lang}_{w}.png')
        # Fahrzeugakte: zweiten Fahrer zuordnen
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#drvsel option', state='attached', timeout=15000)
        q.select_option('#drvsel', drivers[1][0])
        if q.locator('#endprev').is_checked(): q.uncheck('#endprev')
        q.locator('#df button').click()
        q.wait_for_function("t => [...document.querySelectorAll('.toast')].some(e => e.textContent.includes(t))", arg=OTH[lang], timeout=10000)
        tt=' '.join(q.locator('.toast').all_inner_texts())
        check(drivers[0][1] in tt,f'{lang} {w}px: 855 Meldung nennt den weiterhin zugeordneten Fahrer')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Akte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/zf_assign_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
