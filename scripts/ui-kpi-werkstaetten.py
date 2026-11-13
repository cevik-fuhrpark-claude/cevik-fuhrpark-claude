# [CLAUDE] UI-Test Backlog 1421 (Blickwinkel „Inhaber vergleicht zwei Werkstätten“): Kennzahlen zeigen ohne Werkstattfilter den Abschnitt
# „Werkstätten im Vergleich“ (eine Zeile je Werkstatt), mit Werkstattfilter nicht; DE/UK/EN, 390/820/1366 px, kein waagerechtes Scrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
HEAD={'de':'Werkstätten im Vergleich','uk':'Порівняння майстерень','en':'Workshops compared'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wv.inhaber','display_name':'WV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='wv.inhaber' if s['s']==200 else os.environ.get('CFP_OWNER','wv.inhaber')
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    ok=0
    for j,ws in enumerate(['DORTMUND','MUENCHEN','DORTMUND']):
        vin=f'WDB96340310777{j:03d}'
        api('POST','/api/vehicles',{'vin':vin,'plate':f'WV-KZ {j+1}','site':'Dortmund'})
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Werkstattvergleich Bremse {j}','priority':'mittel','driveability':'fahrbereit','request_key':f'wv-{j}'})
        if r['s'] not in (200,201): continue
        cid=r['d']['id']; ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        x=api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':ver,'payload':{'workshop_site':ws},'note':'freigegeben'})
        ok+= x['s']==200
    check(ok==3,f'3 Aufträge an zwei Werkstätten freigegeben ({ok})')
    for lang in ['de','uk','en']:
        for w,h in [(390,844),(820,1180),(1366,900)]:
            c=br.new_context(accept_downloads=True,viewport={'width':w,'height':h},locale={'de':'de-DE','uk':'uk-UA','en':'en-GB'}[lang]); q=c.new_page(); q.goto(B)
            errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}])
            q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            q.goto(B+'/#/kpi'); q.reload(); q.wait_for_selector('#kpiws',timeout=15000)
            check(HEAD[lang] in q.inner_text('#kpiws h3'),f'{lang} {w}px: Überschrift')
            rows=q.locator('#kpiws tr[data-kws]').count()
            check(rows>=2,f'{lang} {w}px: je Werkstatt eine Zeile ({rows})')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein waagerechtes Scrollen')
            if SHOTS: q.locator('#kpiws').scroll_into_view_if_needed(); q.locator('#kpiws').screenshot(path=f"{SHOTS}/kpi_werkstaetten_{lang}_{w}.png")
            if lang=='de' and w==1366:
                with q.expect_download() as dl: q.click('#kcsvw')
                d=dl.value; txt=open(d.path(),encoding='utf-8-sig').read()
                check('werkstaetten' in d.suggested_filename and txt.startswith('Werkstatt;Werkstattname;') and 'DORTMUND;Werkstatt Dortmund;' in txt,f'CSV je Werkstatt ({d.suggested_filename})')
                q.select_option('#kf2 select[name=site]','MUENCHEN'); q.click('#kf2 button:not([type])'); q.wait_for_timeout(800)
                check(q.locator('#kpiws').count()==0,'mit Werkstattfilter kein Vergleich')
            check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
            c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
