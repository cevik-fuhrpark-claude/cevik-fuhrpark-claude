# [CLAUDE] UI-Test Backlog 1011: km-Spalten im Prüftermin-Import wie das Formular („123.456 Kilometer“, „km-Stand: 160.000“, „alle 30.000 km“)
# übernommen; Meilen/Betriebsstunden mit eigenem Grund in der App-Sprache DE/UK/EN; 390/820/1366 px, kein waagerechtes Scrollen.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh bzw. PORT=8788 + CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MCSV=('Kennzeichen;Art;Fällig bei km;km bei letzter Prüfung;Intervall km;Nachweis\n'
      'DT-KM 1011;Ölwechsel;;123.456 Kilometer;alle 30.000 km;Serviceheft\n'
      'DT-KM 1011;Bremsen;km-Stand: 160.000;;;Serviceanzeige\n'
      'DT-KM 1011;Inspektion;99.000 mi;;;Serviceheft\n'
      'DT-KM 1011;Sonstiges;;4.500 Bh;30000;Serviceheft\n').encode()
EXP={'de':['ist ein Meilenstand','sind Betriebsstunden'],
     'uk':['показник у милях','мотогодини'],
     'en':['reading in miles','operating hours']}
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
    api('POST','/api/vehicles',{'vin':'WDB9634031L101101','plate':'DT-KM 1011','site':'Dortmund'})
    u=api('POST','/api/users',{'username':'km.leitung','display_name':'KM Leitung','role':'fleet','environment':'production'})
    if u['s'] in (200,201): a.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'km.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#mimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#mimp').closest('details'); if(d) d.open=true}")
        q.set_input_files('#mimp',{'name':'p.csv','mimeType':'text/csv','buffer':MCSV}); q.wait_for_selector('#mimpr details')
        q.evaluate("()=>document.querySelectorAll('#mimpr details').forEach((d)=>d.open=true)")
        txt=q.inner_text('#mimpr')
        for e in EXP[lang]: check(e in txt,'Grund: '+e)
        check('km ungültig' not in txt and 'Invalid mileage' not in txt and 'Недійсний пробіг' not in txt,'kein „km ungültig“ für Einheiten')
        check(any(x in txt for x in ['153.456','153,456','153 456','153\u00a0456','153\u202f456']) and ('160.000' in txt or '160,000' in txt or '160 000' in txt or '160\u00a0000' in txt or '160\u202f000' in txt),'Zeilen mit „Kilometer“/„km-Stand:“ übernommen (fällig 123.456 + 30.000 km, 160.000 km)')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),'kein waagerechtes Scrollen')
        if SHOTS: q.locator('#mimpr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/km1011_{lang}_{w}.png')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        c.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
