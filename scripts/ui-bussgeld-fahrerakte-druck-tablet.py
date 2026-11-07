# [CLAUDE] UI-Prüfung (07.11.2026, Backlog 195, Blickwinkel „Fuhrparkleitung druckt Bußgelder und Fahrerakte am Tablet“): `#/fines`,
# `#/fines/<id>`, `#/drivers/<id>` und `#/drivers/records` in der Druckdarstellung (A4-Breite 718 px, geöffnet am Tablet 768/1024 mit Touch
# und am PC 1366, DE/UK/EN): kein Element ragt über den Seitenrand oder wird abgeschnitten (lange Behördennamen, Aktenzeichen, Tatorte,
# Fahrernamen, Dokumenttitel), Knöpfe/Auswahlfelder ausgeblendet, Druckkopf vorhanden, Kennzeichen/Namen im Druck, PDF wird erzeugt,
# keine Skriptfehler. Befund (Backlog 1109): die Bußgeldliste (Bildschirm und Druck) nannte das Aktenzeichen der Behörde nicht – mit
# dem Ausdruck ließ sich ein eingehendes Schreiben/Telefonat nicht zuordnen; jetzt „Aktenzeichen …“ je Zeile (geprüft). Dev-Server: CFP_URL. PDF: CFP_SHOTS=<Ordner>.
import os, uuid
from datetime import datetime, timedelta, date
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bf.inhaber','display_name':'BF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner='bf.inhaber'
    if api('POST','/api/login',{'username':owner,'password':PW})['s']!=200:
        for un in ['vc.inhaber','bd.inhaber','kd.inhaber','wt.inhaber','tr.inhaber','tq.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ws.inhaber','tz.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(bool(api('GET','/api/me')['d']),'Anmeldung Inhaber')
    R=os.getpid()%100000; plates=[]; fids=[]
    AUTH='Landratsamt Musterkreis – Zentrale Bußgeldstelle für Verkehrsordnungswidrigkeiten, Sachgebiet Schwerverkehr und Gefahrgut'
    for i in range(3):
        vin=f'WDB9634BF{R:05d}{i:03d}'[:17]; pl=f'BF-DR {R%900+100+i}'; plates.append(pl)
        api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':['Dortmund','Bayern'][i%2]})
        oa=(datetime.now()-timedelta(days=10+i)).strftime('%Y-%m-%dT%H:%M')
        r=api('POST','/api/fines',{'kind':'anhoerung','authority':AUTH,'reference':f'Az.: 714.2026.{R}.{i}/BG-SCHWERVERKEHR-ABCDEFGHIJKLMNOP','offense_type':['geschwindigkeit','lenk_ruhezeit','ladung'][i],
            'offense_at':oa,'plate_in_letter':pl,'location':'BAB 3 Richtungsfahrbahn Frankfurt, Höhe Anschlussstelle Würzburg-Kist, km 312,450 Baustellenbereich',
            'response_due':(date.today()+timedelta(days=5+i)).isoformat(),'amount_eur':'128,50','note':'Anhörungsbogen per Post; Rückmeldung an die Behörde über das Sachgebiet Schwerverkehr – Fahrer laut Tourenplan noch zu klären.','request_key':str(uuid.uuid4())})
        check(r['s']==201,f'Bußgeld an {pl} ({r["s"]})'); fids.append(r['d']['id'])
    fd=api('GET',f'/api/fines/{fids[0]}')['d']; v=(fd.get('fine') or fd).get('version')
    r=api('POST',f'/api/fines/{fids[0]}/commands',{'action':'confirm_driver','expected_version':v,'payload':{'driver_name_note':'Aushilfsfahrer Konstantin-Maximilian Oberhuber-Schwarzenberger','basis':'fahrerangabe','evidence':'Angabe Tourenplan'}})
    check(r['s']==200,f'Fahrer ermittelt ({r["s"]})')
    DN=f'Oleksandra-Kateryna Wolodymyrivna Schewtschenko-Hohenberger {R}'
    dr=api('POST','/api/drivers',{'display_name':DN,'personnel_no':f'PN-2026-{R}-DORTMUND-NORD','site':'Dortmund'}); check(dr['s']==201,f'Fahrerakte ({dr["s"]})'); did=dr['d']['id']
    for kind,title,extra in [('fuehrerschein','Führerschein EU-Kartenführerschein, ausgestellt Stadt Dortmund Bürgerdienste Fahrerlaubnisbehörde',{'license_classes':'B, BE, C1, C1E, C, CE, L, AM'}),
                             ('unterweisung','Jährliche Unterweisung Ladungssicherung nach VDI 2700 und Gefahrgut nach ADR 1.3, Gruppenschulung Standort Dortmund',{}),
                             ('code95','Schlüsselzahl 95 – Weiterbildung Berufskraftfahrer Modul 1–5 (Bescheinigung der Ausbildungsstätte)',{})]:
        r=api('POST',f'/api/drivers/{did}/documents',{'kind':kind,'title':title,'issued_on':(date.today()-timedelta(days=30)).isoformat(),'valid_until':(date.today()+timedelta(days=400)).isoformat(),'evidence':'Kopie geprüft (Test)','request_key':str(uuid.uuid4()),**extra})
        check(r['s']==201,f'Nachweis {kind} ({r["s"]})')
    views=[('fines','#fprt',plates+[f'714.2026.{R}.{i}/BG-SCHWERVERKEHR' for i in range(3)]),(f'fines/{fids[0]}','#fdprt',[plates[0]]),(f'drivers/{did}','#ddprt',[DN]),('drivers/records','#drprt',[DN])]
    for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w in [768,1024,1366]:
            ctx=br.new_context(viewport={'width':w,'height':1000},has_touch=(w<1300)); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
            for name,sel,must in views:
                tag=f'{lang} {w} #/{name.split("/")[0]}{"/<id>" if "/" in name and "records" not in name else ("/records" if "records" in name else "")}'
                q.emulate_media(media='screen'); q.set_viewport_size({'width':w,'height':1000})
                q.goto(B+'/#/'+name); q.reload(); q.wait_for_selector(sel,timeout=20000); q.wait_for_timeout(500)
                q.emulate_media(media='print'); q.evaluate("()=>dispatchEvent(new Event('beforeprint'))"); q.set_viewport_size({'width':718,'height':1000}); q.wait_for_timeout(300)
                o=q.evaluate(OVF); check(not o,f'{tag}: Druck ohne Überstand/Abschneiden {o}')
                check(q.evaluate(VIS,'main button')==0 and q.evaluate(VIS,'main select')==0,f'{tag}: Knöpfe/Auswahl im Druck ausgeblendet')
                ph=q.evaluate(HEAD); check(len(ph.strip())>10,f'{tag}: Druckkopf vorhanden ({ph[:90]})')
                txt=q.inner_text('main'); miss=[m for m in must if m not in txt]; check(not miss,f'{tag}: Kennzeichen/Namen im Druck {miss}')
                fn=name.replace('/','-')[:20]
                if SHOTS: q.pdf(path=f'{SHOTS}/{fn}-{lang}-{w}.pdf',format='A4')
                else: q.pdf(format='A4')
            check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
