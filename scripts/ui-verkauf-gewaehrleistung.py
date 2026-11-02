# [CLAUDE] UI-Test Backlog 859 (Blickwinkel „Inhaber prüft vor dem Verkauf eines Lkw die laufenden Gewährleistungen“): Fahrzeug mit
# beendetem Auftrag und laufender Gewährleistung (Fremdleistung) wird in der Akte außer Betrieb genommen → Hinweis nennt die laufende
# Gewährleistung; danach wieder in Betrieb (für den nächsten Durchlauf). DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'laufende Gewährleistung','uk':'чинна гарантія','en':'warranty still running'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vg.inhaber','display_name':'VG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vg.inhaber','password':PW})['s']==200,'Anmeldung')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin='WDB96340310779859'; VID='VIN:'+vin; api('POST','/api/vehicles',{'plate':'VG-AB 859','vin':vin,'kind':'lkw','site':'Dortmund'})
    cid=api('POST','/api/cases',{'vehicle_id':VID,'description':'Lichtmaschine lädt nicht','priority':'mittel','driveability':'fahrbereit','request_key':f'vg-{pid}'})['d']['id']
    def cmd(action,payload={},note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'vg-{pid}-{action}','expected_version':v,'note':note,'payload':payload})
    until=(datetime.date.today()+datetime.timedelta(days=300)).isoformat()
    check(cmd('approve_repair',{'workshop_site':site},'prüfen')['s']==200,'Auftrag')
    check(cmd('add_external_cost',{'supplier':'Elektrik Nord','invoice_no':'R-859','amount_net':'310,00','warranty_until':until})['s']==200,'Fremdleistung mit Gewährleistung')
    check(cmd('withdraw_order',{},'Lichtmaschine getauscht')['s']==200,'Auftrag beendet')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Verkauft'))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vg.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#deact',state='attached',timeout=15000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#deact')) d.open = true; }")
        q.click('#deact'); q.wait_for_selector('.toast',timeout=15000)
        tx=q.inner_text('.toast')
        check(HINT[lang] in tx,f'{lang} {w}px: Hinweis auf laufende Gewährleistung ({tx[:80]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vg_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('POST',f'/api/vehicles/{VID}/active',{'active':True})['s']==200,f'{lang} {w}px: wieder in Betrieb')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
