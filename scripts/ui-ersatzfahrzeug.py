# [CLAUDE] UI-Test (24.10.2026, Backlog 231, Teilagent „Disposition sucht Ersatzfahrzeug“):
# Fahrzeugliste: Lkw-Zeile zeigt den Prüfstand des gekoppelten Anhängers (Prüfung überfällig, nicht bestanden) als rote Chips;
# Dispo-Startseite „Nicht einplanbar“ nennt den Sperrgrund in der App-Sprache. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DRV={'de':'nicht fahrbereit','uk':'не','en':'not'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ef.inhaber','display_name':'EF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ef.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'ef.dispo','display_name':'EF Dispo','role':'dispatch','environment':'production','home_site':'Dortmund'})
    if u['s'] in (200,201):
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for pl,vin,ex in [('EF-LK 1','WDB9634031E200001',{'trailer_plate':'EF-AH 1'}),('EF-AH 1','WDB9634031E200002',{'kind':'anhaenger'}),('EF-SP 2','WDB9634031E200003',{})]:
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':'Dortmund',**ex})
    tr='VIN:WDB9634031E200002'
    check(api('POST',f'/api/vehicles/{tr}/maintenance',{'kind':'UVV','last_done_date':'2024-01-10','interval_months':12,'evidence':'UVV-Protokoll (Test)'})['s'] in (200,201),'Anhänger: UVV überfällig')
    tg=api('POST',f'/api/vehicles/{tr}/maintenance',{'kind':'Tachograph','last_done_date':'2025-01-10','interval_months':24,'evidence':'Test'})
    check(api('POST',f"/api/maintenance/{tg['d']['id']}/complete",{'done_date':'2026-10-20','evidence':'Protokoll (Test)','result':'verkehrsunsicher'})['s']==200,'Anhänger: Tachograph verkehrsunsicher')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031E200003','description':'Bremse zieht stark','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})
    check(r['s'] in (200,201),'gesperrter Lkw EF-SP 2')
    for lang in ['en','uk','de']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ef.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang,'home_site':'Dortmund'}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dsitebar',timeout=15000); q.wait_for_timeout(600)
        rows=[x for x in q.locator('.list a.row').all_inner_texts() if 'EF-SP 2' in x]
        lr=q.locator('[data-lockreason]')
        check(rows and lr.count()>=1 and DRV[lang] in lr.first.inner_text() and (lang=='de' or 'fahrbereit' not in lr.first.inner_text()),f'{lang} {wd}px: Sperrgrund auf der Tafel: '+(lr.first.inner_text() if lr.count() else '-'))
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Start ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ersatz_start_{lang}_{wd}.png',full_page=True)
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        rowOf=lambda pl: q.locator('#vl a.row').filter(has=q.locator(f'.plate .num:text-is("{pl}")')).first  # nach eigenem Kennzeichen (Anhänger-Zeile nennt „Zugfahrzeug EF-LK 1“)
        row=rowOf('EF-LK 1')
        check(row.locator('[data-cover]').count()==1 and 'EF-AH 1' in row.locator('[data-cover]').inner_text(),f'{lang} {wd}px: Lkw-Zeile „Anhänger überfällig“')
        check(row.locator('[data-cfail]').count()==1,f'{lang} {wd}px: Lkw-Zeile „Anhänger Prüfung nicht bestanden“')
        check(rowOf('EF-SP 2').locator('[data-cover],[data-cfail]').count()==0,f'{lang} {wd}px: Einzel-Lkw ohne Gespann-Chips')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Liste ohne Querscrollen')
        if SHOTS: row.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ersatz_liste_{lang}_{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
