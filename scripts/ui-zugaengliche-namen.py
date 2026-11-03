# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 892, Blickwinkel „Fahrer mit Sehschwäche nutzt den Bildschirmleser (TalkBack/VoiceOver)“):
# Jedes sichtbare Bedienelement (Knopf, Link, Eingabefeld, Auswahl, Kontrollkästchen, …) muss einen zugänglichen Namen haben
# (WCAG 4.1.2 / 1.3.1) – sonst sagt der Bildschirmleser nur „Schaltfläche“ bzw. „Eingabefeld“. Gemessen wird der Barrierefreiheitsbaum
# von Chromium (CDP Accessibility.getFullAXTree), also genau das, was TalkBack/VoiceOver vorlesen. Dazu werden auf der Vorgangsseite
# alle Aktionsformulare geöffnet. Rollen Inhaber (DE), Fahrer und Werkstatt (DE/UK), 390/1366 px (Werkstatt auch 820 px); Bilder/Grafiken (img, svg role=img) ebenfalls.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ROLES={'button','link','textbox','searchbox','combobox','listbox','checkbox','radio','spinbutton','slider','switch','menuitem','tab','ListBox','PopUpButton','ToggleButton','img','image'}
# Datums-/Monatsfelder: Chromium legt intern Unterfelder („Tag“, „Monat“) ohne eigenen Namen an – die liest der Bildschirmleser mit
# dem Namen des Feldes; maßgeblich ist das Feld selbst (Rolle textbox/date). Unterelemente ohne DOM-Knoten werden daher übersprungen.
# Zusätzlich im DOM: doppelte IDs (zerstören label-for/aria-describedby), Verweise auf fehlende IDs, genau eine sichtbare h1,
# Sprachnamen in Auswahlfeldern mit eigenem lang (WCAG 3.1.2, sonst liest TalkBack „Українська“ mit deutscher Aussprache).
DOMCHK = r"""() => { const out = []; const ids = {};
  for (const e of document.querySelectorAll('[id]')) { if (!e.id) continue; ids[e.id] = (ids[e.id] || 0) + 1; }
  for (const [k, n] of Object.entries(ids)) if (n > 1) out.push('doppelte ID #' + k + ' (' + n + '×)');
  for (const e of document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls],label[for]')) {
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) { const v = e.getAttribute(a); if (!v) continue;
      for (const id of v.split(/\s+/)) if (id && !document.getElementById(id)) out.push(a + ' verweist auf fehlende ID #' + id + ' an ' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')); } }
  const h1 = [...document.querySelectorAll('main h1, #app h1')].filter((h) => h.offsetParent && !h.closest('article.guide'));
  if (h1.length !== 1) out.push('sichtbare h1: ' + h1.length);
  for (const o of document.querySelectorAll('option')) { const t = o.textContent.trim(); const m = { 'Deutsch': 'de', 'Українська': 'uk', 'English': 'en' }[t];
    if (m && (o.closest('[lang]') || document.documentElement).getAttribute('lang') !== m && o.getAttribute('lang') !== m) out.push('Sprachname ohne lang: ' + t + ' in ' + (o.parentElement.id || o.parentElement.name)); }
  return out; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def unnamed(q, cdp):
    tree=cdp.send('Accessibility.getFullAXTree')['nodes']
    out=[]
    for n in tree:
        if n.get('ignored'): continue
        role=(n.get('role') or {}).get('value')
        if role not in ROLES: continue
        name=((n.get('name') or {}).get('value') or '').strip()
        if name: continue
        bid=n.get('backendDOMNodeId')
        if not bid: continue
        try:
            obj=cdp.send('DOM.resolveNode',{'backendNodeId':bid})['object']['objectId']
            d=cdp.send('Runtime.callFunctionOn',{'objectId':obj,'returnByValue':True,'functionDeclaration':"""function(){
              const e=this; if(!e||e.nodeType!==1) return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
              if(r.width<1||r.height<1||cs.visibility!=='visible'||e.closest('[hidden]')) return null;
              if(e.type==='hidden') return null;
              const p=e.parentElement; return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.name?'[name='+e.name+']':'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'')+' in '+(p?p.tagName.toLowerCase()+(p.id?'#'+p.id:''):'')+' „'+(e.outerHTML||'').slice(0,90)+'“'; }"""})['result'].get('value')
        except Exception: d=None
        if d: out.append(f'{role}: {d}')
    return out
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'zn.inhaber','display_name':'ZN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'zn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM76'+sfx
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nZN-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':'zn.inhaber'}
    for role in ['driver','workshop']:
        un=f'zn.{role}{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':f'ZN {role}','role':role,'workshop_site':'DORTMUND','environment':envn,'language':'de'})
        if r['s'] in (200,201) and r['d'] and r['d'].get('invite_token'):
            c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
            users[role]=un
        check(role in users,f'Konto {role} angelegt')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts lose (Test Namen)','priority':'mittel','driveability':'fahrbereit','request_key':'zn-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']
    # Foto am Vorgang: Vorschaubilder brauchen einen Alternativtext (Dateiname bzw. Beschreibung)
    up=a.evaluate("""async (cid) => { const b = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgAAAAAgABVKJPXQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
      const r = await fetch(`/api/cases/${cid}/files`, { method: 'POST', headers: { 'x-cfp': '1', 'x-filename': 'spiegel.png', 'content-type': 'image/png' }, body: b }); return r.status; }""", cid)
    check(up==201,f'Foto hochgeladen ({up})')
    # Fall 1 (cid): freigegeben für Werkstatt Dortmund, Werkstatt hat begonnen → Aktionen der Reparatur (Arbeitszeit, Teile, Fremdleistung, …)
    # Fall 2 (dcid): vom Fahrer selbst gemeldet, neu → Aktionen der Leitung (Freigabe, Ablehnen, Priorität, …) und Fahreransicht
    def login(un):
        cx=br.new_context(); pg=cx.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); return cx,pg
    def cmd(pg,case_id,action,payload=None,note=None):
        v=pg.evaluate(JS,['GET',f'/api/cases/{case_id}',None,None])['d']['case']['version']
        b={'action':action,'command_id':f'zn-{action}-{sfx}-{case_id[:6]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return pg.evaluate(JS,['POST',f'/api/cases/{case_id}/commands',b,None])['s']
    check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'Fall 1 an Werkstatt Dortmund freigegeben')
    if 'workshop' in users:
        cx,pg=login(users['workshop']); check(cmd(pg,cid,'start_repair')==200,'Werkstatt beginnt Fall 1'); cx.close()
    dcid=cid
    if 'driver' in users:
        cx,pg=login(users['driver'])
        d=pg.evaluate(JS,['POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Rücklicht links defekt (Test Namen)','priority':'niedrig','driveability':'fahrbereit','request_key':'znd-'+sfx},None])
        check(d['s']==201,'Fahrer meldet Fall 2'); dcid=d['d']['id'] if d['s']==201 else cid; cx.close()
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; vid=[v for v in vl if v.get('vin')==vin][0]['id']
    ROUTES={'owner':['#/','#/cases','#/new','#/vehicles','#/more','#/maintenance','#/master','#/plan','#/stock','#/users','#/help','#/check','#/emergency',
                     '#/cases/'+cid,'#/cases/'+dcid,'#/vehicles/VIN:'+vin,'#/fines','#/drivers','#/tires','#/tacho','#/quality','#/audit','#/guide','#/search','#/settings','#/kpi'],
            'driver':['#/','#/new','#/check','#/help','#/emergency','#/cases/'+dcid],
            'workshop':['#/','#/cases','#/stock','#/cases/'+cid,'#/plan']}
    seen={}
    # Inhaber: DE; Fahrer und Werkstatt zusätzlich UK (ukrainische Handys/Tablets). CFP_LANGS=de,uk,en prüft alle Rollen in allen Sprachen.
    LANGS=os.environ.get('CFP_LANGS')
    for role,routes in ROUTES.items():
        if role not in users: continue
        for (w,h) in ([(390,844),(820,1180),(1366,900)] if role=='workshop' else [(390,844),(1366,900)]):  # Werkstatt zusätzlich Tablet
            ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None])
            for lang in (LANGS.split(',') if LANGS else (['de'] if role=='owner' else ['de','uk'])):
                q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                for rt in routes:
                    q.goto(B+'/'+rt); q.reload(); q.wait_for_timeout(1100)
                    found=unnamed(q,cdp)+[f'DOM: {x}' for x in q.evaluate(DOMCHK)]
                    # Vorgangsseite: jedes Aktionsformular öffnen (Knöpfe mit data-act) und prüfen
                    if rt.startswith('#/cases/') and lang=='de':
                        acts=q.evaluate("()=>[...document.querySelectorAll('button[data-act]')].filter(b=>b.offsetParent).map(b=>b.dataset.act)")
                        for act in acts:
                            b=q.locator(f'button[data-act="{act}"]').first
                            if not b.is_visible(): continue
                            try: b.click(timeout=3000)
                            except Exception: continue
                            q.wait_for_timeout(600)
                            found+= [f'[{act}] {x}' for x in unnamed(q,cdp)]
                            q.goto(B+'/'+rt); q.wait_for_timeout(900)
                    for x in found:
                        key=(role,x.split(' „')[0])
                        if key in seen: continue
                        seen[key]=1; check(False,f'{role}/{w}/{lang} {rt}: ohne Namen – {x}')
                    if SHOTS and lang=='de': q.screenshot(path=f"{SHOTS}/namen-{role}-{w}-{rt.strip('#/').replace('/','_') or 'start'}.png")
            check(not errs,f'{role}/{w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    check(len(seen)==0,f'Alle Bedienelemente mit zugänglichem Namen ({len(seen)} ohne)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
