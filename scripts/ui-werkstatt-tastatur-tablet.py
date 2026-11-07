# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195, Blickwinkel „Werkstatt-Tablet mit Bildschirmtastatur im Querformat“): Die Bildschirmtastatur
# verkleinert die sichtbare Seite eines Tablets quer auf 300–380 px Höhe (1024×330, 1180×380, 960×300) bzw. hochkant auf 560–620 px (768×560,
# 820×620, 600×400 mit Tabbar). Für jedes Aktionsformular der Werkstatt im Vorgang „in Reparatur“ und das Lager: jedes Text-/Zahl-/Auswahlfeld
# liegt nach dem Fokussieren vollständig im Bild und ist nicht verdeckt (Seitenleiste, Tabbar, klebende Leisten), der Speichern-Knopf des
# Formulars ist erreichbar und nicht verdeckt. Sonde ohne Befund – als Wächter übernommen. DE/UK/EN. Dev-Server: CFP_URL.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FIELDS = r"""() => [...document.querySelectorAll('main input, main textarea, main select')].filter((e) => e.checkVisibility() && !['hidden','checkbox','radio','file','submit','button'].includes(e.type)).map((e, i) => { e.dataset.probe = i; return { i, n: e.name || e.id || e.type }; })"""
MEAS = r"""(i) => { const e = document.querySelector(`[data-probe="${i}"]`);
  const pt = (el) => { const r = el.getBoundingClientRect(); const h = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + Math.min(r.height / 2, 10));
    return { top: Math.round(r.top), bot: Math.round(r.bottom), cov: !(h && (h === el || el.contains(h) || h.contains(el))) }; };
  const f = e.closest('form'); let sb = null;
  if (f) { const b = f.querySelector('button[type=submit], button:not([type])'); if (b) { b.scrollIntoView({ block: 'nearest' }); sb = pt(b); } }
  e.scrollIntoView({ block: 'nearest' }); return { f: pt(e), sb, ih: innerHeight, active: document.activeElement === e }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def ok(x,ih): return x is None or (not x['cov'] and x['top']>=0 and x['bot']<=ih+1)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wt.inhaber','display_name':'WT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='wt.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['tr.inhaber','tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    me=api('GET','/api/me')['d']; check(bool(me),'Anmeldung Inhaber'); envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; vin=f'WDB9634WT{R:08d}'[:17]
    api('POST','/api/vehicles',{'vin':vin,'plate':f'WT-AB {R%1000}','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(c['s'] in (200,201),'Meldung angelegt'); cid=c['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{'workshop_site':'DORTMUND'},'note':'Bremse prüfen'})['s']==200,'Reparatur freigegeben')
    ws=f'wt.ws{R}'; u=api('POST','/api/users',{'username':ws,'display_name':'WT Werkstatt','role':'workshop','environment':envn,'workshop_site':'DORTMUND'})
    check(u['s'] in (200,201),'Konto Werkstatt')
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    q0.evaluate(JS,['POST','/api/login',{'username':ws,'password':PW}]); cs=q0.evaluate(JS,['GET',f'/api/cases/{cid}'])['d']['case']
    check(q0.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':str(uuid.uuid4()),'expected_version':cs['version'],'payload':{}}])['s']==200,'Reparatur begonnen'); c0.close()
    runs=[('de',1024,330),('uk',1180,380),('en',960,300),('de',768,560),('uk',600,400)]
    for lang,w,h in runs:
        ctx=br.new_context(viewport={'width':w,'height':h},has_touch=True); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        tag=f'{lang} {w}×{h}'; q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':ws,'password':PW}])['s']==200,f'{tag}: Anmeldung Werkstatt')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        hh=f'#/cases/{cid}'; q.goto(B+'/'+hh); q.reload(); q.wait_for_selector('main button[data-act]',timeout=20000); q.wait_for_timeout(600)
        acts=q.evaluate("()=>[...document.querySelectorAll('main button[data-act]')].map((b)=>b.getAttribute('data-act'))")
        check(all(x in acts for x in ['record_work','add_part','add_open_item']),f'{tag}: Aktionen im Vorgang {acts}')
        for act in acts+['#/stock']:
            if act.startswith('#/'): q.goto(B+'/'+act); q.reload(); q.wait_for_timeout(1300)
            else: q.goto(B+'/'+hh); q.reload(); q.wait_for_selector(f'main button[data-act="{act}"]',timeout=15000); q.click(f'main button[data-act="{act}"]'); q.wait_for_timeout(400)
            fs=q.evaluate(FIELDS); bad=[]
            for f in fs:
                q.evaluate('()=>{document.activeElement&&document.activeElement.blur()}'); q.focus(f'[data-probe="{f["i"]}"]'); q.wait_for_timeout(60)
                m=q.evaluate(MEAS,f['i'])
                if not (m['active'] and ok(m['f'],m['ih']) and ok(m['sb'],m['ih'])): bad.append(f"{f['n']} {m}")
            check(len(fs)>0 and not bad,f'{tag} {act}: {len(fs)} Felder und Speichern-Knopf sichtbar, nicht verdeckt {bad[:2]}')
            if SHOTS: q.screenshot(path=f"{SHOTS}/ws-tastatur-{lang}-{w}-{act.strip('#/')}.png")
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
