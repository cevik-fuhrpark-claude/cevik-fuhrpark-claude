# [CLAUDE] UI-Test (17.10.2026): Fahrzeug-Import-Vorschau nennt „Baujahr nicht erkannt“ je Zeile (DE/UK/EN); Lagerbuchung doppelt abgeschickt
# (Doppelklick/Wiederholung mit demselben request_key) bucht einmal; deaktivierter Artikel zeigt kein Buchungsformular. 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VCSV=b'Kennzeichen;FIN;Baujahr\nSZ-BJ 1;WDB9630051L907701;EZ 2016\nSZ-BJ 2;WDB9630051L907702;2018\n'
EXP={'de':'Baujahr nicht erkannt („EZ 2016“)','uk':'Рік випуску не розпізнано («EZ 2016»)','en':'Year of manufacture not recognised (“EZ 2016”)'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bj.inhaber','display_name':'BJ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bj.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bj.inhaber','password':PW}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#csv',state='attached',timeout=15000)
        q.set_input_files('#csv',{'name':'f.csv','mimeType':'text/csv','buffer':VCSV}); q.wait_for_timeout(1200)
        body=q.inner_text('body'); check(EXP[lang] in body,'Vorschau nennt Baujahr: '+EXP[lang])
        if SHOTS: q.screenshot(path=f'{SHOTS}/baujahr_{lang}_{w}.png',full_page=False)
        it=q.evaluate(JS,['POST','/api/stock',{'site':site,'name':f'Doppelklick {lang} {w} {os.getpid()}','unit_price_net':5,'initial_qty':10}])['d']['id']
        q.goto(B+f'/#/stock/{it}'); q.wait_for_selector('#mf',timeout=15000)
        q.select_option('#mf [name=type]','zugang'); q.fill('#mf [name=qty]','3')
        # Netzwiederholung nachstellen: jede Buchung wird zweimal gesendet (Antwort der ersten „verloren“) – gleicher request_key → einmal gebucht
        q.evaluate("()=>{const f0=window.fetch; window.fetch=async (u,o)=>{ if(String(u).includes('/movements')&&o&&o.method==='POST'){ await f0(u,o); } return f0(u,o); };}")
        posts=[]; q.on('request',lambda r: posts.append(1) if r.method=='POST' and '/movements' in r.url else None)
        q.click('#mf button.btn'); q.wait_for_timeout(1500)
        check(len(posts)==2,'Buchung zweimal gesendet: '+str(len(posts)))
        d=q.evaluate(JS,['GET',f'/api/stock/{it}',None])['d']
        check(d['item']['on_hand']==13,'einmal gebucht (Bestand 13): '+str(d['item']['on_hand']))
        q.evaluate(JS,['PATCH',f'/api/stock/{it}',{'active':False}])
        q.goto(B+'/#/stock'); q.goto(B+f'/#/stock/{it}'); q.wait_for_selector('#itinact',timeout=15000)
        check(not q.is_visible('#mf'),'deaktiviert: kein Buchungsformular')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager_inaktiv_{lang}_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),'kein waagerechtes Scrollen')
        check(not errs,'keine JS-Fehler '+str(errs[:2]))
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('Baujahr/Lager: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
