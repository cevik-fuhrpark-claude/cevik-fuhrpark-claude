# [CLAUDE] UI-Test (19.11.2026, Backlog 1617–1619, Blickwinkel „Werkstatt bucht ein Teil auf den falschen Auftrag“): Formular „Teil erfassen“ am
# zweiten Auftrag weist auf dasselbe heute schon auf Auftrag 1 gebuchte Teil hin (Lagerartikel bzw. Bezeichnung), sonst nicht; Teileliste nennt das
# Lager; Bestätigung nach dem Buchen nennt Auftrag + Kennzeichen. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787).
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tfa.inhaber','display_name':'TFA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['tfa.inhaber','ba.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'TF-FA 1617','vin':'WDB96340310716171','site':'Dortmund'})
    api('POST','/api/vehicles',{'plate':'TF-FA 1618','vin':'WDB96340310716182','site':'Dortmund'})
    tag=str(os.getpid())
    st=api('POST','/api/stock',{'site':site,'name':f'Bremsbelag {tag}','part_number':f'BB-{tag}','unit_price_net':'50','initial_qty':20})
    check(st['s']==201,f'Lagerartikel {st["s"]}'); SID=st['d']['id']
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'tfa-{tag}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    def mk(vin,desc,k):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'tfa-{tag}-{k}'})
        cid=r['d']['id']; check(cmd(cid,'approve_repair',{'workshop_site':site},'freigegeben')['s']==200 and cmd(cid,'start_repair')['s']==200,f'{desc}: in Reparatur'); return cid, r['d']['case_no']
    A,NA=mk('WDB96340310716171','Bremse vorne quietscht','a'); Bc,NB=mk('WDB96340310716182','Bremse hinten schleift','b')
    check(cmd(A,'add_part',{'stock_item_id':SID,'quantity':1})['s']==200,'Lagerteil auf Auftrag 1')
    check(cmd(A,'add_part',{'name':f'Glühlampe H7 {tag}','quantity':2})['s']==200,'freies Teil auf Auftrag 1')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        # 1618: Teileliste von Auftrag 1 nennt das Lager
        q.goto(B+'/#/cases/'+A); q.wait_for_selector('[data-pstk]', timeout=15000)
        check(q.locator('[data-pstk]').count()==1,f'{lang} {w}px: Lager nur beim Lagerteil')
        q.goto(B+'/#/cases/'+Bc); q.wait_for_selector('button[data-act="add_part"]', timeout=15000); T=q.evaluate(TR)
        q.locator('button[data-act="add_part"]').first.click(); q.wait_for_selector('#stocksi', timeout=10000)
        check(q.locator('#bksame').is_hidden(),f'{lang} {w}px: ohne Auswahl kein Hinweis')
        q.select_option('#stocksi', SID); q.wait_for_timeout(150)
        tx=q.inner_text('#bksame') if q.locator('#bksame').is_visible() else ''
        check(NA in tx and 'TF-FA 1617' in tx,f'{lang} {w}px: Hinweis Lagerartikel ({tx[:70]!r})')
        if SHOTS and lang=='de': q.locator('#af').screenshot(path=f'{SHOTS}/teil_falsch_{w}.png')
        if SHOTS and w==390 and lang!='de': q.locator('#af').screenshot(path=f'{SHOTS}/teil_falsch_{lang}.png')
        q.select_option('#stocksi', ''); q.wait_for_timeout(100)
        check(q.locator('#bksame').is_hidden(),f'{lang} {w}px: ohne Lagerartikel wieder aus')
        q.fill('#af input[name=name]', f'glühlampe h7 {tag} '); q.wait_for_timeout(100)
        check(q.locator('#bksame').is_visible(),f'{lang} {w}px: Hinweis gleiche Bezeichnung')
        q.fill('#af input[name=name]', 'Scheibenwischer'); q.wait_for_timeout(100)
        check(q.locator('#bksame').is_hidden(),f'{lang} {w}px: andere Bezeichnung ohne Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if lang=='de' and w==1366:
            # 1617: nach dem Buchen nennt die Bestätigung Auftrag + Kennzeichen
            q.fill('#af input[name=name]', 'Scheibenwischer'); q.locator('#af button.btn').first.click()
            q.wait_for_function("()=>[...document.querySelectorAll('.toast,#toast,[role=status]')].some(x=>x.textContent.includes('TF-FA 1618'))", timeout=10000)
            tt=q.evaluate("()=>[...document.querySelectorAll('.toast,#toast,[role=status]')].map(x=>x.textContent).join(' | ')")
            check(T['bk_done'].split('{no}')[0].strip() in tt and NB in tt,f'Bestätigung nennt Auftrag ({tt[:80]!r})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
