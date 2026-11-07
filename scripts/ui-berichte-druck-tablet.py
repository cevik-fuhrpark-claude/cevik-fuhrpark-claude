# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195, Blickwinkel „Inhaber druckt Mängelstatistik, Kennzahlen und Werkstattauslastung am Tablet“):
# `#/defects`, `#/kpi` und `#/wsload` in der Druckdarstellung (A4-Breite 718 px, geöffnet am Tablet 768/1024 mit Touch und am PC 1366,
# DE/UK/EN): kein Element ragt über den Seitenrand oder wird abgeschnitten, Druckkopf mit Zeitraum, Filter/Knöpfe ausgeblendet,
# Datumszeitraum im Druckkopf (Backlog 1108: Mängelstatistik/Werkstattauslastung nannten nur „90 Tage“/„8 Wochen“), Daten (Kennzeichen mit Mängeln, Kennzahlen, Werkstatt-Wochen) sichtbar, PDF wird erzeugt, keine Skriptfehler.
# Dev-Server: CFP_URL. Screenshots/PDF: CFP_SHOTS=<Ordner>.
import os, re, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OVF = r"""() => { const W = document.documentElement.clientWidth; const out = [];
  for (const e of document.querySelectorAll('main *')) { const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (r.right > W + 1) out.push((e.className || e.tagName) + ' rechts ' + Math.round(r.right));
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') out.push('abgeschnitten ' + (e.className || e.tagName)); }
  return [...new Set(out)].slice(0, 8); }"""
VIS = r"""(sel) => [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility()).length"""
HEAD = r"""() => { const e = [...document.querySelectorAll('main .print-only')].find((x) => x.checkVisibility()); return e ? e.textContent : ''; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bd.inhaber','display_name':'BD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='bd.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['kd.inhaber','wt.inhaber','tr.inhaber','tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(bool(api('GET','/api/me')['d']),'Anmeldung Inhaber')
    keys=[i['key'] for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; plates=[]
    for i in range(3):
        vin=f'WDB9634BD{R:05d}{i:03d}'[:17]; pl=f'BD-DR {R%900+100+i}'; plates.append(pl)
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':['Dortmund','Bayern'][i%2]})
        items=[{'key':k,'result':'mangel' if k==keys[i] else 'ok','note':'Mangel mit etwas längerer Beschreibung für den Druck (Test)' if k==keys[i] else ''} for k in keys]
        r=api('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':'VIN:'+vin,'request_key':f'bd-{R}-{i}','items':items})
        check(r['s']==201,f'Abfahrtskontrolle mit Mangel an {pl} ({r["s"]})')
        for f in (r['d'] or {}).get('followups') or []:
            cid=f['id']; c=api('GET',f'/api/cases/{cid}')['d']['case']
            api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':c['version'],'payload':{'workshop_site':'DORTMUND'},'note':'Prüfen'})
    views=[('defects','#dd',lambda q: all(pl in q.inner_text('main') for pl in plates),'Kennzeichen mit Mängeln'),
           ('kpi','#kf2',lambda q: q.evaluate(VIS,'main .panel')>1 and '%' in q.inner_text('main'),'Kennzahl-Abschnitte'),
           ('wsload','[data-wl]',lambda q: q.evaluate(VIS,'main section.panel table')>0,'Werkstatt-Wochen')]
    for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w in [768,1024,1366]:
            ctx=br.new_context(viewport={'width':w,'height':1000},has_touch=(w<1300)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
            for name,sel,datachk,datalbl in views:
                tag=f'{lang} {w} #/{name}'
                q.emulate_media(media='screen'); q.set_viewport_size({'width':w,'height':1000})
                q.goto(B+'/#/'+name); q.reload(); q.wait_for_selector(sel,timeout=20000); q.wait_for_timeout(500)
                q.emulate_media(media='print'); q.evaluate("()=>dispatchEvent(new Event('beforeprint'))"); q.set_viewport_size({'width':718,'height':1000}); q.wait_for_timeout(300)
                o=q.evaluate(OVF); check(not o,f'{tag}: Druck ohne Überstand/Abschneiden {o}')
                check(q.evaluate(VIS,'main button')==0 and q.evaluate(VIS,'main select')==0,f'{tag}: Filter und Knöpfe im Druck ausgeblendet')
                ph=q.evaluate(HEAD); rx=r'20\d\d\D+20\d\d' if name=='kpi' else r'\d\d\D\d\d\D20\d\d\s*–\s*\d\d\D\d\d\D20\d\d'
                check(bool(re.search(rx,ph.split('·',1)[-1])),f'{tag}: Druckkopf mit Zeitraum ({ph[:110]})')
                check(datachk(q),f'{tag}: {datalbl} im Druck')
                if SHOTS: q.pdf(path=f'{SHOTS}/bericht-{name}-{lang}-{w}.pdf',format='A4')
                else: q.pdf(format='A4')
            check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
