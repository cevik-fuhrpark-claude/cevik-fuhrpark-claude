# [CLAUDE] UI-Test: Zeilenhinweise der Import-Vorschauen (Prüftermine, Verträge, Reifengrößen) in der App-Sprache DE/UK/EN bei 390/820/1366 px;
# Werte aus der Datei bleiben wörtlich. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MCSV=b'FIN;Art;N\xc3\xa4chster Termin;Nachweis\nVAK656EBDG1613170;\xc3\x96lxyz;2027-01-31;Beleg\n;HU;2027-01-31;Plakette\n'
TCSV=b'Quelle;Kennzeichen;FIN;Reifen Lenkachse\nListe;XX-NIE 7;WDB00000000000000;315/80 R22.5\n'
CCSV=b'Kennzeichen;Vertragsart;Vertragspartner;Vertragsbeginn\nXX-NIE 9;Leasing;Muster GmbH;2026-01-01\nSZ-YC 5514;Zauber;Muster GmbH;2026-01-01\n'
TEXP={'uk':'Рядок 2 · XX-NIE 7: VIN немає в реєстрі транспорту','en':'Line 2 · XX-NIE 7: VIN not in the vehicle master data','de':'Zeile 2 · XX-NIE 7: FIN nicht im Fahrzeugstamm'}
EXP={'uk':(['Невідомий вид перевірки: Ölxyz','Номерного знака немає в реєстрі транспорту'],['Транспорт не знайдено: XX-NIE 9','Невідомий вид договору: Zauber']),
     'en':(['Unknown inspection type: Ölxyz','Licence plate not in the vehicle master data'],['Vehicle not found: XX-NIE 9','Unknown contract type: Zauber']),
     'de':(['Prüfart unbekannt: Ölxyz','Kennzeichen nicht im Fahrzeugstamm'],['Fahrzeug nicht gefunden: XX-NIE 9','Vertragsart unbekannt: Zauber'])}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'i.inhaber','display_name':'I Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'i.inhaber','password':PW})
    api('POST','/api/vehicles',{'vin':'VAK656EBDG1613170','plate':'SZ-YC 5514','site':'Dortmund'})
    # Importe sind je Person auf 20/Std. begrenzt: Prüftermine/Verträge als Fuhrparkleitung, Reifen (nur Inhaber) als Inhaber
    u=api('POST','/api/users',{'username':'i.leitung','display_name':'I Leitung','role':'fleet','environment':'production'})
    if u['s'] in (200,201): a.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); api('POST','/api/login',{'username':'i.inhaber','password':PW})
    for lang in ['uk','en','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'i.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#mimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#mimp').closest('details'); if(d) d.open=true}")
        q.set_input_files('#mimp',{'name':'p.csv','mimeType':'text/csv','buffer':MCSV}); q.wait_for_selector('#mimpr details')
        txt=q.inner_text('#mimpr')
        for e in EXP[lang][0]: check(e in txt,'Prüftermine: '+e)
        if SHOTS: q.locator('#mimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/maint_{lang}_{w}.png')
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#ctimp').closest('details'); if(d) d.open=true}")
        q.fill('#ctsrc','Leasingliste Test')
        q.set_input_files('#ctimp',{'name':'v.csv','mimeType':'text/csv','buffer':CCSV}); q.wait_for_selector('#ctimpr details')
        txt=q.inner_text('#ctimpr')
        for e in EXP[lang][1]: check(e in txt,'Verträge: '+e)
        if SHOTS: q.locator('#ctimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/vertr_{lang}_{w}.png')
        q.evaluate(JS,['POST','/api/login',{'username':'i.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#tcsv',state='attached')
        q.set_input_files('#tcsv',{'name':'r.csv','mimeType':'text/csv','buffer':TCSV}); q.wait_for_selector('#tcsvr details')
        check(TEXP[lang] in q.inner_text('#tcsvr'),'Reifen: '+TEXP[lang])
        if SHOTS: q.locator('#tcsvr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifen_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+';'.join(errs))
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),'kein waagrechtes Scrollen')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Import-Hinweise: alles grün')
raise SystemExit(1 if fails else 0)
