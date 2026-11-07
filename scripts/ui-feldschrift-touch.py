# [CLAUDE] UI-Test (07.11.2026, Backlog 1107, Blickwinkel „Werkstatt bucht Teile mit Handschuhen – Zahlenfelder und Auswahllisten am Tablet“):
# Eingabefelder erben die Schrift ihrer Umgebung; in kleiner Schrift waren sie 14–15,2 px (Verträge „Stichtag“/„Ende/Kündigung bis“, Fristen-Tabelle der
# Einstellungen, Umgebungswahl in der Kopfleiste) – iOS vergrößert beim Antippen eines Feldes unter 16 px die ganze Seite.
# Prüft mit Touch (390 Handy, 1024 Tablet; DE/UK/EN): alle sichtbaren Eingabe-/Auswahlfelder auf Werkstatt-Tafel, Vorgang (alle Aktionsformulare der
# Werkstatt), Lager, Verträge, Einstellungen und Kopfleiste ≥ 16 px und ≥ 44 px hoch; Kopfleiste ohne Querscrollen. Mit Maus (1366) bleibt der
# Vertrags-Filter klein (unverändert). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FIELDS = """() => { const out = []; document.querySelectorAll('main details').forEach((d) => { d.open = true; });
  for (const e of document.querySelectorAll('main input, main select, main textarea, header select, .topbar select')) {
    if (!e.offsetParent) continue; const ty = e.getAttribute('type') || 'text'; if (['hidden', 'checkbox', 'radio', 'file'].includes(ty)) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize), h = e.getBoundingClientRect().height, top = !!e.closest('.topbar, header');
    if (fs < 16) out.push(fs + 'px ' + (e.id || e.name));
    if (!top && h < 44) out.push('Höhe ' + Math.round(h) + ' ' + (e.id || e.name)); }
  return [...new Set(out)]; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tr.inhaber','display_name':'TR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='tr.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    me=api('GET','/api/me')['d']; check(bool(me),'Anmeldung Inhaber'); envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; vin=f'WDB9634FS{R:08d}'[:17]
    api('POST','/api/vehicles',{'vin':vin,'plate':f'FS-AB {R%1000}','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(c['s'] in (200,201),'Meldung angelegt'); cid=c['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{'workshop_site':'DORTMUND'},'note':'Bremse prüfen'})['s']==200,'Reparatur freigegeben')
    ws=f'fs.ws{R}'; u=api('POST','/api/users',{'username':ws,'display_name':'FS Werkstatt','role':'workshop','environment':envn,'workshop_site':'DORTMUND'})
    check(u['s'] in (200,201),'Konto Werkstatt')
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    q0.evaluate(JS,['POST','/api/login',{'username':ws,'password':PW}]); cs=q0.evaluate(JS,['GET',f'/api/cases/{cid}'])['d']['case']
    check(q0.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':str(uuid.uuid4()),'expected_version':cs['version'],'payload':{}}])['s']==200,'Reparatur begonnen'); c0.close()
    runs=[('workshop','de',390,844),('workshop','uk',1024,768),('owner','en',390,844),('owner','uk',390,844),('owner','de',1024,768)]
    for role,lang,w,h in runs:
        ctx=br.new_context(viewport={'width':w,'height':h},has_touch=True,is_mobile=(w<500)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        tag=f'{role} {lang} {w}px Touch'; un=ws if role=='workshop' else owner
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])['s']==200,f'{tag}: Anmeldung')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        pages=['#/','#/stock',f'#/cases/{cid}'] if role=='workshop' else ['#/','#/contracts','#/settings',f'#/cases/{cid}']
        for hh in pages:
            q.goto(B+'/'+hh); q.reload(); q.wait_for_timeout(1300)
            bad=q.evaluate(FIELDS); check(not bad,f'{tag} {hh}: Felder ≥ 16 px / ≥ 44 px {bad}')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {hh}: ohne Querscrollen')
            if SHOTS: q.screenshot(path=f"{SHOTS}/feldschrift_{role}_{lang}_{w}_{hh.strip('#/').split('/')[0] or 'start'}.png")
            if hh.startswith('#/cases/') and role=='workshop':
                acts=q.evaluate("()=>[...document.querySelectorAll('main button[data-act]')].map((b)=>b.getAttribute('data-act'))")
                check(len(acts)>=6,f'{tag}: Aktionen im Vorgang {acts}')
                for act in acts:
                    q.goto(B+'/'+hh); q.reload(); q.wait_for_selector(f'main button[data-act="{act}"]',timeout=15000); q.click(f'main button[data-act="{act}"]'); q.wait_for_timeout(500)
                    bad=q.evaluate(FIELDS); check(not bad,f'{tag} Formular {act}: Felder ≥ 16 px / ≥ 44 px {bad}')
        check(q.evaluate("()=>{const e=document.querySelector('#envsel'); return !e || parseFloat(getComputedStyle(e).fontSize)>=16}"),f'{tag}: Umgebungswahl ≥ 16 px')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    ctx=br.new_context(viewport={'width':1366,'height':900}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    q.goto(B+'/#/contracts'); q.reload(); q.wait_for_selector('#ctasof',timeout=15000)
    fs=q.evaluate("()=>parseFloat(getComputedStyle(document.querySelector('#ctasof')).fontSize)")
    check(fs<16,f'1366 Maus: Vertrags-Filter unverändert klein ({fs} px)')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
