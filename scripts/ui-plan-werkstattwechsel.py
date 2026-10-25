# [CLAUDE] UI-Test (25.10.2026, Backlog 265, Blickwinkel „Werkstatt fällt eine Woche aus“): Leitung wechselt im Werkstattplan die Werkstatt
# eines freigegebenen Auftrags (Tagesliste) – ohne Grund Hinweis, mit Grund gespeichert; Auftrag verschwindet aus dem Plan der bisherigen
# Werkstatt. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os, uuid, datetime
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pw.inhaber','display_name':'PW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    wss=[w['code'] for w in api('GET','/api/meta')['d']['workshops']]; w1,w2=wss[0],wss[1]
    tomorrow=(datetime.date.today()+datetime.timedelta(days=2)).isoformat()
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        va=f'WDB9634031X{pid%10000:04d}{n:02d}'[:17].ljust(17,'0')
        check(api('POST','/api/vehicles',{'vin':va,'plate':f'PW-AB {n}5','site':'Dortmund'})['s']==201,'Fahrzeug')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':f'Bremse zieht PW{n} (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{'workshop_site':w1,'planned_date':tomorrow},'note':'frei'})['s']==200,'Freigabe mit Termin')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pw.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/plan'); q.reload(); q.wait_for_selector(f'[data-pws="{cid}"]',state='attached',timeout=15000)
        det=q.locator('details.planws').filter(has=q.locator(f'[data-pws="{cid}"]'))
        det.locator('summary').click()
        check(q.locator(f'#pw-{cid} option[value="{w1}"]').count()==0,f'{lang} {wd}px: bisherige Werkstatt nicht wählbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: det.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plan-werkstattwechsel-{lang}-{wd}.png')
        q.click(f'[data-pws="{cid}"]'); q.wait_for_timeout(300)
        check(api('GET',f'/api/cases/{cid}')['d']['case']['workshop_site']==w1,f'{lang} {wd}px: ohne Grund nichts geändert')
        q.select_option(f'#pw-{cid}',w2); q.fill(f'#pwr-{cid}','Werkstatt fällt aus'); q.click(f'[data-pws="{cid}"]')
        q.wait_for_function("(c)=>{ const r=window; return true }",arg=cid); q.wait_for_timeout(800)
        d=api('GET',f'/api/cases/{cid}')['d']
        check(d['case']['workshop_site']==w2 and not d['case']['planned_date'],f'{lang} {wd}px: Werkstatt gewechselt, alter Termin entfällt')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
