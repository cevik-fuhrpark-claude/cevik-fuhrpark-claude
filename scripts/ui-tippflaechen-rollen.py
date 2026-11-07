# [CLAUDE] UI-Test (07.11.2026, Backlog 1106, Folge aus 1104/1105 – Werkstatt, Inhaber, Fuhrparkleitung, Fahrer, Lesezugriff am Tablet):
# Rundgang je Rolle über Startseite, „Mehr“ und alle dort verlinkten Seiten sowie Vorgang und Fahrzeugakte (1024×768 mit Touch). Jedes sichtbare
# Tippziel (Links, Knöpfe, Aufklapper, Ankreuzfelder samt Beschriftung, Auswahlfelder) in Inhalt, Kopf und Navigation muss ≥ 44 px hoch sein.
# Vorher u. a.: Aufklapper 40 px, Vorgangsnummern in Tabellen 27 px, Kennzeichen im Vorgang 24 px, „Protokoll“-Knopf der Benutzerliste 26 px
# (auch mit Maus ohne Innenabstand), Protokoll-Ziele 17 px, Abfahrtskontrolle „Papiervordruck“/„Schaden melden ›“ 17 px, Fahrer „Hilfe ›“ 20 px.
# Mit Maus (1366) bleiben Aufklapper/Tabellen-Links klein (24–40 px), Knöpfe in Tabellen haben wieder Knopfgröße (≥ 44 px).
# DE für alle Rollen, UK/EN für Werkstatt und Inhaber, Handy 390 (Touch) für Werkstatt; ohne Querscrollen/Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SMALL = """() => { const out = []; for (const e of document.querySelectorAll('main a[href], main button, main [role=button], main summary, main input[type=checkbox], main input[type=radio], main select, header a, header button, nav a, nav button')) {
  if (!e.offsetParent) continue; const r = e.getBoundingClientRect(); if (r.height < 1) continue;
  let h = r.height; const lab = e.closest('label'); if (lab && (e.type === 'checkbox' || e.type === 'radio')) h = Math.max(h, lab.getBoundingClientRect().height);
  if (h < 44) out.push(Math.round(h) + 'px ' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' „' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40).replace(/\\n/g, ' ') + '“'); }
  return [...new Set(out)]; }"""
H = """(sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height))"""
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
    R=os.getpid()%100000
    vins=[f'WDB9634{R:05d}{i:05d}'[:17] for i in range(3)]
    for i,vin in enumerate(vins): api('POST','/api/vehicles',{'vin':vin,'plate':f'TR-AB {R%1000}{i}','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vins[0],'description':'Spiegel locker (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(c['s'] in (200,201),f'Meldung angelegt {c}'); cid=c['d']['id']
    v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':v,'payload':{'workshop_site':'DORTMUND'},'note':'Spiegel befestigen'})['s']==200,'Reparatur freigegeben')
    users={'owner':owner}
    for role in ['workshop','fleet','driver','viewer']:
        un=f'tr.{role}{R}'; body={'username':un,'display_name':'TR '+role,'role':role,'environment':envn}
        if role=='workshop': body['workshop_site']='DORTMUND'
        u=api('POST','/api/users',body); check(u['s'] in (200,201),f'Konto {role}')
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        users[role]=un
    runs=[(r,'de',1024,768) for r in ['workshop','owner','fleet','driver','viewer']]+[('workshop','uk',1024,768),('owner','en',1024,768),('workshop','en',390,844),('owner','uk',390,844)]
    for role,lang,w,h in runs:
        ctx=br.new_context(viewport={'width':w,'height':h},has_touch=True); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        tag=f'{role} {lang} {w}px Touch'
        q.goto(B); check(q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW}])['s']==200,f'{tag}: Anmeldung')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        seen=set(); todo=['#/','#/more',f'#/cases/{cid}','#/v/VIN:'+vins[0]]
        while todo and len(seen)<45:
            hh=todo.pop(0)
            if hh in seen: continue
            seen.add(hh)
            q.goto(B+'/'+hh); q.reload(); q.wait_for_timeout(1300)
            sm=q.evaluate(SMALL)
            check(not sm,f'{tag} {hh}: alle Tippziele ≥ 44 px {sm}')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag} {hh}: ohne Querscrollen')
            if SHOTS and hh in ('#/','#/more','#/users','#/stock','#/master') : q.screenshot(path=f"{SHOTS}/tipp_{role}_{lang}_{w}_{hh.strip('#/').replace('/','_') or 'start'}.png")
            if hh in ('#/','#/more'):
                for l in q.evaluate("()=>[...document.querySelectorAll('main a[href^=\"#/\"], nav a[href^=\"#/\"]')].map(e=>e.getAttribute('href'))"):
                    l=l.split('?')[0]
                    if l not in seen and l not in todo and not l.startswith('#/help') and not l.startswith('#/cases/') and l!='#/logout': todo.append(l)
        check(len(seen)>=(10 if role in ('driver','viewer') else 14),f'{tag}: {len(seen)} Seiten geprüft')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    # Maus: Aufklapper und Tabellen-Links bleiben klein, Knopf „Protokoll“ in der Benutzerliste hat wieder Knopfgröße
    for lang in ['de','uk']:
        ctx=br.new_context(viewport={'width':1366,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/users'); q.reload(); q.wait_for_selector('a.btn.secondary[href^="#/audit?u="]',timeout=15000); q.wait_for_timeout(400)
        bh=q.evaluate(H,'a.btn.secondary[href^="#/audit?u="]')
        check(bh and min(bh)>=44,f'{lang} 1366 Maus: „Protokoll“-Knopf in der Benutzerliste {bh}')
        pad=q.evaluate("()=>getComputedStyle(document.querySelector('a.btn.secondary[href^=\"#/audit?u=\"]')).paddingLeft")
        check(pad!='0px',f'{lang} 1366 Maus: Knopf mit Innenabstand ({pad})')
        sh=q.evaluate(H,'main details > summary')
        check(sh and max(sh)<44,f'{lang} 1366 Maus: Aufklapper unverändert {sh}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/tipp_users_maus_{lang}.png')
        q.goto(B+'/#/master'); q.reload(); q.wait_for_selector('td > a[href^="#/cases/"]',timeout=15000); q.wait_for_timeout(400)
        th=q.evaluate(H,'td > a[href^="#/cases/"]')
        check(th and min(th)>=24 and max(th)<44,f'{lang} 1366 Maus: Vorgangsnummern in Tabellen {th}')
        check(not errs,f'{lang} 1366 Maus: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
