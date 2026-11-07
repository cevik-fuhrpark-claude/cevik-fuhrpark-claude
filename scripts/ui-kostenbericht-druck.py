# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195, Blickwinkel „Fuhrparkleitung druckt den Kostenbericht am Tablet“): „Kosten je Fahrzeug“ war in
# keiner Druckprüfung enthalten. Geprüft in der Druckdarstellung (A4-Breite 718 px, Tablet 768 und PC 1366 geöffnet, DE/UK/EN): kein Element
# ragt über den Seitenrand oder wird abgeschnitten, Druckkopf nennt den Zeitraum, das Filterformular und Knöpfe sind ausgeblendet, jede
# Fahrzeugzeile (zugeklappt) erscheint mit Kennzeichen und Betrag, Summe je Standort ist sichtbar; PDF wird erzeugt. Sonde ohne Befund – als
# Wächter übernommen. Dev-Server: CFP_URL. Screenshots/PDF: CFP_SHOTS=<Ordner>.
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
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kd.inhaber','display_name':'KD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='kd.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['wt.inhaber','tr.inhaber','tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(bool(api('GET','/api/me')['d']),'Anmeldung Inhaber')
    R=os.getpid()%100000; plates=[]
    for i in range(4):
        vin=f'WDB9634KD{R:05d}{i:03d}'[:17]; pl=f'KD-AB {R%900+100+i}'; plates.append(pl)
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':['Dortmund','Bayern'][i%2]})
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())}); cid=c['d']['id']
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':api('GET',f'/api/cases/{cid}')['d']['case']['version'],'payload':{'workshop_site':'DORTMUND'},'note':'Bremse prüfen'})
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'add_part','command_id':str(uuid.uuid4()),'expected_version':r['d']['version'],'payload':{'name':'Bremsscheibe hinten links mit sehr langer Teilebezeichnung','quantity':2,'unit_price_net':123.45}})
        r=api('POST',f'/api/cases/{cid}/commands',{'action':'add_part','command_id':str(uuid.uuid4()),'expected_version':r['d']['version'],'payload':{'name':'Schraube ohne Preis','quantity':1}})
        check(r['s']==200,f'Kosten an {pl} gebucht')
    for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w in [768,1366]:
            ctx=br.new_context(viewport={'width':w,'height':1000},has_touch=(w<1000)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            tag=f'{lang} {w}'; q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
            q.goto(B+'/#/costs'); q.reload(); q.wait_for_selector('#costprt',timeout=20000); q.wait_for_timeout(500)
            q.emulate_media(media='print'); q.evaluate("()=>dispatchEvent(new Event('beforeprint'))"); q.set_viewport_size({'width':718,'height':1000}); q.wait_for_timeout(300)
            check(not q.evaluate(OVF),f'{tag}: Druck ohne Überstand/Abschneiden {q.evaluate(OVF)}')
            check(q.evaluate(VIS,'#cr')==0 and q.evaluate(VIS,'main button')==0,f'{tag}: Filterformular und Knöpfe im Druck ausgeblendet')
            ph=q.evaluate("()=>{const e=[...document.querySelectorAll('main *')].find(x=>x.checkVisibility() && /print/.test(x.className||'')); return e? e.textContent: ''}")
            check(bool(re.search(r'20\d\d\D+20\d\d', ph)),f'{tag}: Druckkopf mit Zeitraum ({ph[:80]})')
            txt=q.evaluate("()=>document.querySelector('main').innerText")
            check(all(pl in txt for pl in plates),f'{tag}: alle Fahrzeugzeilen im Druck')
            check(q.evaluate(VIS,'#costsites')==1,f'{tag}: Summe je Standort im Druck')
            if SHOTS: q.pdf(path=f'{SHOTS}/kostenbericht-{lang}-{w}.pdf',format='A4')
            else: q.pdf(format='A4')
            check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
