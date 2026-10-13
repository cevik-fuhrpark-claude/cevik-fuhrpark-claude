# [CLAUDE] UI-Test: Zeilenhinweise der Import-Vorschauen (Prüftermine inkl. Rückruf-Zeile, Verträge, Reifengrößen; Auslesungen: falsche Datei) in der App-Sprache DE/UK/EN bei 390/820/1366 px;
# Werte aus der Datei bleiben wörtlich. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Prüftermine als Windows-1252 (wie Excel unter deutschem Windows speichert), Verträge/Reifen als UTF-8
MCSV='FIN;Art;Nächster Termin;Nachweis\nVAK656EBDG1613170;Ölxyz;2027-01-31;Beleg\n;HU;2027-01-31;Plakette\nVAK656EBDG1613170;Rückruf;2027-01-31;Schreiben 12A\n'.encode('cp1252')
TCSV=b'Quelle;Kennzeichen;FIN;Reifen Lenkachse\nListe;XX-NIE 7;WDB00000000000000;315/80 R22.5\n'
CCSV=b'Kennzeichen;Vertragsart;Vertragspartner;Vertragsbeginn\nXX-NIE 9;Leasing;Muster GmbH;2026-01-01\nSZ-YC 5514;Zauber;Muster GmbH;2026-01-01\n'
# Fristen-Übersicht der App (Export „Auslesungen“) versehentlich im Auslese-Import → klare Meldung in der App-Sprache
ACSV='\ufeffArt;Fahrer/Kennzeichen;Personalnummer;Standort;Letzte Auslesung;Spätestens fällig;Tage;Status\r\nMassenspeicher;SZ-YC 5514;;Dortmund;;;;keine Auslesung erfasst\r\n'.encode('utf-8')
AEXP={'de':'Fristen-Übersicht dieser App','uk':'огляд строків із цього застосунку','en':"this app's deadline overview"}
GAP={'de':'Lückenzeilen ohne Eintrag','uk':'Рядки-пропуски без даних','en':'Gap rows without entry'}
TEXP={'uk':'Рядок 2 · XX-NIE 7: VIN немає в реєстрі транспорту','en':'Line 2 · XX-NIE 7: VIN not in the vehicle master data','de':'Zeile 2 · XX-NIE 7: FIN nicht im Fahrzeugstamm'}
EXP={'uk':(['Невідомий вид перевірки: Ölxyz','Номерного знака немає в реєстрі транспорту','через «Імпорт відкликань»'],['Транспорт не знайдено: XX-NIE 9','Невідомий вид договору: Zauber']),
     'en':(['Unknown inspection type: Ölxyz','Licence plate not in the vehicle master data','via “Import recalls”'],['Vehicle not found: XX-NIE 9','Unknown contract type: Zauber']),
     'de':(['Prüfart unbekannt: Ölxyz','Kennzeichen nicht im Fahrzeugstamm','über „Rückrufe importieren“'],['Fahrzeug nicht gefunden: XX-NIE 9','Vertragsart unbekannt: Zauber'])}
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
    # Vorschauen sind je Person begrenzt (120/Std., Übernahmen 20/Std.): Prüftermine/Verträge als Fuhrparkleitung, Reifen (nur Inhaber) als Inhaber
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
        # Rundreise: eigener Prüftermin-Export wieder hochgeladen → Lückenzeilen getrennt und zugeklappt, keine „FIN ungültig“
        exp=q.evaluate("async()=>{const r=await fetch('/api/maintenance?format=csv');return Array.from(new Uint8Array(await r.arrayBuffer()))}")
        q.set_input_files('#mimp',{'name':'export.csv','mimeType':'text/csv','buffer':bytes(exp)}); q.wait_for_function("()=>document.querySelector('#mimpr').innerText.includes('"+GAP[lang]+"')")
        gd=q.evaluate("(t)=>{const d=[...document.querySelectorAll('#mimpr details')].find((x)=>x.querySelector('summary').innerText.startsWith(t));return d?{open:d.open,n:d.querySelectorAll('li').length}:null}",GAP[lang])
        check(gd is not None and not gd['open'] and gd['n']>0,'Prüftermin-Export: Lückenzeilen zugeklappt '+str(gd))
        check('FIN' not in q.inner_text('#mimpr') and 'VIN' not in q.inner_text('#mimpr'),'Prüftermin-Export: FIN-Schlüssel erkannt')
        if SHOTS: q.locator('#mimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/maintexp_{lang}_{w}.png')
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
        q.goto(B+'/#/tacho'); q.wait_for_selector('#timp',state='attached')
        q.set_input_files('#timp',{'name':'a.csv','mimeType':'text/csv','buffer':ACSV}); q.wait_for_selector('.toast.err')
        check(AEXP[lang] in q.inner_text('.toast.err'),'Auslesungen: '+AEXP[lang])
        if SHOTS: q.screenshot(path=f'{SHOTS}/tacho_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+';'.join(errs))
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),'kein waagrechtes Scrollen')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Import-Hinweise: alles grün')
raise SystemExit(1 if fails else 0)
