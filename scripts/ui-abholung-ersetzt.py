# [CLAUDE] UI-Test (02.11.2026, Backlog 879, Blickwinkel „Fahrer holt den Lkw nach Feierabend in der Werkstatt ab“):
# Am Fahrzeug steht noch der Abholhinweis für Fahrer einer früheren Freigabe → das Formular „Technisch freigeben“ des nächsten Vorgangs
# kündigt das Archivieren an (#pu_repl mit Datum), nach der Freigabe nennt der Verlauf es ([data-pureplev]) und der Fahrer sieht nur noch
# den neuen Ablageort. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EV={'de':'Abholhinweis für Fahrer archiviert','uk':'примітка про отримання для водіїв архівована','en':'pick-up note for drivers archived'}
HINT={'de':'wird mit dieser Freigabe archiviert','uk':'буде архівована','en':'will be archived with this release'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ae.inhaber','display_name':'AE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ae.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    u=api('POST','/api/users',{'username':f'ae.ws{R}','display_name':'AE Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    wctx=br.new_context(); q=wctx.new_page(); q.goto(B)
    q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); check(q.evaluate(JS,['POST','/api/login',{'username':f'ae.ws{R}','password':PW}])['s']==200,'Werkstatt angemeldet')
    def cmd(page,cid,action,payload=None,note=None):
        global n; n+=1
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'ae-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    vin=f'WDB98{R:05d}E000100'; pl=f'AE-E {R%900}1'
    check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
    def to_qc(k,pick):
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':f'Spiegel locker {k} (Test Abholung ersetzt)','priority':'mittel','driveability':'fahrbereit','request_key':f'ae-{R}-{k}'})
        cid=c['d']['id']
        ok=cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200 and cmd(q,cid,'start_repair')==200 and cmd(q,cid,'record_work',{'hours':1,'description':'Spiegel'})==200
        ok=ok and q.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'ae-i-{R}-{k}','items':items}])['s']==201
        ok=ok and cmd(q,cid,'request_quality_check',{'pickup_note':pick},'fertig')==200
        check(ok,f'Vorgang {k} bis Abschlusskontrolle'); return cid
    c0=to_qc('0','Schlüssel im Kasten am Tor, Fach 1')
    check(cmd(a,c0,'technical_release',{'confirm':True,'pickup_for_driver':True},'Kontrolle ok')==200,'erste Freigabe mit Fahrerhinweis')
    k=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        k+=1; pick=f'Schlüssel im Kasten am Tor, Fach {k+1}'
        cid=to_qc(str(k),pick)
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('button[data-act="technical_release"]',timeout=15000)
        m.click('button[data-act="technical_release"]'); m.wait_for_selector('#pu_note',timeout=5000)
        check(m.locator('#pu_repl').count()==1 and HINT[lang] in m.inner_text('#pu_repl'),f'{lang} {w}px: Formular kündigt Archivieren an')
        m.check('#pu_drv'); m.check('#af input[name=confirm]'); m.fill('#af textarea[name=note]','Kontrolle in Ordnung')
        check(m.evaluate(noscroll),f'{lang} {w}px: Freigabe-Formular ohne Querscrollen')
        if SHOTS: m.locator('#pu_repl').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/abholung_ersetzt_{lang}_{w}.png')
        m.click('#af button.btn:not(.secondary)'); m.wait_for_selector('[data-pureplev]',timeout=15000)
        check(EV[lang] in m.inner_text('[data-pureplev]'),f'{lang} {w}px: Verlauf nennt archivierten Abholhinweis')
        check(m.evaluate(noscroll),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: m.locator('[data-pureplev]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/abholung_ersetzt_verlauf_{lang}_{w}.png')
        notes=[x for x in m.evaluate(JS,['GET','/api/vehicles/VIN%3A'+vin+'/notes',None])['d']['notes'] if x['for_driver']]
        check(len(notes)==1 and pick in notes[0]['text'],f'{lang} {w}px: genau ein aktiver Abholhinweis (neuer Ablageort)')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
