# [CLAUDE] UI-Test Backlog 1006: Datumsformate aus Excel/Sheets in den Import-Vorschauen (Verträge, Prüftermine) – zweistellige Jahreszahl,
# TT/MM/JJJJ und Excel-Datumszahl mit eigenem Grund in der App-Sprache DE/UK/EN, Datum mit Uhrzeit übernommen; 390/820/1366 px, kein waagerechtes Scrollen.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh bzw. PORT=8788 + CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CCSV='Kennzeichen;Vertragsart;Vertragspartner;Vertragsnummer;Beginn;Ende;Nachweis\nDT-DF 1006;Leasing;L-Bank;L-1006;01.01.2026 00:00:00;2029-12-31 00:00:00;Vertrag\nDT-DF 1006;Versicherung;V-AG;V-1006;01.01.26;31.12.26;Police\nDT-DF 1006;Wartung;W-GmbH;W-1006;46023;;Vertrag\nDT-DF 1006;Miete;M-GmbH;M-1006;01/02/2026;;Vertrag\n'.encode()
MCSV='Kennzeichen;Art;Nächster Termin;Letzte Prüfung;Intervall Monate;Nachweis\nDT-DF 1006;UVV;;15.01.2026 00:00;12;UVV-Prüfbuch\nDT-DF 1006;Tacho;15.01.27;;;Bescheinigung\nDT-DF 1006;HU;11/05/2027;;;Plakette\n'.encode('cp1252')
EXP={'de':(['zweistellige Jahreszahl','Excel-Datumszahl','nicht eindeutig (Tag/Monat'],['zweistellige Jahreszahl','nicht eindeutig (Tag/Monat']),
     'uk':(['двозначний рік','числове значення дати Excel','неоднозначна (день/місяць'],['двозначний рік','неоднозначна (день/місяць']),
     'en':(['two-digit year','Excel date serial number','ambiguous (day/month'],['two-digit year','ambiguous (day/month'])}
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
    api('POST','/api/vehicles',{'vin':'WDB9634031L100601','plate':'DT-DF 1006','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'df.leitung','display_name':'DF Leitung','role':'fleet','environment':'production'})
    if u['s'] in (200,201): a.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'df.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#ctimp').closest('details'); if(d) d.open=true}")
        q.fill('#ctsrc','Leasingliste Test')
        q.set_input_files('#ctimp',{'name':'v.csv','mimeType':'text/csv','buffer':CCSV}); q.wait_for_selector('#ctimpr details')
        q.evaluate("()=>document.querySelectorAll('#ctimpr details').forEach((d)=>d.open=true)")
        txt=q.inner_text('#ctimpr')
        for e in EXP[lang][0]: check(e in txt,'Verträge: '+e)
        check('L-1006' in txt,'Verträge: Zeile mit Uhrzeit übernommen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),'Verträge: kein waagerechtes Scrollen')
        if SHOTS: q.locator('#ctimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/df_vertr_{lang}_{w}.png')
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#mimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#mimp').closest('details'); if(d) d.open=true}")
        q.set_input_files('#mimp',{'name':'p.csv','mimeType':'text/csv','buffer':MCSV}); q.wait_for_selector('#mimpr details')
        q.evaluate("()=>document.querySelectorAll('#mimpr details').forEach((d)=>d.open=true)")
        txt=q.inner_text('#mimpr')
        for e in EXP[lang][1]: check(e in txt,'Prüftermine: '+e)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),'Prüftermine: kein waagerechtes Scrollen')
        if SHOTS: q.locator('#mimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/df_maint_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        c.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
