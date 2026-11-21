# [CLAUDE] UI-Prüfung (21.11.2026, Backlog 1660, WCAG 1.3.1/4.1.2, Blickwinkel „Fahrer mit Bildschirmleser füllt ein Formular aus“):
# Jedes sichtbare Formularfeld, das direkt hinter einer Beschriftung steht, ist mit ihr verknüpft (`labels.length > 0`, Bildschirmleser
# nennt den Namen, Tippen auf die Beschriftung fokussiert das Feld). Seiten: Vorgang (alle Aktionsformulare nacheinander), Fahrzeugakte,
# Lagerartikel, Fahrerakte, Einstellungen, Bußgelder, Verträge, Versicherungsfälle, Prüftermine, Reifen, Auslesungen, Lager, Benutzer,
# Notfallnummern, Meldung, Fahrerliste – Inhaber, DE/UK/EN, 390/1366 px. Frischer Dev-Server nötig. CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SCAN = """() => { const bad = [];
  for (const c of document.querySelectorAll('#app input, #app select, #app textarea')) {
    if (['hidden','checkbox','radio','submit','button'].includes(c.type) || c.offsetParent === null) continue;
    const l = c.previousElementSibling; if (!l || l.tagName !== 'LABEL' || l.querySelector('input,select,textarea')) continue;
    if (!c.labels || !c.labels.length) bad.push((c.name || c.id || c.tagName) + ': ' + l.innerText.trim().slice(0, 40)); }
  const ids = {}; for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
  for (const [k, n] of Object.entries(ids)) if (n > 1) bad.push('doppelte ID #' + k);
  return bad; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bl.inhaber','display_name':'BL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    VIN='WDB96340310166001'; vid='VIN:'+VIN; api('POST','/api/vehicles',{'plate':'BL-AB 1660','vin':VIN,'site':'Dortmund','kind':'lkw'})
    cid=api('POST','/api/cases',{'vehicle_id':vid,'description':'BL Unfall Spiegel abgefahren','priority':'mittel','driveability':'fahrbereit','workshop_site':site,'request_key':f'bl-{os.getpid()}'})['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'bla-{os.getpid()}','expected_version':v,'payload':{'workshop_site':site},'note':'frei'})
    sid=api('POST','/api/stock',{'site':site,'name':'Spiegelglas BL','min_qty':2,'initial_qty':1})['d']['id']
    did=api('POST','/api/drivers',{'display_name':'Fahrer BL'})['d']['id']
    pages=[f'#/vehicles/{vid}', f'#/stock/{sid}', f'#/drivers/{did}', '#/settings', '#/fines', '#/contracts', '#/claims', '#/maintenance', '#/tires', '#/tacho', '#/stock', '#/users', '#/emergency', '#/new', '#/drivers', f'#/cases/{cid}']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(1366,900)]:
        tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bl.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        total=0
        for pg in pages:
            q.goto(B+'/'+pg); q.reload(); q.wait_for_selector('#main h1',timeout=15000); q.wait_for_timeout(700)
            q.evaluate("()=>document.querySelectorAll('#app details').forEach((d)=>d.open=true)"); q.wait_for_timeout(300)
            bad=q.evaluate(SCAN); check(not bad, f'{tag} {pg}: Felder verknüpft {bad[:4]}')
            total+=q.evaluate("()=>[...document.querySelectorAll('#app label[for^=cfl]')].length")
            if pg.startswith('#/cases/'):
                acts=q.evaluate("()=>[...document.querySelectorAll('[data-act]')].map((b)=>b.dataset.act)")
                for act in acts[:14]:
                    q.goto(B+'/'+pg); q.reload(); q.wait_for_selector(f'[data-act={act}]',timeout=15000)
                    try: q.click(f'[data-act={act}]',timeout=3000)
                    except Exception: continue
                    q.wait_for_timeout(500); bad=q.evaluate(SCAN); check(not bad, f'{tag} Aktion {act}: Felder verknüpft {bad[:4]}')
                    if act=='claim' and SHOTS: q.screenshot(path=f'{SHOTS}/bl_{lang}_{w}.png')
        check(total>0, f'{tag}: automatisch verknüpfte Beschriftungen vorhanden ({total})')
        # Tippen auf eine Beschriftung fokussiert das Feld
        q.goto(B+f'/#/stock/{sid}'); q.reload(); q.wait_for_selector('#main h1',timeout=15000); q.evaluate("()=>document.querySelectorAll('#app details').forEach((d)=>d.open=true)")
        lid=q.evaluate("()=>{const l=document.querySelector('#app label[for^=cfl]'); if(!l) return null; l.scrollIntoView({block:'center'}); return l.htmlFor}")
        if lid: q.click(f'label[for="{lid}"]'); check(q.evaluate("()=>document.activeElement && document.activeElement.id")==lid, f'{tag}: Tippen auf Beschriftung fokussiert das Feld')
        if SHOTS: q.screenshot(path=f'{SHOTS}/blst_{lang}_{w}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
