# [CLAUDE] UI-Test (27.10.2026, Backlog 426, Blickwinkel „Werkstatt-Tablet auf Ukrainisch, Mechaniker fotografiert die Teilenummer“):
# Werkstatt lädt ein Foto des Typenschilds hoch, erfasst das Teil mit „Foto/PDF zum Teil“ → Teileliste zeigt den Link (data-partfile),
# Leitung sieht ihn ebenfalls. Ohne Datei im Vorgang erscheint der Hinweis „zuerst hochladen“. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([cid]) => { const b = new Uint8Array(400); crypto.getRandomValues(b); b.set([0xff, 0xd8, 0xff, 0xe0]);
  const r = await fetch(`/api/cases/${cid}/files`, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-filename': 'typenschild.jpg', 'x-cfp': '1' }, body: b });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tf.inhaber','display_name':'TF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tf.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'tf-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'TF-T {R%900}{n}'; vin=f'WDB97{R:05d}T{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Kraftstofffilter tauschen (Test Teilefoto)','priority':'mittel','driveability':'fahrbereit','request_key':f'tf-{R}-{n}'})
        check(c['s']==201,f'Vorgang angelegt {c["s"]}'); cid=c['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Filter tauschen')==200,'freigegeben')
        u=api('POST','/api/users',{'username':f'tf.ws{R}.{n}','display_name':f'TF Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e))); RESP=[]; q.on('response',lambda r: RESP.append((r.status, r.url[-40:])) if '/commands' in r.url else None)
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'tf.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        check(cmd(q,cid,'start_repair')==200,'Reparatur begonnen')
        # ohne Datei: Hinweis „zuerst hochladen“
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="add_part"]',timeout=15000)
        q.click('button[data-act="add_part"]'); q.wait_for_selector('#af',timeout=5000)
        check(q.locator('#partfile-none').count()==1 and q.locator('#partfile').count()==0,f'{lang} {w}px: ohne Datei Hinweis statt Auswahl')
        q.click('#ac')
        up=q.evaluate(UP,[cid]); check(up['s']==201,f'Foto hochgeladen {up["s"]}'); fid=up['d']['id']
        q.reload(); q.wait_for_selector('button[data-act="add_part"]',timeout=15000)
        q.click('button[data-act="add_part"]'); q.wait_for_selector('#partfile',timeout=5000); q.wait_for_load_state('networkidle'); q.wait_for_timeout(800)
        # Nummer zuerst: der Namensvorschlag füllt sie sonst beim Verlassen des Namensfelds vor
        q.fill('#af input[name=part_number]','A 000 477 13 02'); q.fill('#af input[name=name]','Фільтр паливний'); q.select_option('#partfile',fid)
        check(q.evaluate(noscroll),f'{lang} {w}px: Teil-Formular ohne Querscrollen')
        if SHOTS: q.locator('#partfile').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teilefoto_form_{lang}_{w}.png')
        q.click('#af button.btn:not(.secondary)')
        try: q.wait_for_selector('[data-partfile]',state='attached',timeout=15000)
        except Exception:
            q.screenshot(path='/tmp/claude-0/tf_fail.png',full_page=True); print('TOAST', q.locator('.toast').all_inner_texts(), RESP, [(x['name'],x.get('file_id')) for x in q.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['parts']], fid); raise
        check('typenschild.jpg' in q.inner_text('[data-partfile]'),f'{lang} {w}px: Teileliste zeigt das Foto')
        check(q.evaluate(noscroll),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('[data-partfile]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teilefoto_liste_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: Werkstatt ohne Skriptfehler {errs[:1]}')
        ctx.close()
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('[data-partfile]',timeout=15000)
        check(m.locator('[data-partfile] a').count()==1,f'{lang} {w}px: Leitung sieht das Teilefoto')
        check(not errs,f'{lang} {w}px: Leitung ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
