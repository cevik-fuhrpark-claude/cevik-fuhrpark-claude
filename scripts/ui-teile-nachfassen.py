# [CLAUDE] UI-Test (27.10.2026, Backlog 446, Blickwinkel „Werkstatt-Tablet: Auftrag wartet seit 3 Wochen auf Teile – wer fasst nach?“):
# Werkstatt-Startseite „Wartet auf Teile“: längste Wartezeit zuerst, je Zeile „Wartet auf: …“, „Wartezeit: 21 Tage“ und
# „kein Liefertermin angegeben“ (nur ohne Termin); Vorgangsliste zeigt dasselbe. Das Alter wird über die Antwort von
# GET /api/cases (status_since) vorgetäuscht – der Server rechnet nichts davon. DE/UK/EN bei 390/820/1366 px, kein Querscrollen,
# keine Skriptfehler. Backlog 447: „Heute zu tun“ der Leitung nennt bei „Warten auf Teile“ Wartezeit, „kein Liefertermin“ und Werkstatt.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, json, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LANE={'de':'Wartet auf Teile','uk':'Очікує запчастини','en':'Waiting for parts'}
WAITFOR={'de':'Wartet auf:','uk':'Очікуємо:','en':'Waiting for:'}
DAYS={'de':'Wartezeit: 21 Tage','uk':'Очікування: 21 день','en':'Waiting: 21 days'}
NOETA={'de':'kein Liefertermin angegeben','uk':'дату поставки не вказано','en':'no delivery date given'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tn.inhaber','display_name':'TN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tn.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ft.inhaber','tf.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; me_name=(me.get('user') or me).get('username') or 'tn.inhaber'; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=[0]
    def cmd(page,cid,action,payload=None,note=None):
        n[0]+=1; v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'tn-{action}-{R}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    ids={}
    for k,desc in [('A','Luftfederbalg hinten undicht (Test Nachfassen)'),('B','Bremsschlauch scheuert (Test Nachfassen)')]:
        pl=f'TN-{k} {R%9000}'; vin=f'WDB98{R:05d}N{k}{"0"*5}'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Fahrzeug {k}')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':desc,'priority':'mittel','driveability':'fahrbereit','request_key':f'tn-{R}-{k}'})
        check(c['s']==201,f'Vorgang {k} {c["s"]}'); ids[k]=c['d']['id']
        check(cmd(a,ids[k],'approve_repair',{'workshop_site':'DORTMUND'},'reparieren')==200,f'{k} freigegeben')
    un=f'tn.ws{R}'
    u=api('POST','/api/users',{'username':un,'display_name':'TN Werkstatt','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':'de'})
    check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
    w0=br.new_page(); w0.goto(B); w0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    w0.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
    eta=(datetime.date.today()+datetime.timedelta(days=3)).isoformat()
    for k in 'AB': check(cmd(w0,ids[k],'start_repair')==200,f'{k} in Reparatur')
    # B zuerst auf „wartet“ gesetzt (Server-Reihenfolge), A bekommt in der Antwort ein drei Wochen altes „seit“ → muss oben stehen
    check(cmd(w0,ids['B'],'wait_parts',{'parts_expected_date':eta},'Bremsschlauch vorne links')==200,'B wartet (mit Liefertermin)')
    check(cmd(w0,ids['A'],'wait_parts',{},'Luftfederbalg hinten – bestellt bei Teile Nord')==200,'A wartet (ohne Liefertermin)')
    old=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=21)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    def fake(route):
        # Seite kann beim Schließen noch eine Anfrage offen haben („Response has been disposed“, 27.10.2026 in pruefen.sh) – dann nichts tun
        try:
            r=route.fetch(); d=r.json()
            for c in d.get('cases',[]):
                if c['id']==ids['A']: c['status_since']=old
            route.fulfill(response=r, body=json.dumps(d))
        except Exception:
            pass
    for lang in ['de','uk','en']:
      w0.evaluate(JS,['PATCH','/api/me',{'language':lang}])
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.route('**/api/cases?status=open*',fake)
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.goto(B+'/#/'); q.reload()
        q.wait_for_selector('h2', timeout=15000)
        q.wait_for_function("(l)=>[...document.querySelectorAll('h2')].some(h=>h.textContent.trim().startsWith(l))", arg=LANE[lang], timeout=15000)
        rows=q.evaluate("""(l)=>{ const h=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim().startsWith(l)); const L=h&&h.nextElementSibling;
          const vis=(e)=>{ const s=e.closest('.sub'); if(!s) return true; const a=e.getBoundingClientRect(), b=s.getBoundingClientRect(); return a.right<=b.right+1 && a.bottom<=b.bottom+1; };
          return L ? [...L.querySelectorAll('a.row')].map(r=>({href:r.getAttribute('href'), txt:r.innerText, noeta:!!r.querySelector('[data-pwnoeta]'), shown:[...r.querySelectorAll('[data-pwnoeta],[data-pwdays],[data-pwnote]')].every(vis)})) : []; }""", LANE[lang])
        mine=[r for r in rows if r['href'] in (f'#/cases/{ids["A"]}',f'#/cases/{ids["B"]}')]
        check(len(mine)==2 and mine[0]['href']==f'#/cases/{ids["A"]}',f'{lang} {w}px: längste Wartezeit zuerst')
        if len(mine)==2:
            ra,rb=mine[0],mine[1]
            check(WAITFOR[lang] in ra['txt'] and 'Teile Nord' in ra['txt'],f'{lang} {w}px: worauf gewartet wird')
            check(DAYS[lang] in ra['txt'],f'{lang} {w}px: Wartezeit ({ra["txt"][-160:]!r})')
            check(ra['noeta'] and NOETA[lang] in ra['txt'],f'{lang} {w}px: „kein Liefertermin“ bei A')
            check(ra['shown'] and rb['shown'],f'{lang} {w}px: Angaben nicht abgeschnitten (Unterzeile umbrochen)')
            check(not rb['noeta'] and DAYS[lang] not in rb['txt'],f'{lang} {w}px: B mit Termin, ohne Wartezeit (heute)')
        check(q.evaluate(noscroll),f'{lang} {w}px: Startseite ohne Querscrollen')
        if SHOTS:
            q.evaluate("(l)=>{ const h=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim().startsWith(l)); h && h.scrollIntoView(); }", LANE[lang])
            q.screenshot(path=f'{SHOTS}/teile_nachfassen_{lang}_{w}.png')
        if w==390:
            q.goto(B+'/#/cases'); q.wait_for_selector(f'a.row[href="#/cases/{ids["A"]}"]', timeout=15000)
            t=q.inner_text(f'a.row[href="#/cases/{ids["A"]}"]')
            check(DAYS[lang] in t and NOETA[lang] in t,f'{lang}: Vorgangsliste zeigt Wartezeit/„kein Liefertermin“')
            check(q.evaluate(noscroll),f'{lang}: Vorgangsliste ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        q.unroute_all(behavior='ignoreErrors'); ctx.close()
    # Backlog 447: Leitung (Inhaber) – „Heute zu tun“ → „Warten auf Teile“
    TODO={'de':'Warten auf Teile','uk':'Очікують запчастин','en':'Waiting for parts'}
    for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w,h in [(390,844),(1366,900)]:
            ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.route('**/api/cases?status=open*',fake); q.goto(B)
            q.evaluate(JS,['POST','/api/login',{'username':me_name,'password':PW}]); q.goto(B+'/#/'); q.reload()
            q.wait_for_function("(l)=>[...document.querySelectorAll('details summary')].some(s=>s.textContent.includes(l))", arg=TODO[lang], timeout=15000)
            q.evaluate("(l)=>{ const d=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary').textContent.includes(l)); d.open=true; d.scrollIntoView(); }", TODO[lang])
            rows=q.evaluate("(l)=>{ const d=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary').textContent.includes(l)); return [...d.querySelectorAll('a.row')].map(r=>({href:r.getAttribute('href'), txt:r.innerText})); }", TODO[lang])
            ra=[r for r in rows if r['href']==f'#/cases/{ids["A"]}']; rb=[r for r in rows if r['href']==f'#/cases/{ids["B"]}']
            check(ra and DAYS[lang] in ra[0]['txt'] and NOETA[lang] in ra[0]['txt'] and 'DORTMUND' not in ra[0]['txt'],f'{lang} {w}px Leitung: Wartezeit/„kein Liefertermin“ ({ra[0]["txt"] if ra else None!r})')
            check(rb and NOETA[lang] not in rb[0]['txt'] and DAYS[lang] not in rb[0]['txt'],f'{lang} {w}px Leitung: B mit Termin')
            check(q.evaluate(noscroll),f'{lang} {w}px Leitung: ohne Querscrollen')
            if SHOTS: q.screenshot(path=f'{SHOTS}/teile_nachfassen_leitung_{lang}_{w}.png')
            check(not errs,f'{lang} {w}px Leitung: keine Skriptfehler {errs[:1]}')
            q.unroute_all(behavior='ignoreErrors'); ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
