# [CLAUDE] UI-Test (01.11.2026, Backlog 826, Blickwinkel „Werkstatt-Tablet: Kontrolle nach Reparatur für den falschen Vorgang begonnen“):
# Das Formular „Kontrolle nach Reparatur“ zeigt Kennzeichen (groß), Fahrzeugart/Hersteller und Auftrag, neben dem km-Feld den zuletzt erfassten
# Stand; während der Eingabe die Differenz. Kleinerer Stand → Hinweis mit Bestätigung, Speichern ohne Bestätigung sendet nichts; mit Bestätigung
# gespeichert (Stand nur an der Kontrolle). Knopf nennt das Kennzeichen. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Braucht den Dev-Server.
import os
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fa.inhaber','display_name':'FA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envName=(me.get('user') or me).get('environment') or 'production'
    w=api('POST','/api/users',{'username':'fa.werkstatt','display_name':'FA Werkstatt','role':'workshop','environment':envName,'workshop_site':'DORTMUND'})
    if w['s'] in (200,201):
        b2=br.new_page(); b2.goto(B); b2.evaluate(JS,['POST','/api/invite/accept',{'token':w['d']['invite_token'],'password':PW}]); b2.close()
    import uuid, random
    n=0; RUN=random.randint(1000,9999)  # erneuter Lauf am selben Server: neue Fahrzeuge
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        # je Lauf eigenes Fahrzeug (ein offener Winterreifen-Auftrag je Fahrzeug)
        n+=1; V=f'VIN:WMA06XZZ8RP{RUN}{n:02d}'
        api('POST','/api/vehicles',{'vin':V[4:],'plate':'FA-LK 826','site':'Dortmund','kind':'lkw','manufacturer':'MAN'})
        k=api('POST',f'/api/vehicles/{V}/odometer',{'km':500000})
        check(k['s'] in (201,409),f'{lang}/{wd}: km-Stand angelegt ({k["s"]})')
        o=api('POST',f'/api/vehicles/{V}/tires/winter-order',{'workshop_site':'DORTMUND','request_key':uuid.uuid4().hex})
        cid=o['d']['id'] if o['s']==201 else None
        check(bool(cid),f'{lang}/{wd}: Auftrag angelegt ({o["s"]} {o["d"] if o["s"]!=201 else ""})')
        if not cid: continue
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        posts=[]; q.on('request',lambda r: posts.append(r.post_data_json) if r.method=='POST' and r.url.endswith('/api/inspections') else None)
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':'fa.werkstatt','password':PW}])['s']==200,f'{lang}/{wd}: Anmeldung Werkstatt'); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        cur=q.evaluate(JS,['GET','/api/cases/'+cid])['d']['case']
        st=q.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':uuid.uuid4().hex,'expected_version':cur['version'],'payload':{}}])
        check(st['s']==200,f'{lang}/{wd}: Reparatur begonnen ({st["s"]})')
        q.evaluate("sessionStorage.clear()")
        q.goto(B+f'/#/inspect/{cid}'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        check(q.locator('#irv .plate.big').count()==1 and 'FA-LK 826' in q.inner_text('#irv'),f'{lang}/{wd}: Kennzeichen groß oben')
        check('MAN' in (q.inner_text('#irvveh') if q.locator('#irvveh').count() else ''),f'{lang}/{wd}: Fahrzeugart/Hersteller')
        check('FA-LK 826' in q.inner_text('#isb'),f'{lang}/{wd}: Knopf nennt das Kennzeichen')
        lk=q.inner_text('#kmlast') if q.locator('#kmlast').count() else ''
        check('500' in lk,f'{lang}/{wd}: letzter Stand genannt ({lk!r})')
        q.fill('#km','501 234'); q.wait_for_timeout(50)
        check(q.locator('#kmdiff').count()==1 and '1' in q.inner_text('#kmdiff') and q.locator('#kmlow').count()==0,f'{lang}/{wd}: Differenz bei größerem Stand')
        q.fill('#km','312000'); q.wait_for_timeout(50)
        check(q.locator('#kmlow').count()==1 and q.locator('#kmok').count()==1,f'{lang}/{wd}: Hinweis bei kleinerem Stand')
        q.evaluate("document.querySelectorAll('#f .checkitem').forEach((r) => { if (!r.querySelector('input[type=radio]:checked')) r.querySelector('input[value=ok]').click(); })")
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS:
            q.evaluate('window.scrollTo(0,0)'); q.screenshot(path=f'{SHOTS}/irv-kopf-{lang}-{wd}.png')
            q.locator('#kmlow').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/irv-km-{lang}-{wd}.png')
        n0=len(posts); q.click('#isb'); q.wait_for_timeout(400)
        check(len(posts)==n0,f'{lang}/{wd}: ohne Bestätigung nichts gesendet')
        q.check('#kmok')
        with q.expect_response(lambda r: r.url.endswith('/api/inspections') and r.request.method=='POST',timeout=15000) as ri: q.click('#isb')
        res=ri.value.json()
        check(ri.value.status==201 and (res.get('km_rejected') or {}).get('previous_km')==500000,f'{lang}/{wd}: gespeichert, Stand nur an der Kontrolle ({ri.value.status})')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
