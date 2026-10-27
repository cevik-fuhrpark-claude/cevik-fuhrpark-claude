# [CLAUDE] UI-Test (27.10.2026, Backlog 453, Blickwinkel „Neue Werkstatt-Aushilfe, erster Tag am Tablet (UK)“):
# Werkstatt-Startseite zeigt oben den Kurzablauf eines Auftrags (aufgeklappt, Schrittnamen = Knopf-Beschriftungen), „Ausblenden“ klappt zu
# und bleibt nach Neuladen zugeklappt (ohne Knopf); Vorab-Info-Zeile bricht um (Hinweis „noch kein Reparaturauftrag“ nicht abgeschnitten).
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ACK={'de':'„Auftrag übernehmen“','uk':'«Прийняти замовлення»','en':'“Accept order”'}
QC={'de':'„Zur Abschlusskontrolle“','uk':'«На фінальний контроль»','en':'“Send to final inspection”'}
PREV={'de':'noch kein Reparaturauftrag','uk':'ще не замовлення на ремонт','en':'not yet a repair order'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ka.inhaber','display_name':'KA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ka.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    users=[]
    for lang in ['de','uk','en']:
        un='ka.ws.'+lang; users.append((lang,un))
        u=api('POST','/api/users',{'username':un,'display_name':'KA Aushilfe '+lang.upper(),'role':'workshop','environment':'production','workshop_site':'DORTMUND','language':lang})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    vid='VIN:WDB9634031L400001'; api('POST','/api/vehicles',{'vin':'WDB9634031L400001','plate':'KA-AB 1','site':'Dortmund'})
    api('POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel rechts gebrochen','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#wsflow',timeout=15000); q.wait_for_timeout(500)
        d=q.locator('#wsflow')
        txt=d.inner_text()
        check(d.evaluate('e=>e.open'),f'{lang} {wd}px: Kurzablauf aufgeklappt')
        check(ACK[lang] in txt and QC[lang] in txt,f'{lang} {wd}px: Knopf-Beschriftungen im Ablauf')
        check(q.locator('#wsflow li').count()==6,f'{lang} {wd}px: 6 Schritte')
        sub=q.locator('.list a.row .sub').filter(has_text=PREV[lang])
        check(sub.count()==1 and sub.evaluate('e=>e.scrollWidth<=e.clientWidth+1'),f'{lang} {wd}px: Vorab-Info-Hinweis nicht abgeschnitten')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wsflow_{lang}_{wd}.png',full_page=True)
        if wd==1366:
            q.click('#wsflowhide'); q.wait_for_timeout(300)
            check(not d.evaluate('e=>e.open') and q.locator('#wsflowhide').count()==0,f'{lang}: Ausblenden klappt zu')
            q.reload(); q.wait_for_selector('#wsflow',timeout=15000); q.wait_for_timeout(500)
            check(not q.locator('#wsflow').evaluate('e=>e.open') and q.locator('#wsflowhide').count()==0,f'{lang}: nach Neuladen zugeklappt, kein Knopf')
            q.click('#wsflow summary'); q.wait_for_timeout(200)
            check(q.locator('#wsflow li').first.is_visible(),f'{lang}: zugeklappt weiter erreichbar')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
