# [CLAUDE] UI-Test (07.11.2026, Backlog 1104, Blickwinkel „Disposition am Tablet im Querformat bei der Frühschicht“):
# Links der Disposition mit 44 px Tippfläche: Standortwechsel (#dsitetoggle, vorher 17 px), „Neue Meldungen, Eingang noch nicht bestätigt“
# (#dunrec, vorher 20 px), Notfallseite „Schaden melden ›“/„Unfall melden ›“ (vorher 20 px), Hinweistitel im Eingang (vorher 24 px);
# Legende der Flotte 44 px nur bei Fingerbedienung (pointer: coarse), mit Maus weiter 24 px. Tablet quer 1024×768/1180×820 mit Touch,
# Handy 390 mit Touch, PC 1366 ohne Touch; Backlog 1105: Fuhrparkleitung – „Nachweise und Führerscheinkontrollen ›“, „Verlauf für einen
# Zeitraum ›“, Hilfe-Links der Benutzerliste 44 px, kleine Knöpfe (Kosten-Zeiträume, CSV) bei Touch 44 px, mit Maus 36 px; DE/UK/EN, ohne Querscrollen/Skriptfehler/Wortumbruch-Prüfung. Frischer Dev-Server nötig
# (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
H = """(sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height))"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tq.inhaber','display_name':'TQ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tq.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'tq.dispo','display_name':'TQ Dispo','role':'dispatch','environment':'production','home_site':'Dortmund'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for i,(pl,vin) in enumerate([('TQ-AB 1','WDB9634031L310001'),('TQ-AB 2','WDB9634031L310002'),('TQ-AB 3','WDB9634031L310003')]):
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':'Dortmund'})
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031L310001','description':'Bremse quietscht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})
    check(r['s'] in (200,201),'kritische Meldung (Hinweis an Disposition, Eingang unbestätigt)')
    u=api('POST','/api/users',{'username':'tq.leitung','display_name':'TQ Leitung','role':'fleet','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for lang in ['de','uk','en']:
      for wd,h,touch in [(1024,768,True),(390,844,True),(1366,900,False)]:
        ctx=br.new_context(viewport={'width':wd,'height':h},has_touch=touch); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        tag=f"Leitung {lang} {wd}px{' Touch' if touch else ''}"
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tq.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for route,sel in [('/#/drivers','#drlink'),('/#/tacho','#thlink'),('/#/users','main a.tap[href^="#/help?s="]')]:
            q.goto(B+route); q.reload(); q.wait_for_selector(sel,timeout=15000); q.wait_for_timeout(400)
            hs=q.evaluate(H,sel)
            check(hs and min(hs)>=44,f'{tag} {route}: {sel} {hs}')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {route}: ohne Querscrollen')
        q.goto(B+'/#/costs'); q.reload(); q.wait_for_selector('main .btn.small',timeout=15000); q.wait_for_timeout(400)
        bs=q.evaluate(H,'main .btn.small')
        check(bs and (min(bs)>=44 if touch else max(bs)<44),f'{tag} Kosten: kleine Knöpfe {bs}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} Kosten: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leitung_kosten_{lang}_{wd}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    for lang in ['de','uk','en']:
      for wd,h,touch in [(1024,768,True),(1180,820,True),(390,844,True),(1366,900,False)]:
        ctx=br.new_context(viewport={'width':wd,'height':h},has_touch=touch); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        tag=f"{lang} {wd}px{' Touch' if touch else ''}"
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tq.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang,'home_site':'Dortmund'}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dsitebar',timeout=15000); q.wait_for_timeout(600)
        check(min(q.evaluate(H,'#dsitetoggle') or [0])>=44,f'{tag}: Standortwechsel ≥ 44 px {q.evaluate(H,"#dsitetoggle")}')
        check(min(q.evaluate(H,'#dunrec') or [0])>=44,f'{tag}: „Neue Meldungen …“ ≥ 44 px {q.evaluate(H,"#dunrec")}')
        lg=q.evaluate(H,'[data-fbk]')
        check(len(lg)==4 and min(lg)>=(44 if touch else 24) and (touch or max(lg)<44),f'{tag}: Legende {lg}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Start ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dispo_quer_{lang}_{wd}.png')
        q.click('#dsitetoggle'); q.wait_for_timeout(700)
        check(q.locator('#dsitetoggle').count()==1 and min(q.evaluate(H,'#dsitetoggle'))>=44,f'{tag}: nach Umschalten weiter 44 px')
        q.goto(B+'/#/emergency'); q.wait_for_timeout(1200)
        em=q.evaluate(H,'main a.tap')
        check(len(em)==2 and min(em)>=44,f'{tag}: Notfallseite Links {em}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Notfall ohne Querscrollen')
        q.goto(B+'/#/inbox'); q.wait_for_selector('#nlist',timeout=15000); q.wait_for_timeout(600)
        nt=q.evaluate(H,'#nlist a.title')
        check(len(nt)>=1 and min(nt)>=44,f'{tag}: Hinweistitel {nt}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Eingang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/inbox_quer_{lang}_{wd}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
