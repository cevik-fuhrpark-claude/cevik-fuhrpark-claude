# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1495, Blickwinkel „Disposition steuert die App per Sprachsteuerung (Sprachzugriff/Voice Control: „Tippe auf …“)“, WCAG 2.5.3 Beschriftung im Namen):
# Wer per Sprache bedient, sagt, was er sieht. Hat ein Bedienelement ein eigenes aria-label/aria-labelledby, muss dessen zugänglicher Name
# (Barrierefreiheitsbaum von Chromium, CDP Accessibility.getFullAXTree) den sichtbaren Text enthalten – sonst findet die Sprachsteuerung
# „Tippe auf Sortieren“ bzw. „Tippe auf Kennzeichen“ nicht. Geprüft: Inhaber, Fahrer, Werkstatt; DE/UK/EN; 390/1366 px (Werkstatt auch 820 px);
# auf Vorgängen werden alle Aktionsformulare geöffnet. Sichtbarer Text = Inhalt ohne aria-hidden-Teile (Knöpfe/Links) bzw. sichtbare
# Beschriftung (<label>) bei Feldern; reine Symbole/Zahlen (×, ▸, 3) zählen nicht als Text. Vergleich ohne Groß-/Kleinschreibung und Satzzeichen.
# Gegenprobe: ein Knopf mit abweichendem aria-label wird gefunden. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ROLES={'button','link','textbox','searchbox','combobox','listbox','checkbox','radio','spinbutton','slider','switch','menuitem','tab','PopUpButton','ToggleButton'}
VIS = r"""function(){ const e=this; if(!e||e.nodeType!==1) return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
  if(r.width<1||r.height<1||cs.visibility!=='visible'||e.closest('[hidden]')||e.type==='hidden') return null;
  if(e.getRootNode()!==document) return null; // Unterfelder des Browsers (Datum: Tag/Monat/Jahr) – maßgeblich ist das Feld selbst
  if(!e.hasAttribute('aria-label')&&!e.hasAttribute('aria-labelledby')) return null;
  const txt=(n)=>{ const c=n.cloneNode(true); for(const x of c.querySelectorAll('[aria-hidden="true"],input,select,textarea,.sr-only,.visually-hidden')) x.remove(); return c.textContent; };
  let vis='';
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)){ const ls=[...(e.labels||[])].filter((l)=>l.offsetParent); vis=ls.map(txt).join(' '); }
  else vis=e.innerText!==undefined?txt(e):'';
  vis=(vis||'').replace(/\s+/g,' ').trim();
  return {vis, d:e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).join('.'):'')+' „'+(e.outerHTML||'').slice(0,110)+'“'}; }"""
import unicodedata, re
def norm(s): return re.sub(r'\s+',' ',re.sub(r'[^\w\s]|_',' ',re.sub('[\u00ad\u200b\u200c\u200d\u2060]','',unicodedata.normalize('NFKC',s or '').lower()))).strip()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def mismatched(q, cdp):
    tree=cdp.send('Accessibility.getFullAXTree')['nodes']
    out=[]
    for n in tree:
        if n.get('ignored'): continue
        role=(n.get('role') or {}).get('value')
        if role not in ROLES: continue
        name=((n.get('name') or {}).get('value') or '').strip()
        bid=n.get('backendDOMNodeId')
        if not bid: continue
        try:
            obj=cdp.send('DOM.resolveNode',{'backendNodeId':bid})['object']['objectId']
            d=cdp.send('Runtime.callFunctionOn',{'objectId':obj,'returnByValue':True,'functionDeclaration':VIS})['result'].get('value')
        except Exception: d=None
        if not d: continue
        v=norm(d['vis'])
        if not re.search(r'[^\W\d_]{2,}',v): continue  # nur Symbole/Zahlen
        # ganze Wörter, und der sichtbare Text steht am Anfang des Namens (Technik G208: Sprachsteuerung „Tippe auf Kontrolle“ findet
        # „Abfahrtskontrolle“ nicht; „Check“ in „Pre-trip check“ nur unzuverlässig)
        if not (' '+norm(name)+' ').startswith(' '+v+' '): out.append(f'{role} „{name}“ ≠ sichtbar „{d["vis"][:60]}“: {d["d"]}')
    return out
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ns.inhaber','display_name':'NS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ns.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM76'+sfx
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nZN-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':'ns.inhaber'}
    for role in ['driver','workshop']:
        un=f'ns.{role}{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':f'ZN {role}','role':role,'workshop_site':'DORTMUND','environment':envn,'language':'de'})
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
    LANGS=os.environ.get('CFP_LANGS','de,uk,en').split(',')
    # Gegenprobe: Knopf mit abweichendem aria-label wird erkannt
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users['owner'],'password':PW},None]); q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(1000)
    q.evaluate("()=>{const b=document.createElement('button');b.textContent='Speichern';b.setAttribute('aria-label','Ablegen');document.querySelector('main').append(b);}")
    check(any('Ablegen' in x for x in mismatched(q,cdp)),'Gegenprobe: Knopf „Speichern“ mit aria-label „Ablegen“ wird gefunden')
    ctx.close()
    for role,routes in ROUTES.items():
        if role not in users: continue
        for (w,h) in ([(390,844),(820,1180),(1366,900)] if role=='workshop' else [(390,844),(1366,900)]):
            ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None])
            for lang in LANGS:
                q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                for rt in routes:
                    q.goto(B+'/'+rt); q.reload(); q.wait_for_timeout(1100)
                    found=mismatched(q,cdp)
                    if rt=='#/new' and q.locator('textarea#d').count():
                        q.fill('textarea#d',{'de':'Reifen geplatzt, Rauch aus dem Motorraum, Öl läuft aus','uk':'Колесо лопнуло, дим з моторного відсіку, тече олива','en':'Tyre burst, smoke from the engine bay, oil leaking'}[lang])
                        q.wait_for_timeout(900); found+=[f'[Hinweise] {x}' for x in mismatched(q,cdp)]; q.fill('textarea#d','')
                    if rt.startswith('#/cases/') and w==390:
                        acts=q.evaluate("()=>[...document.querySelectorAll('button[data-act]')].filter(b=>b.offsetParent).map(b=>b.dataset.act)")
                        for act in acts:
                            b=q.locator(f'button[data-act="{act}"]').first
                            if not b.is_visible(): continue
                            try: b.click(timeout=3000)
                            except Exception: continue
                            q.wait_for_timeout(600); found+=[f'[{act}] {x}' for x in mismatched(q,cdp)]
                            q.goto(B+'/'+rt); q.wait_for_timeout(900)
                    for x in found:
                        key=(role,lang,x.split(': ')[-1][:60])
                        if key in seen: continue
                        seen[key]=1; check(False,f'{role}/{w}/{lang} {rt}: {x}')
                    if SHOTS and lang=='de' and w==390: q.screenshot(path=f"{SHOTS}/name-sichtbar-{role}-{w}-{rt.strip('#/').replace('/','_') or 'start'}.png")
            check(not errs,f'{role}/{w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    # Werkstatt-Panel (Demo, /werkstatt/): Anmeldung (Sprachwahl, Ziffernfeld), nach Demo-Anmeldung jeder Reiter, erste Auftragskarte geöffnet
    for (w,h) in [(390,844),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        cdp=ctx.new_cdp_session(q); cdp.send('Accessibility.enable'); cdp.send('DOM.enable')
        q.goto(B+'/werkstatt/'); q.wait_for_timeout(700); found=[f'Anmeldung: {x}' for x in mismatched(q,cdp)]
        for k in '401111': q.locator(f'.pad [data-k="{k}"]').click(); q.wait_for_timeout(120)
        q.wait_for_timeout(600); tabs=q.locator('.nav .tabbtn'); check(tabs.count()>0,f'panel/{w}: Demo-Anmeldung, Reiter sichtbar')
        for i in range(tabs.count()):
            tabs.nth(i).click(); q.wait_for_timeout(400); found+=[f'Reiter {i+1}: {x}' for x in mismatched(q,cdp)]
            if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/name-sichtbar-panel-{w}-reiter{i+1}.png')
        for x in found:
            key=('panel',x.split(': ')[-1][:60])
            if key in seen: continue
            seen[key]=1; check(False,f'panel/{w}: {x}')
        check(not errs,f'panel/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    check(len(seen)==0,f'Sichtbarer Text steckt im zugänglichen Namen aller Bedienelemente mit eigenem aria-label ({len(seen)} Abweichungen)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
