# [CLAUDE] UI-Test Backlog 1100 (Blickwinkel „Werkstatt-Tablet im Querformat mit Handschuhen“): In der Kontrolle nach Reparatur sind
# OK/Mangel/entfällt ab 700 px je mind. 88 px breit, 44 px hoch und durch eine Trennlinie getrennt; am Handy (390 px) bleibt es kompakt
# (kein Querscrollen, Prüfpunkt-Text lesbar). Link „Fahrzeugakte“ im Vorgang mind. 24 px hoch. Tippen auf „OK“ wählt OK (nicht „Mangel“).
# DE/UK/EN bei 390/820/1024/1280 px, synthetische Daten. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SEG = """() => [...document.querySelectorAll('main .checkitem')].map((row) => { const ls = [...row.querySelectorAll('.seg label')].map((l) => { const r = l.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left, bl: parseFloat(getComputedStyle(l).borderLeftWidth) }; });
  const tx = row.querySelector('span').getBoundingClientRect(); return { ls, tw: tx.width }; })"""
VIN='WDB96340310777100'; VID='VIN:'+VIN
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'th.inhaber','display_name':'TH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='th.inhaber' if s['s']==200 else None
    if not own:
        for u in ['th.inhaber','ea.inhaber','nf.inhaber','tl.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']; site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'TH-UI 1','vin':VIN,'site':'Dortmund'})
    inv=api('POST','/api/users',{'username':'th.werkstatt','display_name':'TH Werkstatt','role':'workshop','environment':env,'workshop_site':site})
    w=br.new_page(); w.goto(B); wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    if inv['s']==201: wapi('POST','/api/invite/accept',{'token':inv['d']['invite_token'],'password':PW})
    check(wapi('POST','/api/login',{'username':'th.werkstatt','password':PW})['s']==200,'Anmeldung Werkstatt')
    n=[0]
    def cmd(cl,cid,action,payload=None,note=None):
        n[0]+=1; v=cl('GET',f'/api/cases/{cid}')['d']['case']['version']
        return cl('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'th-{n[0]}','expected_version':v,'note':note,'payload':payload or {}})['s']
    rc=api('POST','/api/cases',{'vehicle_id':VID,'description':'Spiegel links lose (Handschuh-Test)','priority':'niedrig','driveability':'fahrbereit','request_key':'th-case-1'})
    cid=rc['d']['id']
    check([cmd(api,cid,'approve_repair',{'workshop_site':site},'Test'),cmd(wapi,cid,'start_repair')]==[200,200],'Auftrag in Reparatur')
    for lang in ['de','uk','en']:
      wapi('PATCH','/api/me',{'language':lang})
      for W,H in [(390,844),(820,1180),(1024,768),(1280,800)]:
        ctx=br.new_context(viewport={'width':W,'height':H},has_touch=True); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'th.werkstatt','password':PW}])
        q.goto(B+f'/#/inspect/{cid}'); q.reload(); q.wait_for_selector('main .checkitem .seg label',timeout=15000)
        rows=q.evaluate(SEG)
        check(len(rows)>=10,f'{lang}/{W}: Prüfpunkte vorhanden ({len(rows)})')
        hs=[l['h'] for r in rows for l in r['ls']]; ws=[l['w'] for r in rows for l in r['ls']]
        check(min(hs)>=44,f'{lang}/{W}: Felder mind. 44 px hoch ({min(hs):.0f})')
        if W>=700:
            check(min(ws)>=88,f'{lang}/{W}: OK/Mangel/entfällt je mind. 88 px breit ({min(ws):.0f})')
            check(all(r['ls'][i]['bl']>=1 for r in rows for i in range(1,len(r['ls']))),f'{lang}/{W}: Trennlinie zwischen den Feldern')
        else:
            check(min(ws)>=52,f'{lang}/{W}: Handy unverändert kompakt (mind. 52 px)')
        check(min(r['tw'] for r in rows)>=60,f'{lang}/{W}: Prüfpunkt-Text lesbar breit ({min(r["tw"] for r in rows):.0f})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{W}: kein Querscrollen (Kontrolle)')
        # Tippen auf die Mitte von „OK“ wählt OK
        first=q.locator('main .checkitem').first
        first.locator('.seg label').first.tap()
        check(first.locator('input[value=ok]').is_checked() and not first.locator('input[value=mangel]').is_checked(),f'{lang}/{W}: Tippen auf OK wählt OK')
        if SHOTS: q.screenshot(path=f'{SHOTS}/th_kontrolle_{lang}_{W}.png')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector(f'main dd > a[href="#/vehicles/{VID}"]',timeout=15000)
        hl=q.evaluate(f"() => document.querySelector('main dd > a[href=\"#/vehicles/{VID}\"]').getBoundingClientRect().height")
        check(hl>=24,f'{lang}/{W}: Link Fahrzeugakte mind. 24 px ({hl:.0f})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{W}: kein Querscrollen (Vorgang)')
        check(not errs,f'{lang}/{W}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    wapi('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Tablet mit Handschuhen: alles grün')
raise SystemExit(1 if fails else 0)
