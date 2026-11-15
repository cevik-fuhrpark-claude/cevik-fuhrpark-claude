# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1496, Blickwinkel „Disposition mit Screenreader springt über Überschriften (Taste H / Rotor „Überschriften“)“,
# WCAG 1.3.1 Info und Beziehungen, 2.4.6 Überschriften und Beschriftungen, 2.4.10 Abschnittsüberschriften):
# Screenreader-Nutzer überfliegen eine Seite über die Überschriftenliste. Geprüft wird je Ansicht über den Barrierefreiheitsbaum von Chromium
# (CDP Accessibility.getFullAXTree, Rolle „heading“ mit Ebene): genau eine Überschrift der Ebene 1 (Seitentitel), keine übersprungene Ebene
# (nach Ebene 2 folgt höchstens 3, nicht 4), keine leere Überschrift. Inhaber, Fahrer, Werkstatt; DE/UK/EN; 390/1366 px; auf Vorgängen werden
# alle Aktionsformulare geöffnet; Meldeformular mit Hinweisen; Werkstatt-Panel (Anmeldung + jeder Reiter).
# Gegenprobe: eine eingeschobene <h4> direkt nach der <h1> und eine leere <h2> werden gefunden. Braucht den Dev-Server (scripts/dev-server.mjs).
# Screenshots: CFP_SHOTS=<Ordner>; Sprachen: CFP_LANGS=de,uk,en.
import os, uuid, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DESC = r"""function(){ const e=this; if(!e||e.nodeType!==1) return null; const r=e.getBoundingClientRect();
  return (r.width<1||r.height<1?'[unsichtbar] ':'')+e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).join('.'):'')+' „'+(e.outerHTML||'').slice(0,100)+'“'; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def headings(cdp):
    out=[]
    for n in cdp.send('Accessibility.getFullAXTree')['nodes']:
        if n.get('ignored') or (n.get('role') or {}).get('value')!='heading': continue
        lvl=None
        for pr in n.get('properties') or []:
            if pr.get('name')=='level': lvl=(pr.get('value') or {}).get('value')
        name=((n.get('name') or {}).get('value') or '').strip()
        d=''
        bid=n.get('backendDOMNodeId')
        if bid:
            try:
                obj=cdp.send('DOM.resolveNode',{'backendNodeId':bid})['object']['objectId']
                d=cdp.send('Runtime.callFunctionOn',{'objectId':obj,'returnByValue':True,'functionDeclaration':DESC})['result'].get('value') or ''
            except Exception: d=''
        out.append((int(lvl or 2),name,d))
    return out
def problems(cdp):
    hs=headings(cdp); out=[]
    h1=[h for h in hs if h[0]==1]
    if len(h1)!=1: out.append(f'{len(h1)} Überschriften der Ebene 1: '+' | '.join(f'„{h[1][:40]}“' for h in h1))
    prev=0
    for (lvl,name,d) in hs:
        if not re.search(r'[^\W\d_]',name): out.append(f'leere Überschrift (Ebene {lvl}): {d}')
        if prev and lvl>prev+1: out.append(f'Ebene {prev} → {lvl} übersprungen bei „{name[:50]}“: {d}')
        prev=lvl
    return out
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'us.inhaber','display_name':'US Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='us.inhaber' if s['s']==200 else None
    for un in ['us.inhaber','ns.inhaber','zn.inhaber','fv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM77'+sfx
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nUS-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':owner}
    for role in ['driver','workshop']:
        un=f'us.{role}{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':f'US {role}','role':role,'workshop_site':'DORTMUND','environment':envn,'language':'de'})
        if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
            c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
            users[role]=un
        check(role in users,f'Konto {role} angelegt')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts lose (Test Überschriften)','priority':'mittel','driveability':'fahrbereit','request_key':'us-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']
    def login(un):
        cx=br.new_context(); pg=cx.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); return cx,pg
    def cmd(pg,case_id,action,payload=None,note=None):
        v=pg.evaluate(JS,['GET',f'/api/cases/{case_id}',None,None])['d']['case']['version']
        b={'action':action,'command_id':f'us-{action}-{sfx}-{case_id[:6]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return pg.evaluate(JS,['POST',f'/api/cases/{case_id}/commands',b,None])['s']
    check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'Fall 1 an Werkstatt Dortmund freigegeben')
    if 'workshop' in users:
        cx,pg=login(users['workshop']); check(cmd(pg,cid,'start_repair')==200,'Werkstatt beginnt Fall 1'); cx.close()
    dcid=cid
    if 'driver' in users:
        cx,pg=login(users['driver'])
        d=pg.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rücklicht links defekt (Test Überschriften)','priority':'niedrig','driveability':'fahrbereit','request_key':'usd-'+sfx},None])
        check(d['s']==201,'Fahrer meldet Fall 2'); dcid=d['d']['id'] if d['s']==201 else cid; cx.close()
    ROUTES={'owner':['#/','#/cases','#/new','#/vehicles','#/more','#/maintenance','#/master','#/plan','#/stock','#/users','#/help','#/check','#/emergency',
                     '#/cases/'+cid,'#/cases/'+dcid,'#/vehicles/VIN:'+vin,'#/fines','#/drivers','#/tires','#/tacho','#/quality','#/audit','#/guide','#/guide?l=uk','#/guide?l=en','#/search','#/settings','#/kpi',
                     '#/claims','#/contracts','#/costs','#/defects','#/drivers/records','#/emergency/edit','#/inbox','#/readiness','#/stock/asof','#/stock/count',
                     '#/stock/journal','#/stock/receipt','#/stock/reorder','#/stock/usage','#/tacho/history','#/telematics','#/usage','#/vehicles/qr','#/wsload'],
            'driver':['#/','#/new','#/check','#/help','#/emergency','#/cases/'+dcid],
            'workshop':['#/','#/cases','#/stock','#/cases/'+cid,'#/plan']}
    seen={}
    LANGS=os.environ.get('CFP_LANGS','de,uk,en').split(',')
    # Gegenprobe: übersprungene Ebene und leere Überschrift werden gefunden
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users['owner'],'password':PW},None]); q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(1000)
    q.evaluate("()=>{const h=document.querySelector('#app h1'); const x=document.createElement('h4'); x.textContent='Eingeschoben'; h.after(x); const y=document.createElement('h2'); y.innerHTML='<span>  </span>'; x.after(y);}")
    pr=problems(cdp)
    check(any('übersprungen' in x and 'Eingeschoben' in x for x in pr),'Gegenprobe: <h4> direkt nach <h1> wird gefunden')
    check(any('leere Überschrift' in x for x in pr),'Gegenprobe: leere <h2> wird gefunden')
    q.evaluate("()=>{const x=document.createElement('h1'); x.textContent='Zweiter Titel'; document.querySelector('main').append(x);}")
    check(any('2 Überschriften der Ebene 1' in x for x in problems(cdp)),'Gegenprobe: zweite <h1> wird gefunden')
    ctx.close()
    for role,routes in ROUTES.items():
        if role not in users: continue
        for (w,h) in [(390,844),(1366,900)]:
            ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None])
            for lang in LANGS:
                q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                for rt in routes:
                    q.goto(B+'/'+rt); q.reload(); q.wait_for_timeout(1100)
                    found=problems(cdp)
                    if rt=='#/new' and q.locator('textarea#d').count():
                        q.fill('textarea#d',{'de':'Reifen geplatzt, Rauch aus dem Motorraum, Öl läuft aus','uk':'Колесо лопнуло, дим з моторного відсіку, тече олива','en':'Tyre burst, smoke from the engine bay, oil leaking'}[lang])
                        q.wait_for_timeout(900); found+=[f'[Hinweise] {x}' for x in problems(cdp)]; q.fill('textarea#d','')
                    if rt.startswith('#/cases/') and w==390:
                        acts=q.evaluate("()=>[...document.querySelectorAll('button[data-act]')].filter(b=>b.offsetParent).map(b=>b.dataset.act)")
                        for act in acts:
                            b=q.locator(f'button[data-act="{act}"]').first
                            if not b.is_visible(): continue
                            try: b.click(timeout=3000)
                            except Exception: continue
                            q.wait_for_timeout(600); found+=[f'[{act}] {x}' for x in problems(cdp)]
                            q.goto(B+'/'+rt); q.wait_for_timeout(900)
                    for x in found:
                        key=(role,rt.split('/')[1] if rt.count('/')>1 else rt,re.sub(r'„[^“]*“','',x)[:70])
                        if key in seen: continue
                        seen[key]=1; check(False,f'{role}/{w}/{lang} {rt}: {x}')
                    if SHOTS and lang=='de' and w==390: q.screenshot(path=f"{SHOTS}/ueberschriften-{role}-{w}-{rt.strip('#/').replace('/','_') or 'start'}.png")
            check(not errs,f'{role}/{w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    # Anmeldeseite ohne Konto, je Sprache (Sprachwahl auf der Anmeldeseite über ?lang bzw. Gerätesprache)
    for lang in LANGS:
        ctx=br.new_context(viewport={'width':390,'height':844},locale={'de':'de-DE','uk':'uk-UA','en':'en-GB'}[lang]); q=ctx.new_page()
        cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
        q.goto(B+'/#/login'); q.wait_for_timeout(1000)
        for x in problems(cdp):
            key=('login',re.sub(r'„[^“]*“','',x)[:70])
            if key in seen: continue
            seen[key]=1; check(False,f'login/{lang}: {x}')
        ctx.close()
    # Werkstatt-Panel (Demo, /werkstatt/): Anmeldung, nach Demo-Anmeldung jeder Reiter
    for (w,h) in [(390,844),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
        q.goto(B+'/werkstatt/'); q.wait_for_timeout(700); found=[f'Anmeldung: {x}' for x in problems(cdp)]
        for k in '401111': q.locator(f'.pad [data-k="{k}"]').click(); q.wait_for_timeout(120)
        q.wait_for_timeout(600); tabs=q.locator('.nav .tabbtn'); check(tabs.count()>0,f'panel/{w}: Demo-Anmeldung, Reiter sichtbar')
        for i in range(tabs.count()):
            tabs.nth(i).click(); q.wait_for_timeout(400); found+=[f'Reiter {i+1}: {x}' for x in problems(cdp)]
            if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/ueberschriften-panel-{w}-reiter{i+1}.png')
        for x in found:
            key=('panel',re.sub(r'„[^“]*“','',x)[:70])
            if key in seen: continue
            seen[key]=1; check(False,f'panel/{w}: {x}')
        check(not errs,f'panel/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    check(len(seen)==0,f'Überschriften: eine Ebene 1, keine übersprungene Ebene, keine leere Überschrift ({len(seen)} Abweichungen)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
