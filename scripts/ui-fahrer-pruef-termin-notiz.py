# [CLAUDE] UI-Test (13.11.2026, Backlog 1445, Blickwinkel „Fahrer bringt den Lkw selbst zur Prüfstelle – Uhrzeit/Ort standen nur in Akte,
# Werkstattplan und Dispo“): Leitung plant UVV morgen mit Hinweis zum Termin; Fahrer sieht den Hinweis auf „Mein Fahrzeug“ und in der
# Abfahrtskontrolle (Kasten Prüffristen). Backlog 1446: Hinweis zum Werkstatttermin eines offenen Vorgangs in der Liste „bekannte Mängel“ der
# Abfahrtskontrolle. Fahrerkonto, DE/UK/EN 390/820/1366 px.
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tu.inhaber','display_name':'TU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    # Berliner Datum vom Server (Browser-Uhr kann nach UTC laufen)
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    def iso(d): return (datetime.date.fromisoformat(today)+datetime.timedelta(days=d)).isoformat()
    R=os.getpid()%100000; n=0
    wu=api('POST','/api/users',{'username':f'fp.ws{R}','display_name':'FP Werkstatt','role':'workshop','environment':envn,'language':'de','workshop_site':'DORTMUND'})
    wctx=br.new_context(); wp=wctx.new_page(); wp.goto(B)
    wp.evaluate(JS,['POST','/api/invite/accept',{'token':wu['d']['invite_token'],'password':PW}]); wp.evaluate(JS,['POST','/api/login',{'username':f'fp.ws{R}','password':PW}])
    wapi=lambda m,pa,b=None: wp.evaluate(JS,[m,pa,b])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'FP-T {R%900}{n}'; vin=f'WFP{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'UVV','last_done_date':iso(-300),'interval_months':12,'evidence':'Prüfbuch UVV (Test)'})
        check(r['s']==201,f'{lang}/{w}: UVV angelegt'); rid=r['d']['id']
        note=f'7:00 Uhr Prüfstelle Nord, Tor 3 ({n})'
        check(api('POST',f'/api/maintenance/{rid}/plan',{'planned_date':iso(1),'planned_note':note})['s']==200,f'{lang}/{w}: Termin morgen mit Hinweis')
        def cmd(cid,action,payload,note=None,f=None):
            f=f or api
            v=f('GET',f'/api/cases/{cid}')['d']['case']['version']
            body={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
            if note: body['note']=note
            return f('POST',f'/api/cases/{cid}/commands',body)
        c=api('POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel rechts lose','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        cid=c['d']['id']; wnote=f'Abgabe 6:30 Uhr, Halle 2 ({n})'
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND','planned_date':iso(2)},'Termin')['s']==200,f'{lang}/{w}: Werkstattauftrag mit Termin')
        check(cmd(cid,'acknowledge',{},f=wapi)['s']==200,f'{lang}/{w}: Übernahme Werkstatt')
        x=cmd(cid,'set_planned_date',{'planned_date':iso(2),'planned_note':wnote},f=wapi); check(x['s']==200,f'{lang}/{w}: Hinweis zum Werkstatttermin {x["s"]} {str(x["d"])[:120]}')
        un=f'fp.fahrer{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'FP Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Fahrerkonto')
        check(api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':u['d']['id'],'end_previous':False})['s']==201,f'{lang}/{w}: zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        L=q.evaluate("async (l) => (await import('/i18n.js')).STRINGS[l].plan_note_lbl", lang)
        q.goto(B+'/#/'); q.reload()
        q.wait_for_selector('[data-drvplannote]',timeout=20000)
        txt=' '.join(q.locator('[data-drvplannote]').all_inner_texts())
        check(note in txt and L in txt,f'{lang}/{w}: Mein Fahrzeug zeigt „{L}: …“')
        if SHOTS:
            q.locator('[data-drvplannote]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrer-pruef-notiz-start-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Startseite ohne Querscrollen')
        q.goto(B+'/#/check'); q.wait_for_selector('.checkitem',timeout=15000)
        if q.locator('#v').count() and q.locator('#v').evaluate('e=>e.tagName')=='SELECT': q.select_option('#v',vid)
        try: q.wait_for_selector('[data-drvplannote]',timeout=15000); ok=True
        except Exception: ok=False
        check(ok and note in ' '.join(q.locator('[data-drvplannote]').all_inner_texts()),f'{lang}/{w}: Abfahrtskontrolle nennt den Hinweis')
        try: q.wait_for_selector('[data-kdplannote]',timeout=10000); ok2=True
        except Exception: ok2=False
        check(ok2 and wnote in ' '.join(q.locator('[data-kdplannote]').all_inner_texts()),f'{lang}/{w}: bekannte Mängel nennen den Hinweis zum Werkstatttermin')
        if SHOTS and ok:
            q.locator('[data-drvplannote]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrer-pruef-notiz-check-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Abfahrtskontrolle ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine JS-Fehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
