# [CLAUDE] UI-Test (22.10.2026, Backlog 121/122): Hinweise beim Deaktivieren eines Kontos (letztes Werkstattkonto eines Standorts mit
# offenem Auftrag) und beim Außer-Betrieb-Nehmen eines Fahrzeugs mit geplantem Prüftermin – DE/UK/EN, 390/820/1366 px, ohne Querscrollen/
# Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP_WS={'de':'offener Werkstattauftrag bei','uk':'тепер не має активного облікового запису майстерні','en':'now has no active workshop account'}
EXP_PL={'de':'geplanter Prüftermin erscheint nicht mehr im Werkstattplan','uk':'запланований огляд більше не відображається','en':'planned inspection no longer appears in the workshop plan'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lz.inhaber','display_name':'LZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'lz.werkstatt','display_name':'Lena Werkstatt-Ende','role':'workshop','environment':envn,'workshop_site':'DORTMUND'})
    check(u['s'] in (200,201),'Werkstattkonto angelegt '+str(u['s'])); WID=u['d']['id']
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
    check(q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s']==200,'Einladung angenommen'); c0.close()
    VID='VIN:WDB96340310777121'; VID2='VIN:WDB96340310777122'
    api('POST','/api/vehicles',{'vin':'WDB96340310777121','plate':'LZ-WS 121','site':'Dortmund'})
    api('POST','/api/vehicles',{'vin':'WDB96340310777122','plate':'LZ-PL 122','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Bremse quietscht','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    check(c['s']==201,'Meldung '+str(c['s'])); CID=c['d']['id']
    for act,pl in [('approve_repair',{'workshop_site':'DORTMUND'}),('start_repair',{})]:
        v=api('GET',f'/api/cases/{CID}')['d']['case']['version']
        check(api('POST',f'/api/cases/{CID}/commands',{'action':act,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':pl,'note':'UI-Test'})['s']==200,act)
    r=api('POST',f'/api/vehicles/{VID2}/maintenance',{'kind':'UVV','last_done_date':str(today-datetime.timedelta(days=300)),'interval_months':12,'evidence':'UI-Test Lebenszyklus'})
    check(r['s'] in (200,201),'UVV angelegt')
    check(api('POST',f"/api/maintenance/{r['d']['id']}/plan",{'planned_date':str(today+datetime.timedelta(days=5))})['s']==200,'Termin geplant')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        api('PATCH',f'/api/users/{WID}',{'active':True}); api('POST',f'/api/vehicles/{VID2}/active',{'active':True,'reason':'UI-Test'})
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'lz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.on('dialog',lambda d: d.accept('verkauft') if d.type=='prompt' else d.accept())
        q.goto(B+'/#/users'); q.reload(); q.wait_for_selector(f'[data-act="{WID}"]',timeout=15000)
        q.click(f'[data-act="{WID}"]')
        q.wait_for_selector('.toast',timeout=10000); t1=q.inner_text('.toast')
        check(EXP_WS[lang] in t1 and 'Dortmund' in t1.replace('DORTMUND','Dortmund'),f'{lang} {w}px Konto: {t1[:110]}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen (Benutzer)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lebenszyklus_konto_{lang}_{w}.png')
        q.goto(B+f'/#/vehicles/{VID2}'); q.wait_for_selector('#deact',state='attached',timeout=15000); q.eval_on_selector('#deact','b=>b.click()')
        q.wait_for_function(f"()=>[...document.querySelectorAll('.toast')].some(t=>t.innerText.includes({EXP_PL[lang]!r}))",timeout=10000)
        check(True,f'{lang} {w}px Fahrzeug: Hinweis geplanter Prüftermin')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen (Fahrzeug)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lebenszyklus_fahrzeug_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
