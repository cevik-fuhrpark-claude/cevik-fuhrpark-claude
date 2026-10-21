# [CLAUDE] UI-Test (21.10.2026): Berechtigungsfehler mit Grund statt nur „Keine Berechtigung“ – Werkstatt hat die Kontrolle nach Reparatur
# offen, ein zweites Tablet (gleiches Konto) setzt den Auftrag inzwischen auf „Wartet auf Teile“; Absenden zeigt die Begründung samt
# aktuellem Status in der Oberflächensprache (vorher UK/EN „No permission.“, DE mit Status-Code). DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':('Kontrolle nach Reparatur ist nur im Status „In Reparatur“','„Wartet auf Teile“'),
     'uk':('Перевірка після ремонту можлива лише у статусі «У ремонті»',None),
     'en':('Post-repair check is only possible in status “In repair”',None)}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bg.inhaber','display_name':'BG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    meta=api('GET','/api/meta')['d']; site=meta['workshops'][0]['code']
    vid='VIN:WDB96340310775021'; api('POST','/api/vehicles',{'plate':'BG-AB 1','vin':'WDB96340310775021','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'bg.ws','display_name':'BG Werkstatt','role':'workshop','environment':'production','workshop_site':site})
    if u['s']==201 or u['s']==200:
        c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    # zweites Tablet (gleiches Werkstatt-Konto)
    c2=br.new_context(); t2=c2.new_page(); t2.goto(B); check(t2.evaluate(JS,['POST','/api/login',{'username':'bg.ws','password':PW}])['s']==200,'Anmeldung Tablet 2')
    wsapi=lambda m,pa,b=None: t2.evaluate(JS,[m,pa,b])
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,w)
        cid=api('POST','/api/cases',{'vehicle_id':vid,'description':f'BG Bremse {lang} {w}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'bg-{os.getpid()}-{n}'})['d']['id']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'ap-{os.getpid()}-{n}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
        v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(wsapi('POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'st-{os.getpid()}-{n}','expected_version':v})['s']==200,'in Reparatur')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bg.ws','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/inspect/{cid}'); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.evaluate("()=>document.querySelectorAll('#f input[type=radio][value=ok]').forEach((r)=>{ r.checked=true; r.dispatchEvent(new Event('change')); })")
        # inzwischen: Tablet 2 setzt „Wartet auf Teile“
        v=wsapi('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(wsapi('POST',f'/api/cases/{cid}/commands',{'action':'wait_parts','command_id':f'wp-{os.getpid()}-{n}','expected_version':v,'note':'Bremssattel bestellt'})['s']==200,'Tablet 2: wartet auf Teile')
        q.click('#f button.btn'); q.wait_for_selector('.toast.err',timeout=8000)
        msg=q.inner_text('.toast.err')
        e1,e2=EXP[lang]
        check(e1 in msg,f'Begründung in der Sprache: {msg}')
        if e2: check(e2 in msg,'aktueller Status als Bezeichnung')
        check('wartet_teile' not in msg and 'No permission' not in msg and 'Немає дозволу' not in msg,'kein Code, nicht nur „Keine Berechtigung“')
        if SHOTS: q.screenshot(path=f'{SHOTS}/berechtigung_{lang}_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
    c2.close(); br.close()
print('Berechtigungsgrund: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
