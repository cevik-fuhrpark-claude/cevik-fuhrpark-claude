# [CLAUDE] UI-Test Backlog 856/857 (Blickwinkel „Werkstatt-Nacharbeit“): früherer Auftrag mit Fremdleistung wird beendet, danach erneute Meldung →
# „Zum Fahrzeug“ nennt Werkstatt und Fremdfirma ([data-viby]); im Formular „Fremdleistung“ erscheint beim Tippen derselben Firma (Groß-/Kleinschreibung egal)
# der Hinweis auf Nacharbeit/Gewährleistung mit Link ([#xsprev]). DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXT={'de':'Fremdleistung','uk':'Стороння послуга','en':'External service'}
HINT={'de':'Nacharbeit','uk':'доопрацювання','en':'rework'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'na.inhaber','display_name':'NA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'na.inhaber','password':PW})['s']==200,'Anmeldung')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin='WDB96340310779856'; VID='VIN:'+vin; api('POST','/api/vehicles',{'plate':'NA-AB 856','vin':vin,'kind':'lkw','site':'Dortmund'})
    def mk(desc,k): return api('POST','/api/cases',{'vehicle_id':VID,'description':desc,'priority':'mittel','driveability':'fahrbereit','request_key':f'na-{pid}-{k}'})['d']['id']
    def cmd(cid,action,payload={},note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'na-{pid}-{cid}-{action}','expected_version':v,'note':note,'payload':payload})
    c1=mk('Bremse zieht schief','a')
    check(cmd(c1,'approve_repair',{'workshop_site':site},'prüfen')['s']==200,'Auftrag 1')
    check(cmd(c1,'add_external_cost',{'supplier':'Bremsen Müller GmbH','invoice_no':'R-856','amount_net':'250,00'})['s']==200,'Fremdleistung gebucht')
    check(cmd(c1,'withdraw_order',{},'Bremse eingestellt, Probefahrt ok')['s']==200,'Auftrag 1 beendet')
    c2=mk('Bremse zieht wieder schief','b')
    check(cmd(c2,'approve_repair',{'workshop_site':site},'Nacharbeit prüfen')['s']==200,'Auftrag 2')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'na.inhaber','password':PW}])
        q.goto(B+'/#/cases/'+c2); q.wait_for_selector('[data-viby]',state='attached',timeout=15000)
        tx=q.inner_text('[data-viby]') if q.locator('[data-viby]').first.is_visible() else q.text_content('[data-viby]')
        check(EXT[lang] in tx and 'Bremsen Müller GmbH' in tx,f'{lang} {w}px: 856 Fremdfirma beim früheren Auftrag ({tx[:60]})')
        if SHOTS: q.locator('.vinfo').screenshot(path=f'{SHOTS}/na_vinfo_{lang}_{w}.png')
        q.click('[data-act=add_external_cost]'); q.wait_for_selector('#af [name=supplier]',timeout=15000)
        check(q.locator('#xsprev').is_hidden(),f'{lang} {w}px: Hinweis anfangs verborgen')
        q.fill('#af [name=supplier]','bremsen müller gmbh')
        q.wait_for_selector('#xsprev:not([hidden])',timeout=5000)
        ht=q.inner_text('#xsprev')
        check(HINT[lang] in ht and q.locator('#xsprev a').count()==1,f'{lang} {w}px: 857 Hinweis mit Link')
        q.fill('#af [name=supplier]','Andere Firma'); q.wait_for_timeout(200)
        check(q.locator('#xsprev').is_hidden(),f'{lang} {w}px: andere Firma → kein Hinweis')
        q.fill('#af [name=supplier]','Bremsen Müller GmbH')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#af').screenshot(path=f'{SHOTS}/na_form_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
