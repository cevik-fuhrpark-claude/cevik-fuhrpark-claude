# [CLAUDE] UI-Test (22.10.2026, Teilagent „Werkstatt-Tablet im Schichtwechsel“): Arbeitszeit-Formular offen, inzwischen gibt die Leitung
# das Fahrzeug frei → nach dem Speichern bleibt ein Hinweis „Nicht gespeichert … inzwischen <Status>“ mit Stunden/Tätigkeit stehen
# (vorher verschwand das Formular samt Eingaben); Konflikt bei weiter erlaubter Aktion: Meldung „Eingaben stehen noch im Formular“, Formular bleibt.
# Danach: Sitzung serverseitig beendet (401) → Offline-Daten der Person (cfp_veh_/cfp_emerg_) entfernt. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310777071'; VID='VIN:'+VIN
LOST={'de':'Nicht gespeichert','uk':'Не збережено','en':'Not saved'}
KEPT={'de':'Eingaben stehen noch im Formular','uk':'дані залишилися у формі','en':'entries are still in the form'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sw.inhaber','display_name':'SW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'SW-UI 1','vin':VIN,'site':'Dortmund'})
    meta=api('GET','/api/meta')['d']; ws=meta['workshops'][0]['code']; items=[{'key':c['key'],'result':'ok'} for c in meta['checklist']]
    env=api('GET','/api/me')['d']['active_environment']
    u=api('POST','/api/users',{'username':'sw.werkstatt','display_name':'SW Werkstatt','role':'workshop','environment':env,'workshop_site':ws})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'sw-{n[0]}','expected_version':v,'note':note,'payload':payload or {}})['s']
    def new(desc):
        cid=api('POST','/api/cases',{'vehicle_id':VID,'description':desc,'priority':'niedrig','driveability':'fahrbereit','request_key':'sw-'+desc[-20:]})['d']['id']
        return cid,[cmd(cid,'approve_repair',{'workshop_site':ws},'Test'),cmd(cid,'start_repair')]
    def release(cid):
        cmd(cid,'record_work',{'hours':1,'description':'Vorarbeit Kollege'})
        n[0]+=1; st=[api('POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'sw-i{n[0]}','items':items})['s']]
        return st+[cmd(cid,'request_quality_check',{},'Repariert'),cmd(cid,'technical_release',{'confirm':True},'Kontrolle ok')]
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sw.werkstatt','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        cid,st=new(f'Schichtwechsel Licht {lang} {w}'); check(st==[200,200],f'{lang} {w}: in Reparatur {st}')
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('button[data-act=record_work]',timeout=15000)
        # 1. weiter erlaubte Aktion, Kommentar der Leitung dazwischen → Formular bleibt, Meldung „Eingaben stehen noch im Formular“
        q.click('button[data-act=record_work]'); q.fill('#af [name=hours]','2,5'); q.fill('#af [name=description]','Rückleuchte getauscht')
        check(cmd(cid,'comment',{},'Leitung schaut kurz rein')==200,'Kommentar der Leitung')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_timeout(1500)
        tt=' '.join(q.locator('.toast').all_inner_texts())
        check(KEPT[lang] in tt,f'{lang} {w}: Konfliktmeldung „{tt[:70]}“')
        check(q.locator('#af [name=hours]').count()==1 and q.input_value('#af [name=hours]')=='2,5','Formular samt Stunden erhalten')
        # 2. inzwischen freigegeben → Aktion nicht mehr erlaubt → Hinweis mit Eingaben
        rs=release(cid); check(rs==[201,200,200],f'Leitung gibt frei {rs}')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(e=>e.remove())")  # Meldung aus Schritt 1 nicht mitzählen
        q.click('#af button.btn:not(.secondary)'); q.wait_for_timeout(1800)
        check(not any(KEPT[lang] in x for x in q.locator('.toast').all_inner_texts()),'keine widersprüchliche Meldung „Eingaben im Formular“')
        box=q.locator('#lostact')
        check(box.count()==1,f'{lang} {w}: Hinweis „nicht gespeichert“ sichtbar')
        if box.count():
            txt=box.inner_text()
            check(LOST[lang] in txt and '2,5' in txt and 'Rückleuchte getauscht' in txt,f'{lang} {w}: Hinweis nennt Stunden und Tätigkeit')
            if SHOTS: box.screenshot(path=f'{SHOTS}/schichtwechsel_{lang}_{w}.png')
            q.click('#lostok'); check(q.locator('#lostact').count()==0,'Ausblenden')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
    # 3. Sitzung am Server beendet → 401 → Offline-Daten entfernt
    ctx=br.new_context(viewport={'width':820,'height':1180}); q=ctx.new_page()
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sw.werkstatt','password':PW}]); q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(1500)
    q.evaluate("()=>{ localStorage.setItem('cfp_veh_probe_x','1'); localStorage.setItem('cfp_emerg_probe_x','1'); }")
    check(api('POST',f"/api/users/{u['d']['id']}/revoke-sessions")['s']==200,'Sitzungen serverseitig beendet')
    q.goto(B+'/#/vehicles'); q.wait_for_timeout(2000)
    left=q.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('cfp_veh_')||k.startsWith('cfp_emerg_'))")
    check(q.evaluate('location.hash').startswith('#/login') and not left,f'Anmeldeseite, Offline-Daten entfernt {left}')
    ctx.close(); br.close()
print('\nFEHLER: '+str(len(fails)) if fails else '\nAlles grün')
raise SystemExit(1 if fails else 0)
