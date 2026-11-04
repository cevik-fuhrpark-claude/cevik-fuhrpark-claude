# [CLAUDE] UI-Test (04.11.2026, Backlog 979, Blickwinkel „Disposition sucht morgens einen Lkw mit Anhänger“):
# Fahrzeugliste mit Knopf „Gespann ohne Meldungen“ – zeigt nur Lkw, deren gekoppelter Anhänger ebenfalls ohne offene Meldung und ohne
# überfällige Prüfung ist; Direktsprung #/vehicles?f=combo_clear, Hinweis „ersetzt keine Abfahrtskontrolle“. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Gespann ohne Meldungen','uk':'Зчіпка без заявок','en':'Combination without reports'}
HINT={'de':'ersetzt keine Abfahrtskontrolle','uk':'не замінює контролю перед виїздом','en':'does not replace the departure check'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gf.inhaber','display_name':'GF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'gf.dispo','display_name':'GF Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    dm=(date.fromisoformat(today)-timedelta(days=3)).isoformat()
    for n in ['1','2','3']:
        check(api('POST','/api/vehicles',{'plate':f'GF-LK 979{n}','vin':f'WDB9634031097900{n}','kind':'lkw','site':'Dortmund','trailer_plate':f'GF-AH 979{n}'})['s'] in (200,201),f'Lkw {n}')
        check(api('POST','/api/vehicles',{'plate':f'GF-AH 979{n}','vin':f'WSM0000000097900{n}','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),f'Anhänger {n}')
    # Gespann 2: Meldung am Anhänger; Gespann 3: UVV am Anhänger überfällig; Gespann 1 frei
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WSM00000000979002','description':'Plane eingerissen','priority':'niedrig','request_key':str(uuid.uuid4())}); check(r['s']==201,'Meldung Anhänger 2')
    r=api('POST','/api/vehicles/VIN:WSM00000000979003/maintenance',{'kind':'UVV','next_due_date':dm,'evidence':'UVV-Nachweis'}); check(r['s']==201,'überfällige UVV Anhänger 3')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gf.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles'); q.reload(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        btn=q.locator('[data-av="combo_clear"]')
        check(btn.count()==1 and btn.inner_text().startswith(LBL[lang]) and '(1)' in btn.inner_text(),f'{lang} {wd}px: Knopf ({btn.inner_text() if btn.count() else "-"})')
        btn.click(); q.wait_for_timeout(500)
        rows=[x for x in q.locator('#vl a.row').all_inner_texts()]
        check(len(rows)==1 and 'GF-LK 9791' in rows[0],f'{lang} {wd}px: nur das freie Gespann ({len(rows)})')
        hint=q.locator('[data-combohint]')
        check(hint.count()==1 and HINT[lang] in hint.inner_text(),f'{lang} {wd}px: Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/gespannfrei_{lang}_{wd}.png',full_page=False)
        q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(800); q.evaluate("()=>{location.hash='#/vehicles?f=combo_clear'}"); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        check(q.locator('[data-av="combo_clear"]:not(.secondary)').count()==1 and q.locator('#vl a.row').count()==1,f'{lang} {wd}px: Direktsprung')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
