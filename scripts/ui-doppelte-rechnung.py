# [CLAUDE] UI-Test (24.10.2026, Backlog 233): Fremdleistung mit bereits gebuchter Rechnungsnummer – Formular bleibt offen, Hinweis mit
# Fundstelle (Vorgangsnummer als Link, Lieferant, Betrag), Häkchen „Trotzdem buchen“; andere Nummer eingetippt → Hinweis verschwindet;
# mit Häkchen gebucht. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dr.inhaber','display_name':'DR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310995931'; api('POST','/api/vehicles',{'plate':'DR-AB 1','vin':'WDB96340310995931','site':'Dortmund'})
    n=0
    def mkcase(k):
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'DR {k}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'dr-{os.getpid()}-{k}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'dra-{os.getpid()}-{k}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        return cid
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'; inv=f'RE-{9000+n}'
        first=mkcase(f'{n}a'); v=api('GET',f'/api/cases/{first}')['d']['case']['version']
        firstNo=api('GET',f'/api/cases/{first}')['d']['case']['case_no']
        check(api('POST',f'/api/cases/{first}/commands',{'action':'add_external_cost','command_id':f'dre-{os.getpid()}-{n}','expected_version':v,'payload':{'supplier':'Kienzle GmbH','invoice_no':inv,'amount_net':'312,50'}})['s']==200,f'{tag}: erste Buchung')
        cid=mkcase(f'{n}b')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dr.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=add_external_cost]',timeout=15000)
        q.click('[data-act=add_external_cost]'); q.wait_for_selector('#af [name=invoice_no]',timeout=15000)
        q.fill('#af [name=supplier]','Kienzle'); q.fill('#af [name=invoice_no]',inv.lower()); q.fill('#af [name=amount_net]','100')
        q.click('#af button:not([type=button])'); q.wait_for_selector('#dupinv',timeout=15000)
        txt=q.inner_text('#dupinv')
        check(firstNo in txt and 'Kienzle GmbH' in txt and '312' in txt,f'{tag}: Fundstelle genannt ({txt[:80]!r})')
        check(q.evaluate(f"()=>!!document.querySelector('#dupinv a[href=\"#/cases/{first}\"]')"),f'{tag}: Vorgangsnummer verlinkt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/doppelte_rechnung_{lang}_{w}.png',full_page=True)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        # andere Nummer → Hinweis weg; zurück zur alten Nummer → Hinweis kommt beim Speichern wieder
        q.fill('#af [name=invoice_no]',inv+'x'); check(not q.query_selector('#dupinv'),f'{tag}: Hinweis verschwindet bei neuer Nummer')
        q.fill('#af [name=invoice_no]',inv); q.click('#af button:not([type=button])'); q.wait_for_selector('#dupinv',timeout=15000)
        q.check('#dupinv [name=confirm_duplicate_invoice]'); q.click('#af button:not([type=button])'); q.wait_for_selector('#af',state='detached',timeout=15000)
        ext=[e for e in api('GET',f'/api/cases/{cid}')['d'].get('external_costs',[]) if e.get('invoice_no')==inv]
        check(len(ext)==1,f'{tag}: nach Bestätigung genau einmal gebucht ({len(ext)})')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
