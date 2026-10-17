# [CLAUDE] UI-Test (17.10.2026): Konflikt ohne Eingabeverlust – Kommentar im Vorgang bleibt nach „zwischenzeitlich geändert“ (409) im Textfeld;
# Fahrerakte-Formular auf altem Stand macht eine Deaktivierung nicht rückgängig (Meldung in der Oberflächensprache) und sendet nur geänderte
# Felder. DE/UK/EN, 390/820/1366 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CSVJS = """async (t) => { const r = await fetch('/api/vehicles/import', { method: 'POST', headers: { 'content-type': 'text/csv', 'x-cfp': '1' }, body: t }); return r.status; }"""
# DE: Servertext; UK/EN: einheitliche Konfliktmeldung (err_version_conflict)
MSG={'de':'Fahrerakte wurde zwischenzeitlich geändert','uk':'Тим часом змінено кимось іншим','en':'Changed by someone else in the meantime'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kf.inhaber','display_name':'KF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(a.evaluate(CSVJS,'Kennzeichen;Standort;FIN\nSZ-KF 1;Dortmund;WDB9630051L907801\n')==200,'Fahrzeug importiert')
    veh=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['plate']=='SZ-KF 1'][0]['id']
    n=0
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,w)
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kf.inhaber','password':PW}])
        qa=lambda m,pa,b=None: q.evaluate(JS,[m,pa,b])
        # 1. Kommentar: während des Tippens ändert jemand den Vorgang → 409, Text bleibt im Feld
        cid=qa('POST','/api/cases',{'vehicle_id':veh,'description':f'Spiegel lose {lang} {w}','priority':'niedrig','driveability':'fahrbereit','request_key':f'kf-{os.getpid()}-{n}'})['d']['id']
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#ct',timeout=15000)
        q.fill('#ct','Bitte Foto vom Spiegel nachreichen')
        v=qa('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(qa('POST',f'/api/cases/{cid}/commands',{'action':'change_priority','command_id':f'x-{os.getpid()}-{n}','expected_version':v,'payload':{'priority':'mittel'},'note':'Verkehrssicherheit'})['s']==200,'zwischenzeitlich geändert')
        q.click('#cf button.btn'); q.wait_for_timeout(1500)
        check(q.input_value('#ct')=='Bitte Foto vom Spiegel nachreichen','Kommentartext bleibt nach Konflikt')
        q.click('#cf button.btn'); q.wait_for_timeout(1500)
        ev=[e for e in qa('GET',f'/api/cases/{cid}')['d']['events'] if e['action']=='comment']
        check(len(ev)==1,'zweiter Versuch gespeichert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/konflikt_kommentar_{lang}_{w}.png')
        # 2. Fahrerakte: im anderen Tab deaktiviert, altes Formular speichert Standort → Meldung, bleibt inaktiv
        did=qa('POST','/api/drivers',{'display_name':f'Fahrer KF {lang} {w}'})['d']['id']
        q.goto(B+f'/#/drivers/{did}'); q.wait_for_selector('#edf',state='attached',timeout=15000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#edf')) d.open = true; }")
        check(qa('PATCH',f'/api/drivers/{did}',{'active':False})['s']==200,'anderer Tab deaktiviert')
        sent=[]; q.on('request',lambda r: sent.append(r.post_data) if r.method=='PATCH' and '/api/drivers/' in r.url else None)
        q.fill('#edf [name=site]','Bochum'); q.click('#edf button.btn'); q.wait_for_timeout(1500)
        check(any(MSG[lang] in t for t in q.locator('.toast').all_inner_texts()),'Konfliktmeldung: '+MSG[lang])
        check(sent and '"active"' not in sent[0] and '"site":"Bochum"' in sent[0],'nur geänderte Felder gesendet: '+str(sent[:1]))
        dd=qa('GET',f'/api/drivers/{did}')['d']['driver']
        check(dd['active']==0 and (dd['site'] or '')!='Bochum','Deaktivierung bleibt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/konflikt_fahrerakte_{lang}_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('Konflikt/Eingaben: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
