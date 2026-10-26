# [CLAUDE] UI-Test Blickwinkel „Getriebetausch/Reifengröße – Fahrtenschreiber prüfen“ (26.10.2026, Backlog 395–398): Formular
# „Abschlusskontrolle anfordern“ zeigt bei Getriebe/Tachogeber den Hinweis § 57b StVZO; Fahrzeugakte: „Erledigt“ für Tachograph mit
# Nachweis-Hinweis (Einbauschild); Kurzinfo im Vorgang „Prüfungen ≤ 60 Tage“ bei Vorwarnung 60. DE/UK/EN bei 390/820/1366 px.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
D60={'de':'60 Tage','uk':'60 днів','en':'60 days'}
PLATE={'de':'Einbauschild','uk':'установча табличка','en':'installation plaque'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gt.inhaber','display_name':'GT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ0HP108395'; vid='VIN:'+vin; api('POST','/api/vehicles',{'plate':'GT-TC 395','vin':vin,'site':'Dortmund'})
    d=lambda k: (datetime.date.today()+datetime.timedelta(days=k)).isoformat()
    check(api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Tachograph','next_due_date':d(45),'evidence':'Einbauschild (Test)'})['s'] in (201,409),'Tachograph-Regel')
    check(api('PUT','/api/settings',{'maintenance_warn_days':60})['s']==200,'Vorwarnung 60')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'gt-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Getriebe schaltet nicht in den 3. Gang','priority':'mittel','driveability':'eingeschraenkt','request_key':str(uuid.uuid4())})
    CID=r['d']['id']
    check(cmd(CID,'approve_repair',{'workshop_site':site},'Getriebe tauschen')['s']==200 and cmd(CID,'start_repair')['s']==200,'in Reparatur')
    check(cmd(CID,'add_part',{'name':'Tachogeber (Impulsgeber KITAS)','quantity':1})['s']==200,'Teil Tachogeber')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gt.inhaber','password':PW},None])
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('button[data-act="request_quality_check"]', timeout=15000)
        body=q.evaluate("(document.querySelector('details.vinfo')||{}).textContent||''")
        check(D60[lang] in body,f'{lang}/{w}: Kurzinfo „≤ {D60[lang]}“')
        q.locator('button[data-act="request_quality_check"]').first.click(); q.wait_for_selector('[data-tachowork]', timeout=10000)
        check('57b' in q.inner_text('[data-tachowork]'),f'{lang}/{w}: Hinweis § 57b im Formular')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS and w==390: q.locator('[data-tachowork]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gt_case_{lang}.png')
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('button[data-done]', timeout=15000)
        q.locator('button[data-done]').first.click(); q.wait_for_selector('[data-tachodone]', timeout=10000)
        check(PLATE[lang] in q.inner_text('[data-tachodone]'),f'{lang}/{w}: Nachweis-Hinweis Tachograph')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Akte ohne Querscrollen')
        if SHOTS and w==390: q.locator('[data-tachodone]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gt_akte_{lang}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
