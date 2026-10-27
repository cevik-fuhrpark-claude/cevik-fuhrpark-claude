# [CLAUDE] UI-Test (27.10.2026, Backlog 451, Blickwinkel „Mechaniker bucht Arbeitszeit auf den falschen Auftrag“): Formulare „Arbeitszeit
# erfassen“ und „Teil erfassen“ nennen oben Auftrag + Kennzeichen und dass Buchungen nicht änderbar sind; andere Formulare nicht.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async () => { const { STRINGS } = await import('/i18n.js'); return STRINGS[document.documentElement.lang] || STRINGS.de; }"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ba.inhaber','display_name':'BA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['ba.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310745101'; api('POST','/api/vehicles',{'plate':'TF-BA 451','vin':'WDB96340310745101','site':'Dortmund'})
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'ba-{os.getpid()}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':vid,'description':'Spiegel rechts abgebrochen','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'ba-{os.getpid()}'})
    CID=r['d']['id']; NO=r['d']['case_no']
    check(cmd(CID,'approve_repair',{'workshop_site':site},'Spiegel tauschen')['s']==200 and cmd(CID,'start_repair')['s']==200,'in Reparatur')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        q.goto(B+'/#/cases/'+CID); q.wait_for_selector('button[data-act="record_work"]', timeout=15000); T=q.evaluate(TR)
        for act in ['record_work','add_part']:
            q.locator(f'button[data-act="{act}"]').first.click(); q.wait_for_selector('#afcase', timeout=10000)
            tx=q.inner_text('#afcase')
            check(T['bk_for'] in tx and NO in tx and 'TF-BA 451' in tx and T['bk_check'] in tx,f'{lang} {w}px {act}: Auftrag/Kennzeichen/Hinweis ({tx[:50]!r})')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px {act}: ohne Querscrollen')
            if SHOTS and w==390: q.locator('#af').screenshot(path=f'{SHOTS}/buchung_{act}_{lang}.png')
            q.click('#ac'); q.wait_for_timeout(200)
        q.locator('button[data-act="add_open_item"]').first.click(); q.wait_for_selector('#af', timeout=10000)
        check(q.locator('#afcase').count()==0,f'{lang} {w}px: andere Formulare ohne Buchungszeile')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
