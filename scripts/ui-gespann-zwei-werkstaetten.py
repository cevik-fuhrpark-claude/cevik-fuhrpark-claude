# [CLAUDE] UI-Test (06.11.2026, Backlog 1080–1082, Blickwinkel „Werkstatt Dortmund und Bayern arbeiten am selben Gespann“): Auflieger in Reparatur
# bei Werkstatt MUENCHEN, Zugmaschine bei DORTMUND → das Formular „Technisch freigeben“ der Zugmaschine nennt den Auftrag am Auflieger (#relcoupled),
# die Disposition sieht in „Wieder einsatzbereit“ beim Lkw „🔗 Anhänger …: In Werkstatt“ (data-cpstate). DE/UK/EN bei 390/820/1366 px,
# Backlog 1083: Werkstatt Dortmund sieht beim Auflieger nur „in einer anderen Werkstatt in Arbeit“.
# kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Gekoppeltes Fahrzeug noch in der Werkstatt','uk':'Зчеплений транспорт ще в майстерні','en':'Coupled vehicle still in the workshop'}
AV={'de':'In Werkstatt','uk':'У майстерні','en':'In workshop'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gz.inhaber','display_name':'GZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def login_new(un,body):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'environment':envn,**body})
        ctx=br.new_context(); pg=ctx.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        check(pg.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])['s']==200,un+' angemeldet'); return pg
    wd=login_new(f'gz.wsdo{R}',{'role':'workshop','workshop_site':'DORTMUND'}); wm=login_new(f'gz.wsmu{R}',{'role':'workshop','workshop_site':'MUENCHEN'})
    for lang in ['de','uk','en']: login_new(f'gz.dispo.{lang}{R}',{'role':'dispatch','language':lang})
    def cmd(page,cid,action,payload=None,note=None):
        global n; n+=1
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'gz-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    zv=f'WDB97{R:05d}G000101'; av=f'WSM97{R:05d}G000102'; zp=f'GZ-Z {R%900}1'; ap=f'GZ-A {R%900}2'
    check(api('POST','/api/vehicles',{'plate':zp,'vin':zv,'kind':'lkw','site':'Dortmund','trailer_plate':ap})['s']==201,'Zugmaschine')
    check(api('POST','/api/vehicles',{'plate':ap,'vin':av,'kind':'anhaenger','site':'Dortmund'})['s']==201,'Auflieger')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+av,'description':'Bremse Achse 2 (Test Gespann)','priority':'niedrig','driveability':'fahrbereit','request_key':f'gz-b-{R}'}); bid=c['d']['id']
    check(cmd(a,bid,'approve_repair',{'workshop_site':'MUENCHEN'},'Bremse')==200 and cmd(wm,bid,'start_repair')==200,'Auflieger in Reparatur (MUENCHEN)')
    bno=api('GET',f'/api/cases/{bid}')['d']['case']['case_no']
    k=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        k+=1
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+zv,'description':f'Spiegel locker {k} (Test Gespann)','priority':'niedrig','driveability':'fahrbereit','request_key':f'gz-{R}-{k}'}); cid=c['d']['id']
        ok=cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel')==200 and cmd(wd,cid,'start_repair')==200 and cmd(wd,cid,'record_work',{'hours':1,'description':'Spiegel'})==200
        ok=ok and wd.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'gz-i-{R}-{k}','items':items}])['s']==201 and cmd(wd,cid,'request_quality_check',{},'fertig')==200
        check(ok,f'{lang} {w}px: Zugmaschine bis Abschlusskontrolle')
        if k==1:
            wd.goto(B+'/#/cases/'+cid); wd.reload(); wd.wait_for_selector('[data-vicoupled]',state='attached',timeout=15000)
            vc=wd.locator('[data-vicoupled]').text_content() or ''
            check(wd.locator('[data-vicelse]').count()==1 and bno not in vc and 'München' not in vc,f'Werkstatt Dortmund: Auflieger „in einer anderen Werkstatt in Arbeit“ ohne Nummer/Standort ({vc})')
            pass
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('button[data-act="technical_release"]',timeout=15000)
        m.click('button[data-act="technical_release"]'); m.wait_for_selector('#pu_note',timeout=5000)
        t=m.inner_text('#relcoupled') if m.locator('#relcoupled').count() else ''
        check(HINT[lang] in t and bno in t and ap in t and m.locator('#relother').count()==0,f'{lang} {w}px: Formular nennt Auftrag am Auflieger ({t[:90]})')
        check(m.evaluate(noscroll),f'{lang} {w}px: Formular ohne Querscrollen')
        if SHOTS: m.locator('#relcoupled').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/gz_form_{lang}_{w}.png')
        check(cmd(a,cid,'technical_release',{'confirm':True},'Kontrolle ok')==200,f'{lang} {w}px: Freigabe')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
        ctx=br.new_context(viewport={'width':w,'height':h}); d=ctx.new_page(); errs=[]; d.on('pageerror',lambda e: errs.append(str(e)))
        d.goto(B); d.evaluate(JS,['POST','/api/login',{'username':f'gz.dispo.{lang}{R}','password':PW}])
        d.goto(B+'/#/'); d.wait_for_selector('#dback', state='attached', timeout=15000)
        row=d.locator('[data-dback]', has_text=zp).first
        st=row.locator('[data-cpstate]').inner_text() if row.locator('[data-cpstate]').count() else ''
        check(ap in st and AV[lang] in st,f'{lang} {w}px: Dispo „Wieder einsatzbereit“ nennt Auflieger in Werkstatt ({st})')
        check(d.evaluate(noscroll),f'{lang} {w}px: Dispo ohne Querscrollen')
        if SHOTS: row.scroll_into_view_if_needed(); d.screenshot(path=f'{SHOTS}/gz_dispo_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: Dispo ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
