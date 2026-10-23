# [CLAUDE] UI-Test „Inhaber am Handy unterwegs“ (Teilagent 23.10.2026):
# 1) Startseite: fällt eine Anfrage der Übersicht aus, erscheint ein Warnfeld statt „Nichts Dringendes offen“ (DE/UK/EN).
# 2) Master-Eingang: „Gesehen“/„Erledigt“ sind Knöpfe ≥ 24 px; „Erledigt“ fragt nach (Abbrechen → bleibt offen).
# 3) Zurück aus einem Eintrag stellt die Scrollposition der langen Liste wieder her.
# 4) Umschalten Test/Betrieb auf einer Vorgangsseite führt zur Vorgangsliste statt „nicht gefunden“.
# 5) Einrichtungsstand → Stundensatz springt zum Feld in den Einstellungen (Fokus, sichtbar).
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, env]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (env) h['x-cfp-env'] = env;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,env=None: a.evaluate(JS,[m,pa,b,env])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'iu.inhaber','display_name':'IU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'iu.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('POST','/api/vehicles',{'vin':'WDB96340310888001','plate':'IU-HA 1','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310888001','description':'UI-Test: Spiegel lose','priority':'niedrig','driveability':'fahrbereit','request_key':'iu-c1'},'production')
    check(r['s'] in (200,201),'Vorgang Betrieb '+str(r['s'])); cid=r['d']['id']
    for i in range(3):
        k=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310888001','description':'UI-Test: Bremsleitung undicht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':f'iu-krit-{i}'},'production')
        check(k['s'] in (200,201),'kritischer Vorgang '+str(k['s']))
    check(api('POST','/api/agent/run',None,'production')['s']==200,'Agent gelaufen (Übergaben an den Master-Eingang)')
    check(api('POST','/__dev/seed-findings?n=40&env=production')['s']==200,'Befunde für langen Master-Eingang')
    for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'iu.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_env','production')")
        # 1) Teilausfall der Startseite
        for lang,word in [('de','Übersicht'),('uk','огляду'),('en','overview')]:
            q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
            q.route('**/api/cases?status=open&limit=500*', lambda r: r.abort())
            q.goto(B+'/#/'); q.reload(); q.wait_for_selector('[data-todofail]',timeout=15000)
            check(word in q.inner_text('[data-todofail]') and q.locator('#main .panel.good').count()==0,f'{w}px {lang}: Warnfeld statt „nichts offen“')
            if SHOTS and lang=='de': q.screenshot(path=f'{SHOTS}/inhaber_teilausfall_{w}.png')
            q.unroute('**/api/cases?status=open&limit=500*')
        q.click('#todoretry'); q.wait_for_function("()=>!document.querySelector('[data-todofail]')",timeout=15000)
        check(True,f'{w}px: Erneut versuchen lädt vollständig')
        q.evaluate(JS,['PATCH','/api/me',{'language':'de'},None]); q.reload(); q.wait_for_selector('#main')
        # 2) Master-Eingang: Knöpfe und Rückfrage
        q.goto(B+'/#/more'); q.goto(B+'/#/master'); q.wait_for_selector('[data-dec][data-st="erledigt"]')
        bx=[q.locator(sel).first.bounding_box() for sel in ['[data-dec][data-st="gesehen"]','[data-dec][data-st="erledigt"]']]
        check(all(b and b['height']>=24 and b['width']>=24 for b in bx),f'{w}px: Knöpfe ≥ 24 px {[(round(b["width"]),round(b["height"])) for b in bx]}')
        ev=q.locator('[data-dec][data-st="erledigt"]').first.get_attribute('data-dec')
        q.once('dialog', lambda d: d.dismiss()); q.locator(f'[data-dec="{ev}"][data-st="erledigt"]').click(); q.wait_for_timeout(400)
        check(q.locator(f'[data-dec="{ev}"]').count()>=1,f'{w}px: Abbrechen lässt den Eintrag offen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/inhaber_master_{w}.png')
        # 3) Zurück mit Scrollposition
        links=q.locator('#main a[href^="#/cases/"], #main a[href^="#/vehicles/"]'); n=links.count()
        tgt=links.nth(n-1); tgt.scroll_into_view_if_needed(); y0=q.evaluate('scrollY')
        tgt.click(); q.wait_for_function("()=>!location.hash.startsWith('#/master')"); q.wait_for_timeout(800)
        q.go_back(); q.wait_for_selector('[data-dec]'); q.wait_for_timeout(600); y1=q.evaluate('scrollY'); ymax=q.evaluate('document.documentElement.scrollHeight-innerHeight')
        # Seite kann nach dem Neuaufbau etwas kürzer sein (Zeitangaben) – dann bis ans Ende
        check(y0<200 or abs(y1-min(y0,ymax))<150,f'{w}px: Zurück stellt Scrollposition her ({y0} → {y1}, Ende {ymax})')
        # 4) Umschalten auf der Vorgangsseite
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#envsel'); q.select_option('#envsel','test')
        q.wait_for_function("()=>location.hash==='#/cases'"); q.wait_for_timeout(500)
        check(q.locator('#errh').count()==0,f'{w}px: Umschalten → Vorgangsliste statt Fehlerseite')
        q.select_option('#envsel','production'); q.wait_for_timeout(500)
        # 5) Einrichtungsstand → Feld
        q.goto(B+'/#/readiness'); q.wait_for_selector('[data-rd="hourly_rate"]'); q.click('[data-rd="hourly_rate"]')
        q.wait_for_function("()=>document.activeElement && document.activeElement.id==='workshop_hourly_rate_net'",timeout=15000)
        r2=q.evaluate("()=>{const b=document.getElementById('workshop_hourly_rate_net').getBoundingClientRect(); return [b.top, innerHeight]}")
        check(0<=r2[0]<=r2[1],f'{w}px: Stundensatz sichtbar und fokussiert ({round(r2[0])}/{r2[1]})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{w}px: kein Querscrollen')
        check(not errs,f'{w}px: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
