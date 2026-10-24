# [CLAUDE] UI-Test (25.10.2026, Backlog 258, Blickwinkel „Leitungswechsel“): Fuhrparkleitung bestätigt den Eingang einer Meldung und wird
# deaktiviert → Vorgang zeigt „nicht mehr Fuhrparkleitung – Meldung neu bewerten“; Master-Eingang „gesehen von …“ der ausgeschiedenen Person
# mit Hinweis und Knopf „gesehen“ zum Übernehmen. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
GONE={'de':'nicht mehr Fuhrparkleitung','uk':'більше не керівник автопарку','en':'no longer fleet management'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lw.inhaber','display_name':'LW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']; pid=os.getpid()
    vin=f'WDB9634031L{pid%10000:04d}58'[:17].ljust(17,'0')
    check(api('POST','/api/vehicles',{'vin':vin,'plate':f'LW-AB {pid%1000}','site':'Dortmund'})['s']==201,'Fahrzeug')
    fu=api('POST','/api/users',{'username':f'lw.leitung{pid}','display_name':'Alte Leitung','role':'fleet','environment':env})
    fc=br.new_context(); fp=fc.new_page(); fp.goto(B); fp.evaluate(JS,['POST','/api/invite/accept',{'token':fu['d']['invite_token'],'password':PW}])
    cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse blockiert (Test)','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
    v=fp.evaluate(JS,['GET',f'/api/cases/{cid}'])['d']['case']['version']
    check(fp.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'receive','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{}}])['s']==200,'Eingang durch alte Leitung')
    api('POST','/api/agent/run',{})
    mp=fp.evaluate(JS,['GET','/api/master'])['d']; inbox=mp.get('inbox') or mp.get('master_inbox') or []
    ev=[m for m in inbox if m.get('decision_status')=='offen']
    if ev: fp.evaluate(JS,['POST',f"/api/master/{ev[0]['event_id']}/decision",{'decision_status':'gesehen','expected_status':'offen'}])
    fc.close()
    d=api('PATCH',f"/api/users/{fu['d']['id']}",{'active':False})
    check(d['s']==200 and d['d'].get('fleet_handover',{}).get('received_untriaged',0)>=1,f"Übergabe-Hinweis {d['d'].get('fleet_handover')}")
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lw.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-recvgone]',timeout=15000)
        check(GONE[lang] in q.inner_text('[data-recvgone]'),f'{lang} {wd}px: Vorgang „nicht mehr Fuhrparkleitung“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('[data-recvgone]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/leitungswechsel-vorgang-{lang}-{wd}.png')
        if ev:
            q.goto(B+'/#/master'); q.reload(); q.wait_for_selector('[data-seengone]',timeout=15000)
            check(GONE[lang] in q.inner_text('[data-seengone]'),f'{lang} {wd}px: Master „gesehen von“ gekennzeichnet')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Master ohne Querscrollen')
            if SHOTS: q.locator('[data-seengone]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/leitungswechsel-master-{lang}-{wd}.png')
        else: check(False,'kein Master-Eintrag erzeugt')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
