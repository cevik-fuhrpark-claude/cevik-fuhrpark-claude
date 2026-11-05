# [CLAUDE] UI-Test Backlog 1012: Reifengrößen-Import (Einstellungen, Inhaber) ohne Spalte „Reifen …“ bzw. mit der eigenen Reifen-Übersicht
# meldet den Grund in der App-Sprache DE/UK/EN (statt still „neu 0“); Quelldatei wie bisher mit Vorschau; 390/820/1366 px, kein waagerechtes Scrollen.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh bzw. PORT=8788 + CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOCOL='Kennzeichen;FIN;Lenkachse;Antriebsachse\nDT-RI 1012;WDB9634031L101201;385/65 R22.5;315/70 R22.5\n'.encode()
OVER='Kennzeichen;Fahrzeugart;Status;Größe Lenkachse;Größe Antriebsachse\nDT-RI 1012;Lkw;in Ordnung;385/65 R22.5;315/70 R22.5\n'.encode()
GOOD='Quelle;Kennzeichen;FIN;Reifen Lenkachse\nListe;DT-RI 1012;WDB9634031L101201;385/65 R22.5\n'.encode()
EXP={'de':('Keine Reifenspalte erkannt','Reifen-Übersicht dieser App'),'uk':('Стовпець шин не розпізнано','огляд шин'),'en':('No tyre column recognised','tyre overview')}
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
    api('POST','/api/vehicles',{'vin':'WDB9634031L101201','plate':'DT-RI 1012','site':'Dortmund'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'i.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#tcsv',state='attached')
        q.evaluate("()=>{let d=document.querySelector('#tcsv').closest('details'); while(d){d.open=true; d=d.parentElement&&d.parentElement.closest('details');}}")
        for name,buf,exp in [('a.csv',NOCOL,EXP[lang][0]),('b.csv',OVER,EXP[lang][1])]:
            q.evaluate("()=>document.querySelectorAll('.toast').forEach((x)=>x.remove())")
            q.set_input_files('#tcsv',{'name':name,'mimeType':'text/csv','buffer':buf})
            q.wait_for_selector('.toast.err',timeout=8000)
            txt=q.inner_text('.toast.err')
            check(exp in txt,f'{name}: Hinweis „{exp}“ ({txt[:70]})')
            if SHOTS and name=='a.csv': q.screenshot(path=f'{SHOTS}/ri1012_{lang}_{w}.png')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach((x)=>x.remove())")
        q.set_input_files('#tcsv',{'name':'c.csv','mimeType':'text/csv','buffer':GOOD})
        q.wait_for_selector('#tgo',timeout=8000)
        check(q.locator('.toast.err').count()==0,'Quelldatei: Vorschau ohne Fehler')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        c.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
