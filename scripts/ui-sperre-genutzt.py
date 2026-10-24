# [CLAUDE] UI-Test (25.10.2026, Backlog 252, Blickwinkel „Gesperrtes Fahrzeug wird trotzdem bewegt“): Fahrer sendet eine Abfahrtskontrolle
# an einem gesperrten Lkw → stehende rote Ergebnisseite („gesperrt – nicht fahren“ + Anruf-Knopf) statt einer Einblendung; die Leitung sieht
# im Vorgang den Eintrag „Abfahrtskontrolle trotz Sperre“ mit km-Stand und im Management den Befund „Gesperrtes Fahrzeug genutzt“.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DND={'de':'nicht fahren','uk':'не їхати','en':'do not drive'}
EV={'de':'Abfahrtskontrolle trotz Sperre','uk':'Перевірка перед виїздом попри блокування','en':'Departure check despite lock'}
FIND={'de':'trotzdem genutzt','uk':'але використовується','en':'but used'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sg.inhaber','display_name':'SG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']; pid=os.getpid()
    u=api('POST','/api/users',{'username':f'sg.fahrer{pid}','display_name':'SG Fahrer','role':'driver','environment':env})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        vin=f'WDB9634031S{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); VL='VIN:'+vin
        check(api('POST','/api/vehicles',{'vin':vin,'plate':f'SG-GE {n}','site':'Dortmund'})['s']==201,'Fahrzeug')
        check(api('POST',f'/api/vehicles/{VL}/odometer',{'km':200000})['s']==201,'km-Stand vor der Sperre')
        c=api('POST','/api/cases',{'vehicle_id':VL,'description':'Bremse zieht stark (Test)','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'set_safety_lock','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{},'note':'Bremse prüfen'})['s']==200,'Sperre gesetzt')
        a.wait_for_timeout(20)
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':f'sg.fahrer{pid}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#v',timeout=15000)
        q.select_option('#v',VL); q.wait_for_timeout(300)
        for el in q.locator('.checkitem input[value=ok]').all(): el.check(force=True)
        q.fill('#km','200180'); q.click('#sb')
        q.wait_for_selector('[data-lockedresult]',timeout=15000)
        txt=q.inner_text('[data-lockedresult]')
        check(DND[lang] in txt.lower() and q.query_selector('[data-lockedresult] [data-callbox]') is not None,f'{lang} {wd}px: stehende Ergebnisseite mit Anruf-Knopf ({txt[:70]!r})')
        q.wait_for_timeout(1500); check(q.query_selector('[data-lockedresult]') is not None,f'{lang} {wd}px: Seite bleibt stehen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen (Fahrer)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sperre-genutzt-fahrer-{lang}-{wd}.png')
        o=br.new_context(viewport={'width':wd,'height':h}); r=o.new_page(); r.on('pageerror',lambda e: errs.append(str(e)))
        r.goto(B); r.evaluate(JS,['POST','/api/login',{'username':'sg.inhaber','password':PW}]); r.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        r.goto(B+f'/#/cases/{cid}'); r.reload(); r.wait_for_selector('.timeline',timeout=15000)
        tl=r.inner_text('.timeline')
        check(EV[lang] in tl and ('200,180' in tl or '200.180' in tl or '200 180' in tl or '200 180' in tl or '200 180' in tl),f'{lang} {wd}px: Verlauf „trotz Sperre“ mit km')
        if SHOTS: r.locator('.timeline').scroll_into_view_if_needed(); r.screenshot(path=f'{SHOTS}/sperre-genutzt-verlauf-{lang}-{wd}.png')
        check(r.evaluate("async()=>{const x=await fetch('/api/agent/run',{method:'POST',headers:{'x-cfp':'1','content-type':'application/json'},body:'{}'});return x.status}")==200,'Agent')
        r.goto(B+'/#/master'); r.reload(); r.wait_for_timeout(1500)
        check(FIND[lang] in r.inner_text('main'),f'{lang} {wd}px: Management zeigt Befund')
        check(r.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen (Leitung)')
        if SHOTS: r.screenshot(path=f'{SHOTS}/sperre-genutzt-master-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        o.close(); ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
