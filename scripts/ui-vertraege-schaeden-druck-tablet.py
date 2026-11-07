# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195, Blickwinkel „Inhaber druckt Verträge und Versicherungsfälle am Tablet“): `#/contracts` und
# `#/claims` (Reiter „Alle“) in der Druckdarstellung (A4-Breite 718 px, geöffnet am Tablet 768/1024 mit Touch und am PC 1366, DE/UK/EN):
# kein Element ragt über den Seitenrand oder wird abgeschnitten (lange Partner-/Versicherernamen, Vertrags-/Schadennummern), Druckkopf mit
# Filter, Filter/Knöpfe ausgeblendet, alle Kennzeichen im Druck, PDF wird erzeugt, keine Skriptfehler. Sonde ohne Befund – als Wächter übernommen. Dev-Server: CFP_URL. PDF: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vc.inhaber','display_name':'VC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='vc.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['bd.inhaber','kd.inhaber','wt.inhaber','tr.inhaber','tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(bool(api('GET','/api/me')['d']),'Anmeldung Inhaber')
    from datetime import date, timedelta
    d=lambda n: (date.today()+timedelta(days=n)).isoformat()
    R=os.getpid()%100000; plates=[]
    for i in range(3):
        vin=f'WDB9634VC{R:05d}{i:03d}'[:17]; pl=f'VC-DR {R%900+100+i}'; plates.append(pl)
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':['Dortmund','Bayern'][i%2]})
        r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',{'kind':['leasing','versicherung','wartung'][i],'partner':'Sehr lange Partnerbezeichnung Leasing- und Versicherungsgesellschaft mbH & Co. KG Niederlassung Süd','contract_no':f'LV-2026/000{R}-{i}-ABCDEFGHIJ','start_date':'2025-01-01','end_date':d(200+i),'evidence':'Vertrag (Test)'})
        check(r['s']==201,f'Vertrag an {pl} ({r["s"]})')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Unfall beim Rangieren (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
        r=api('PUT',f'/api/cases/{c["d"]["id"]}/claim',{'insurer':'Allgemeine Versicherungs-Aktiengesellschaft Kraftfahrt Großkunden','claim_no':f'KS-{R}-{i}-2026-0000123456','reported_on':d(-3),'evidence':'Schadenmeldung (Test)'})
        check(r['s']==200,f'Versicherungsfall an {pl} ({r["s"]})')
    views=[('contracts','#ctprt','[data-ctf="alle"], [data-cf="alle"]'),('claims','#clprt','[data-clf="alle"]')]
    for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w in [768,1024,1366]:
            ctx=br.new_context(viewport={'width':w,'height':1000},has_touch=(w<1300)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
            for name,sel,alle in views:
                tag=f'{lang} {w} #/{name}'
                q.emulate_media(media='screen'); q.set_viewport_size({'width':w,'height':1000})
                q.goto(B+'/#/'+name); q.reload(); q.wait_for_selector(sel,timeout=20000)
                if q.locator(alle).count(): q.locator(alle).first.click(); q.wait_for_timeout(800); q.wait_for_selector(sel,timeout=20000)
                q.wait_for_timeout(400)
                q.emulate_media(media='print'); q.evaluate("()=>dispatchEvent(new Event('beforeprint'))"); q.set_viewport_size({'width':718,'height':1000}); q.wait_for_timeout(300)
                o=q.evaluate(OVF); check(not o,f'{tag}: Druck ohne Überstand/Abschneiden {o}')
                check(q.evaluate(VIS,'main button')==0 and q.evaluate(VIS,'main select')==0,f'{tag}: Filter und Knöpfe im Druck ausgeblendet')
                ph=q.evaluate(HEAD); check(':' in ph.split('·',1)[-1],f'{tag}: Druckkopf mit Filter ({ph[:110]})')
                txt=q.inner_text('main'); miss=[pl for pl in plates if pl not in txt]; check(not miss,f'{tag}: alle Kennzeichen im Druck {miss}')
                if SHOTS: q.pdf(path=f'{SHOTS}/{name}-{lang}-{w}.pdf',format='A4')
                else: q.pdf(format='A4')
            check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
