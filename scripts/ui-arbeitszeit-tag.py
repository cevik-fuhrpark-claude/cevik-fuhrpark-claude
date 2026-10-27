# [CLAUDE] UI-Test Backlog 419 (Blickwinkel „Mechaniker bucht Arbeitszeit für zwei Aufträge am selben Tag“): Formular „Arbeitszeit erfassen“
# zeigt unter dem Datum, was mit diesem Konto am gewählten Tag schon erfasst ist (je Auftrag, Rest bis 24 h), aktualisiert sich beim Datumswechsel
# und warnt, wenn für denselben Auftrag an dem Tag schon Zeit gebucht ist. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NONE={'de':'noch keine Arbeitszeit','uk':'ще не внесено','en':'No working time'}
SUM={'de':'bereits erfasst','uk':'вже внесено','en':'Already recorded'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'az.inhaber','display_name':'AZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'az.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    ids=[]
    for i,vin in enumerate(['WDB96340310779001','WDB96340310779002']):
        api('POST','/api/vehicles',{'vin':vin,'plate':f'AZ-UI {i+1}','site':'Dortmund'})
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'UI-Test Arbeitszeit {i+1}','priority':'niedrig','driveability':'fahrbereit','request_key':f'az-ui-{i}'})
        check(r['s'] in (200,201),f'Vorgang {i+1} angelegt ({r["s"]})'); ids.append(r['d']['id'])
    def cmd(cid,action,payload={},note=None):
        c=api('GET',f'/api/cases/{cid}')['d']['case']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':os.urandom(8).hex(),'expected_version':c['version'],'payload':payload,'note':note})
    for cid in ids: check(cmd(cid,'approve_repair',{'workshop_site':ws},'Arbeitszeit-Test')['s']==200,'zur Reparatur freigegeben')
    yday=a.evaluate("() => { const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()); const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }")
    check(cmd(ids[0],'record_work',{'hours':'3,5','description':'Bremse vorn','work_date':yday})['s']==200,'3,5 h gestern an Auftrag 1')
    no0=api('GET',f'/api/cases/{ids[0]}')['d']['case']['case_no']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'az.inhaber','password':PW},None])
        # Auftrag 2: heute leer, gestern 3,5 h an Auftrag 1, keine Doppel-Warnung
        q.goto(B+f'/#/cases/{ids[1]}'); q.wait_for_selector('button[data-act=record_work]',timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_function("() => (document.querySelector('#workday')||{}).textContent", timeout=15000)
        check(NONE[lang] in q.inner_text('#workday'),f'{lang}/{w}: heute leer ({q.inner_text("#workday")[:80]!r})')
        q.fill('#af input[name=work_date]',yday); q.dispatch_event('#af input[name=work_date]','change')
        q.wait_for_function(f"() => (document.querySelector('#workday')||{{}}).textContent.includes({no0!r})", timeout=15000)
        txt=q.inner_text('#workday')
        check(SUM[lang] in txt and '3,5' in txt.replace('.',',') and '20,5' in txt.replace('.',',') and q.locator('[data-wdsame]').count()==0,f'{lang}/{w}: gestern 3,5 h, Rest 20,5 h, keine Warnung ({txt[:140]!r})')
        check(q.evaluate(noscroll),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/arbeitszeit_tag_{lang}_{w}.png')
        # Auftrag 1: gestern → Warnung „schon erfasst“, dieser Auftrag hervorgehoben
        q.goto(B+f'/#/cases/{ids[0]}'); q.wait_for_selector('button[data-act=record_work]',timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_selector('#workday'); q.fill('#af input[name=work_date]',yday); q.dispatch_event('#af input[name=work_date]','change')
        q.wait_for_selector('[data-wdsame]',timeout=15000)
        check(q.locator('[data-wdthis]').count()==1,f'{lang}/{w}: dieser Auftrag hervorgehoben + Doppel-Warnung')
        check(q.evaluate(noscroll),f'{lang}/{w}: Warnung ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/arbeitszeit_doppelt_{lang}_{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs}')
        c.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
