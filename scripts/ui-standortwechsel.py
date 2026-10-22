# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „Standortwechsel“): Standort eines Lkw in „Stammdaten bearbeiten“ ändern →
# Hinweis nennt den offenen Auftrag bei der bisherigen Werkstatt, den geplanten Prüftermin und den gekoppelten Anhänger am alten Standort;
# Werkstatt mit Standard-Standort sieht den Auftrag des versetzten Lkw in Vorgängen und Werkstattplan (kein Standort-Vorfilter).
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':['offener Werkstattauftrag bleibt bei der bisherigen Werkstatt (DORTMUND)','geplanter Prüftermin bleibt unverändert','SW-AH 2 steht noch am Standort Dortmund'],
     'uk':['відкрите замовлення залишається в попередній майстерні (DORTMUND)','запланований огляд залишається без змін','SW-AH 2 ще закріплений за локацією Dortmund'],
     'en':['open workshop order stays with the previous workshop (DORTMUND)','planned inspection remains unchanged','SW-AH 2 is still assigned to site Dortmund']}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sw.inhaber','display_name':'SW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'sw.werkstatt','display_name':'SW Werkstatt','role':'workshop','environment':envn,'workshop_site':'DORTMUND','home_site':'Dortmund'})
    check(u['s'] in (200,201),'Werkstattkonto angelegt '+str(u['s']))
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
    check(q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s']==200,'Einladung angenommen')
    q0.evaluate(JS,['PATCH','/api/me',{'home_site':'Dortmund'}]); c0.close()
    VIN='WDB96340310777301'; VID='VIN:'+VIN
    api('POST','/api/vehicles',{'vin':'WDB96340310777302','plate':'SW-AH 2','site':'Dortmund','kind':'anhaenger'})
    api('POST','/api/vehicles',{'vin':VIN,'plate':'SW-LK 1','site':'Dortmund','trailer_plate':'SW-AH 2'})
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Spiegel locker','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    check(c['s']==201,'Meldung '+str(c['s'])); CID=c['d']['id']
    for act,pl in [('approve_repair',{'workshop_site':'DORTMUND'})]:
        v=api('GET',f'/api/cases/{CID}')['d']['case']['version']
        check(api('POST',f'/api/cases/{CID}/commands',{'action':act,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':pl,'note':'UI-Test'})['s']==200,act)
    r=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'UVV','last_done_date':str(today-datetime.timedelta(days=300)),'interval_months':12,'evidence':'UI-Test Standortwechsel'})
    check(r['s'] in (200,201),'UVV angelegt')
    check(api('POST',f"/api/maintenance/{r['d']['id']}/plan",{'planned_date':str(today+datetime.timedelta(days=5))})['s']==200,'Termin geplant')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        api('POST','/api/vehicles',{'vin':VIN,'plate':'SW-LK 1','site':'Dortmund','trailer_plate':'SW-AH 2','keep_active':True})
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'sw.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+VID); q.reload(); q.wait_for_selector('#evf',state='attached',timeout=15000)
        q.locator('#evf').locator('xpath=ancestor::details[1]/summary').click()
        q.locator('#evf [name=site]').fill('Hamburg')
        q.locator('#evf button.btn:not(.secondary)').first.click()
        js="()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText).join(' | ')"
        try: q.wait_for_function(f"()=>[...document.querySelectorAll('.toast')].some(t=>t.innerText.includes({EXP[lang][0]!r}))",timeout=15000)
        except Exception: pass
        tx=q.evaluate(js)
        for e in EXP[lang]: check(e in tx,f'{lang} {w}px Hinweis: {e[:50]}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/standortwechsel_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    # Werkstatt mit Standard-Standort Dortmund: Auftrag des nach Hamburg versetzten Lkw in Vorgängen und Werkstattplan sichtbar
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B)
    errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.evaluate(JS,['POST','/api/login',{'username':'sw.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    q.goto(B+'/#/cases'); q.reload()
    try: q.wait_for_function("()=>document.body.innerText.includes('SW-LK 1')",timeout=15000); ok1=True
    except Exception: ok1=False
    check(ok1,'Werkstatt: Vorgangsliste zeigt den Auftrag des versetzten Lkw')
    if SHOTS: q.screenshot(path=f'{SHOTS}/standortwechsel_werkstatt_vorgaenge.png')
    q.goto(B+'/#/plan')
    try: q.wait_for_function("()=>document.body.innerText.includes('SW-LK 1')",timeout=15000); ok2=True
    except Exception: ok2=False
    check(ok2,'Werkstatt: Werkstattplan zeigt den Auftrag des versetzten Lkw')
    if SHOTS: q.screenshot(path=f'{SHOTS}/standortwechsel_werkstatt_plan.png')
    check(not errs,f'Werkstatt: keine Skriptfehler {errs}')
    ctx.close(); br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
if fails: raise SystemExit(1)
