# [CLAUDE] UI-Test (20.11.2026, Backlog 1620, Blickwinkel „Werkstatt baut ein Garantieteil ein und reicht die Garantie beim Lieferanten ein“):
# Formular „Teil erfassen“ an einem neuen Auftrag desselben Fahrzeugs weist auf dasselbe Teil aus einem früheren Auftrag hin, das noch in
# Gewährleistung ist (Lagerartikel, Teilenummer anders geschrieben, Bezeichnung), nennt Lieferant/Beleg/Teilenummer; anderes Teil ohne Hinweis.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gt.inhaber','display_name':'TFA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['gt.inhaber','tfa.inhaber','ba.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'GT-GA 1620','vin':'WDB96340310716201','site':'Dortmund'})
    tag=str(os.getpid())
    st=api('POST','/api/stock',{'site':site,'name':f'Lichtmaschine {tag}','part_number':f'LM-{tag}','unit_price_net':'400','initial_qty':20})
    check(st['s']==201,f'Lagerartikel {st["s"]}'); SID=st['d']['id']
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'gt-{tag}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    def mk(vin,desc,k):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'gt-{tag}-{k}'})
        cid=r['d']['id']; check(cmd(cid,'approve_repair',{'workshop_site':site},'freigegeben')['s']==200 and cmd(cid,'start_repair')['s']==200,f'{desc}: in Reparatur'); return cid, r['d']['case_no']
    fut=__import__('datetime').date.fromordinal(__import__('datetime').date.today().toordinal()+300).isoformat()
    A,NA=mk('WDB96340310716201','Batterie lädt nicht','a')
    check(cmd(A,'add_part',{'stock_item_id':SID,'quantity':1,'warranty_until':fut})['s']==200,'Lagerteil mit Gewährleistung')
    check(cmd(A,'add_part',{'name':f'Anlasser {tag}','part_number':f'AN 24-{tag}','supplier':'Teilehandel Nord','document_ref':f'LS-{tag}','quantity':1,'unit_price_net':'300','warranty_until':fut})['s']==200,'freies Teil mit Gewährleistung')
    Bc,NB=mk('WDB96340310716201','Motor springt schlecht an','b')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        q.goto(B+'/#/cases/'+Bc); q.wait_for_selector('button[data-act="add_part"]', timeout=15000)
        q.locator('button[data-act="add_part"]').first.click(); q.wait_for_selector('#stocksi', timeout=10000)
        check(q.locator('[data-viwref]').count()>=2,f'{lang} {w}px: Kurzinfo nennt Teilenummer/Beleg')
        check(q.locator('#bkwarr').is_hidden(),f'{lang} {w}px: ohne Eingabe kein Hinweis')
        q.select_option('#stocksi', SID); q.wait_for_timeout(150)
        tx=q.inner_text('#bkwarr') if q.locator('#bkwarr').is_visible() else ''
        check(NA in tx and f'LM-{tag}' in tx,f'{lang} {w}px: Hinweis Lagerartikel ({tx[:70]!r})')
        q.select_option('#stocksi', ''); q.wait_for_timeout(100)
        check(q.locator('#bkwarr').is_hidden(),f'{lang} {w}px: ohne Lagerartikel wieder aus')
        q.fill('#af input[name=part_number]', f'an24-{tag}'); q.wait_for_timeout(100)
        tx=q.inner_text('#bkwarr') if q.locator('#bkwarr').is_visible() else ''
        check('Teilehandel Nord' in tx and f'LS-{tag}' in tx and NA in tx,f'{lang} {w}px: Teilenummer anders geschrieben → Lieferant/Beleg ({tx[:90]!r})')
        if SHOTS and lang=='de': q.locator('#af').screenshot(path=f'{SHOTS}/garantieteil_{w}.png')
        if SHOTS and w==390 and lang!='de': q.locator('#af').screenshot(path=f'{SHOTS}/garantieteil_{lang}.png')
        check(q.locator('#bkwarr a[href="#/cases/'+A+'"]').count()==1,f'{lang} {w}px: Link zum früheren Auftrag')
        q.fill('#af input[name=part_number]', ''); q.fill('#af input[name=name]', f'anlasser {tag}'); q.wait_for_timeout(100)
        check(q.locator('#bkwarr').is_visible(),f'{lang} {w}px: Hinweis gleiche Bezeichnung')
        q.fill('#af input[name=name]', 'Scheibenwischer'); q.wait_for_timeout(100)
        check(q.locator('#bkwarr').is_hidden(),f'{lang} {w}px: anderes Teil ohne Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
