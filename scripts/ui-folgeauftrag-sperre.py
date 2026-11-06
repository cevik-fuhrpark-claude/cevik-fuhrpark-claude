# [CLAUDE] UI-Test (06.11.2026, Backlog 1057): Restarbeit eines gesperrten Auftrags „Als Folgeauftrag“ – das Formular weist darauf hin, dass
# die Sperre des Ursprungs bestehen bleibt (data-oilock, DE/UK/EN); ohne Sperre kein Hinweis. 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh) bzw. CFP_URL. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WORD={'de':'Sperre aufheben','uk':'Зняти блокування','en':'Lift lock'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fs.inhaber','display_name':'FS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    pid=os.getpid(); n=0
    for lang,wd,h in [('de',390,844),('uk',820,1180),('en',1366,900)]:
      for locked in [True, False]:
        n+=1; print('—',lang,wd,'gesperrt' if locked else 'ohne Sperre')
        va=f'WDB9634032S{pid%10000:04d}{n:02d}'[:17].ljust(17,'0')
        check(api('POST','/api/vehicles',{'vin':va,'plate':f'FS-AB {n}7','site':'Dortmund'})['s']==201,'Fahrzeug')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+va,'description':'Spiegel rechts ab, Bremse quietscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})['d']['id']
        cmd=lambda action,pl={},note=None: api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':str(uuid.uuid4()),'expected_version':api('GET',f'/api/cases/{cid}')['d']['case']['version'],'payload':pl,**({'note':note} if note else {})})
        check(cmd('approve_repair',{'workshop_site':ws},'frei')['s']==200,'Freigabe')
        if locked: check(cmd('set_safety_lock',{},'Bremse')['s']==200,'Sperre')
        check(cmd('add_open_item',{'description':'Bremse vorne links quietscht (Test)','safety_relevant':True})['s']==200,'Restarbeit')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fs.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-oifu]',timeout=15000)
        q.click('[data-oifu]'); q.wait_for_selector('#oiff',timeout=5000)
        if locked:
            check(q.locator('#oiff [data-oilock]').count()==1 and WORD[lang] in q.inner_text('#oiff [data-oilock]'),f'{lang} {wd}px: Hinweis „Sperre bleibt“ nennt den Knopf')
        else:
            check(q.locator('#oiff [data-oilock]').count()==0,f'{lang} {wd}px: ohne Sperre kein Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS and locked: q.locator('#oiff').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/folgeauftrag-sperre-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
