# [CLAUDE] UI-Test (21.10.2026): Vorgang – „Ablehnen“ bei aktiver Sicherheitssperre bzw. „Sperre aufheben“ mit offener sicherheitsrelevanter
# Restarbeit zeigt vor dem Absenden den Hinweis des Servers (#rejlock/#relsafety) in der Oberflächensprache. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':('Zuerst Sperre','sicherheitsrelevante Restarbeiten'),'uk':('зніміть блокування','важливі для безпеки'),'en':('Lift the lock first','safety-relevant remaining')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sh.inhaber','display_name':'SH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sh.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    vid='VIN:WDB96340310776001'; api('POST','/api/vehicles',{'plate':'SH-AB 1','vin':'WDB96340310776001','site':'Dortmund'})
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        r=api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'{action}-{cid}-{v}','expected_version':v,'payload':payload or {},**({'note':note} if note else {})})
        check(r['s']==200,f'{action} {r["s"]} {str(r["d"])[:120] if r["s"]!=200 else ""}')
    n=0
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,w)
        c1=api('POST','/api/cases',{'vehicle_id':vid,'description':f'SH Bremse {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'sh1-{os.getpid()}-{n}'})['d']['id']
        cmd(c1,'set_safety_lock',note='Bremse prüfen')
        c2=api('POST','/api/cases',{'vehicle_id':vid,'description':f'SH Licht {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'sh2-{os.getpid()}-{n}'})['d']['id']
        cmd(c2,'approve_repair',{'workshop_site':site},'frei'); cmd(c2,'start_repair')
        cmd(c2,'add_open_item',{'description':'Halter lose','safety_relevant':True}); cmd(c2,'set_safety_lock',note='Halter')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sh.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{c1}'); q.wait_for_selector('[data-act=reject]',timeout=15000); q.click('[data-act=reject]'); q.wait_for_selector('#rejlock')
        check(EXP[lang][0] in q.inner_text('#rejlock'),'Ablehnen: Hinweis Sperre ('+q.inner_text('#rejlock')[:60]+')')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sperrhinweis_ablehnen_{lang}_{w}.png')
        q.goto(B+f'/#/cases/{c2}'); q.wait_for_selector('[data-act=lift_safety_lock]',timeout=15000); q.click('[data-act=lift_safety_lock]'); q.wait_for_selector('#relsafety')
        check(EXP[lang][1] in q.inner_text('#relsafety'),'Sperre aufheben: Hinweis Restarbeit')
        q.goto(B+f'/#/cases/{c2}'); q.wait_for_selector('[data-act=reject], [data-act=comment], #cf',timeout=15000)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
    br.close()
print('Sperrhinweis: '+('alles grün' if not fails else f'{len(fails)} Fehler'))
raise SystemExit(1 if fails else 0)
