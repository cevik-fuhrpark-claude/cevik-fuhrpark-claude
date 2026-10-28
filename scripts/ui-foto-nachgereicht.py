# [CLAUDE] UI-Test (28.10.2026, Backlog 462, Blickwinkel „Leitung bittet den Fahrer, ein Foto nachzureichen – erfährt sie, dass es da ist?“):
# Disposition meldet, Inhaber bestätigt den Eingang, die Melderin reicht ein Foto nach. Die Fuhrparkleitung (DE/UK/EN) sieht im Verlauf
# „Foto/Datei nachgereicht“ mit Dateinamen und unter „Hinweise“ den Hinweis „Foto/Datei zur Meldung nachgereicht“; das Foto beim Melden
# erscheint nicht im Verlauf. 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, name]) => { const b = new Uint8Array(400); crypto.getRandomValues(b); b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'image/png', 'x-cfp': '1', 'x-filename': name }, body: b }); return r.status; }"""
ACT={'de':'Foto/Datei nachgereicht','uk':'Фото/файл додано пізніше','en':'Photo/file added later'}
NOTE={'de':'Foto/Datei zur Meldung nachgereicht','uk':'До повідомлення додано фото/файл','en':'Photo/file added to the report'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fn.inhaber','display_name':'FN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    def mkuser(un,role,lang='de',**kw):
        u=api('POST','/api/users',{'username':un,'display_name':un.upper(),'role':role,'environment':'production','language':lang,**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    mkuser('fn.dispo','dispatch')
    users=[]
    for lang in ['de','uk','en']: mkuser('fn.leitung.'+lang,'fleet',lang); users.append((lang,'fn.leitung.'+lang))
    dc=br.new_context(); d=dc.new_page(); d.goto(B); d.evaluate(JS,['POST','/api/login',{'username':'fn.dispo','password':PW}])
    dapi=lambda m,pa,b=None: d.evaluate(JS,[m,pa,b])
    api('POST','/api/vehicles',{'vin':'WDB9634031L400090','plate':'FN-AB 1','site':'Dortmund'})
    c=dapi('POST','/api/cases',{'vehicle_id':'VIN:WDB9634031L400090','description':'Spiegel rechts abgefahren','priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
    check(c['s']==201,'Meldung der Disposition'); cid=c['d']['id']
    check(d.evaluate(UP,[f'/api/cases/{cid}/files','beim-melden.png'])==201,'Foto beim Melden')
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'receive','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{}})['s']==200,'Eingang bestätigt')
    check(d.evaluate(UP,[f'/api/cases/{cid}/files','spiegel-nah.png'])==201,'Foto nachgereicht')
    for lang,un in users:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('ol.timeline',timeout=15000); q.wait_for_timeout(300)
        hist=q.inner_text('ol.timeline')
        check(ACT[lang] in hist,f'{lang} {wd}px: Verlauf „{ACT[lang]}“')
        ev=q.locator('[data-fileev]')
        check(ev.count()==1 and 'spiegel-nah.png' in ev.first.inner_text(),f'{lang} {wd}px: genau ein Eintrag mit Dateiname ({ev.count()})')
        check('beim-melden.png' not in hist,f'{lang} {wd}px: Foto beim Melden nicht im Verlauf')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fotonach_case_{lang}_{wd}.png',full_page=True)
        n=q.evaluate(JS,['GET','/api/notifications'])['d']['notifications']
        check(any(x['kind']=='file_added' and x['case_id']==cid for x in n),f'{lang} {wd}px: Hinweis vorhanden')
        q.goto(B+'/#/inbox'); q.wait_for_timeout(800)
        check(NOTE[lang] in q.inner_text('body'),f'{lang} {wd}px: Hinweis in der Liste in Kontosprache')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Hinweise ohne Querscrollen')
        if SHOTS and wd==390: q.screenshot(path=f'{SHOTS}/fotonach_inbox_{lang}_{wd}.png',full_page=True)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
