# [CLAUDE] UI-Test (29.10.2026, Backlog 605, Blickwinkel „Disposition, erster Tag“):
# Hinweisliste der Disposition nennt beim gesperrten Anhänger das fest gekoppelte Zugfahrzeug („Gespann: auch Lkw … nicht einplanen“),
# Fahrzeugliste schreibt bei vergangener Fälligkeit „überfällig“ aus. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
GS={'de':'Gespann: auch Zugfahrzeug GH-LK 605 nicht einplanen','uk':'Автопоїзд: Тягач GH-LK 605 теж не плануйте','en':'Combination: do not plan Towing vehicle GH-LK 605 either'}
OV={'de':'überfällig: ','uk':'прострочено: ','en':'overdue: '}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gh.inhaber','display_name':'GH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gh.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'gh.dispo','display_name':'GH Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    dm=(date.fromisoformat(today)-timedelta(days=3)).isoformat()
    check(api('POST','/api/vehicles',{'plate':'GH-LK 605','vin':'WDB96340310605605','kind':'lkw','site':'Dortmund','trailer_plate':'GH-AH 605'})['s'] in (200,201),'Lkw')
    check(api('POST','/api/vehicles',{'plate':'GH-AH 605','vin':'WSM00000000605605','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),'Anhänger')
    r=api('POST','/api/vehicles/VIN:WDB96340310605605/maintenance',{'kind':'UVV','next_due_date':dm,'evidence':'UVV-Nachweis'}); check(r['s']==201,'überfällige UVV am Lkw')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WSM00000000605605','description':'Bremsleitung undicht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})
    check(r['s']==201,f'kritische Meldung am Anhänger ({r["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gh.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/inbox'); q.reload(); q.wait_for_selector('#nlist',timeout=15000); q.wait_for_timeout(600)
        ch=q.locator('#nlist [data-ncoupled]')
        check(ch.count()>=1 and GS[lang] in ch.first.inner_text(),f'{lang} {wd}px: Hinweis nennt Zugfahrzeug ({ch.first.inner_text() if ch.count() else "-"})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Hinweise ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/gespannhinweis_{lang}_{wd}.png',full_page=True)
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        row=[x for x in q.locator('#vl a.row').all_inner_texts() if 'GH-LK 605' in x]
        ov=q.locator('#vl [data-overdue]')
        check(row and ov.count()==1 and ov.first.inner_text().startswith(OV[lang]),f'{lang} {wd}px: „überfällig“ ausgeschrieben ({ov.first.inner_text() if ov.count() else "-"})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Fahrzeugliste ohne Querscrollen')
        if SHOTS and wd==390: q.screenshot(path=f'{SHOTS}/gespannhinweis_fz_{lang}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
