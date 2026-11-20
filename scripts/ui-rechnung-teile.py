# [CLAUDE] UI-Test (20.11.2026, Backlog 1622–1624, Blickwinkel „Leitung prüft eine Werkstattrechnung gegen die gebuchten Teile“):
# Teileliste nennt beim freien Teil Lieferant und Beleg; „Teil erfassen“ hat ein Feld „Beleg / Lieferschein“; „Fremdleistung“ weist auf Teile hin,
# die unter derselben Rechnungsnummer (andere Schreibweise) schon einzeln erfasst sind (Summe, Liste) – entfällt bei „Ersetzt eigene Stunden/Teile“;
# umgekehrt weist „Teil erfassen“ auf eine Fremdleistung mit diesem Beleg hin. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (CFP_URL, Standard Port 8787).
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rt.inhaber','display_name':'RT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['rt.inhaber','gt.inhaber','tfa.inhaber','ba.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'RT-RE 1624','vin':'WDB96340310716241','site':'Dortmund'})
    tag=str(os.getpid())
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'rt-{tag}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310716241','description':'Bremsen vorne schleifen','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'rt-{tag}-a'})
    A=r['d']['id']; check(cmd(A,'approve_repair',{'workshop_site':site},'freigegeben')['s']==200 and cmd(A,'start_repair')['s']==200,'in Reparatur')
    DOC=f'RE 2026/{tag}'
    check(cmd(A,'add_part',{'name':'Bremsscheibe vorne','quantity':2,'unit_price_net':'120','supplier':'Teilehandel Nord','document_ref':DOC})['s']==200,'Teil 1 mit Beleg')
    check(cmd(A,'add_part',{'name':'Bremsbeläge vorne','quantity':1,'document_ref':f'Nr. RE-2026-{tag}'})['s']==200,'Teil 2 mit Beleg (unbewertet)')
    # zweiter Auftrag: Fremdleistung schon gebucht → Gegenhinweis beim Teil
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310716241','description':'Kupplung rutscht durch','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'rt-{tag}-b'})
    Bc=r['d']['id']; check(cmd(Bc,'approve_repair',{'workshop_site':site},'freigegeben')['s']==200 and cmd(Bc,'start_repair')['s']==200,'Auftrag 2 in Reparatur')
    check(cmd(Bc,'add_external_cost',{'supplier':'Kupplungsdienst West','invoice_no':f'KD-{tag}','amount_net':'890'})['s']==200,'Fremdleistung Auftrag 2')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        q.goto(B+'/#/cases/'+A); q.wait_for_selector('button[data-act="add_external_cost"]', timeout=15000)
        pd=q.locator('[data-pdoc]').all_inner_texts()
        check(len(pd)==2 and any('Teilehandel Nord' in x and DOC in x for x in pd),f'{lang} {w}px: Teileliste nennt Lieferant/Beleg ({pd[:1]!r})')
        q.locator('button[data-act="add_external_cost"]').first.click(); q.wait_for_selector('#af input[name=invoice_no]', timeout=10000)
        check(q.locator('#xinvparts').is_hidden(),f'{lang} {w}px: ohne Rechnungsnummer kein Hinweis')
        q.fill('#af input[name=invoice_no]', f're2026.{tag}'); q.wait_for_timeout(120)
        tx=q.inner_text('#xinvparts') if q.locator('#xinvparts').is_visible() else ''
        check(q.locator('#xinvparts [data-xinvlist] li').count()==2 and '240' in tx and 'Bremsscheibe vorne' in tx,f'{lang} {w}px: Hinweis mit 2 Teilen und Summe ({tx[:80]!r})')
        if SHOTS and lang=='de': q.locator('#af').screenshot(path=f'{SHOTS}/rechnung_teile_{w}.png')
        if SHOTS and w==390 and lang!='de': q.locator('#af').screenshot(path=f'{SHOTS}/rechnung_teile_{lang}.png')
        q.check('#af input[name=covers_work_and_parts]'); q.wait_for_timeout(100)
        check(q.locator('#xinvparts').is_hidden(),f'{lang} {w}px: „Ersetzt eigene Teile“ → kein Hinweis')
        q.uncheck('#af input[name=covers_work_and_parts]'); q.fill('#af input[name=invoice_no]', 'ANDERE-99'); q.wait_for_timeout(100)
        check(q.locator('#xinvparts').is_hidden(),f'{lang} {w}px: andere Rechnung ohne Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen (Fremdleistung)')
        q.goto(B+'/#/cases/'+Bc); q.wait_for_selector('button[data-act="add_part"]', timeout=15000)
        q.locator('button[data-act="add_part"]').first.click(); q.wait_for_selector('#pdocref', timeout=10000)
        check(q.locator('#pdocext').is_hidden(),f'{lang} {w}px: Teil ohne Beleg kein Hinweis')
        q.fill('#pdocref', f'kd {tag}'); q.wait_for_timeout(120)
        tx=q.inner_text('#pdocext') if q.locator('#pdocext').is_visible() else ''
        check('Kupplungsdienst West' in tx and '890' in tx,f'{lang} {w}px: Teil-Beleg = Fremdleistung → Hinweis ({tx[:80]!r})')
        if SHOTS and lang=='de' and w==390: q.locator('#af').screenshot(path=f'{SHOTS}/rechnung_teile_teil_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen (Teil)')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
