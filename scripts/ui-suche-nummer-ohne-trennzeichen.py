# [CLAUDE] UI-Test (04.11.2026, Backlog 999, Blickwinkel „Rechnung kommt per Post, Nummer anders geschrieben“): Vorgangsliste (#cq) findet den Vorgang
# über die Rechnungsnummer „RE-<R>/0815“ eingegeben als „re <R> 0815“, die globale Suche (#gq) über die Vorgangsnummer ohne Striche.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000; vin=f'WDB96340340{R:05d}N'[:17]
    r=api('POST','/api/vehicles',{'plate':f'NR-T {R%10000}','vin':vin,'site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug {r["s"]}')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht','priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':f'nr{R}'}); check(r['s']==201,f'Vorgang {r["s"]}'); cid=r['d']['id']
    def cmd(action,payload,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload}
        if note: b['note']=note
        r=api('POST',f'/api/cases/{cid}/commands',b); check(r['s']==200,f'{action} {r["s"]} {r["d"]}')
    cmd('approve_repair',{'workshop_site':'DORTMUND'},'Bremse')
    cmd('add_external_cost',{'supplier':'Bremsendienst GmbH','invoice_no':f'RE-{R}/0815','amount_net':'180,00','valuation':'estimate'})
    cno=api('GET',f'/api/cases/{cid}')['d']['case']['case_no']; plain=''.join(ch for ch in cno if ch.isalnum())
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases'); m.reload(); m.wait_for_selector('#cq',timeout=20000)
        m.fill('#cq',f're {R} 0815')
        try: m.wait_for_selector(f'#cl a.row[href="#/cases/{cid}"]',timeout=10000); hit=True
        except Exception: hit=False
        check(hit,f'{lang} {w}px: Vorgangsliste findet „re {R} 0815“')
        if SHOTS: m.screenshot(path=f'{SHOTS}/nummer_liste_{lang}_{w}.png')
        check(m.evaluate(noscroll),f'{lang} {w}px: Liste ohne Querscrollen')
        m.goto(B+'/#/search'); m.wait_for_selector('#gq',timeout=15000); m.fill('#gq',plain)
        try: m.wait_for_selector(f'#gr a[href="#/cases/{cid}"]',timeout=10000); hit=True
        except Exception: hit=False
        check(hit,f'{lang} {w}px: globale Suche findet „{plain}“')
        if SHOTS: m.screenshot(path=f'{SHOTS}/nummer_suche_{lang}_{w}.png')
        check(m.evaluate(noscroll),f'{lang} {w}px: Suche ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
