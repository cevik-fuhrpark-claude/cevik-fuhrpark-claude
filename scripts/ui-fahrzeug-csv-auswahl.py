# [CLAUDE] UI-Test (20.10.2026): Fahrzeugliste – CSV-Export folgt der angezeigten Auswahl (Standort, Suche), ungefiltert der ganze
# Bestand; Druckkopf nennt „ohne Standort“ in der Oberflächensprache statt des Codes „ohne“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOSITE={'de':'ohne Standort','uk':'без локації','en':'no site'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fc.inhaber','display_name':'FC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    r=api('POST','/api/login',{'username':'fc.inhaber','password':PW}); check(r['s']==200,f'Anmeldung ({r["s"]})')
    for i,(pl,site) in enumerate([('FC-HH 1','Hamburg'),('FC-HH 2','Hamburg'),('FC-OS 3',None)]):
        b={'plate':pl,'vin':f'WDB9634031077{7740+i}','kind':'lkw'}
        if site: b['site']=site
        api('POST','/api/vehicles',b)
    total=len(api('GET','/api/vehicles')['d']['vehicles'])
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fc.inhaber','password':PW}])
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl', timeout=15000)
        def csv_lines():
            with q.expect_download() as dl: q.click('#vcsv')
            return [x for x in open(dl.value.path(),encoding='utf-8-sig').read().strip().split('\n') if x]
        L=csv_lines(); check(len(L)==total+1,f'{lang} {w}px: ungefiltert ganzer Bestand ({len(L)-1}/{total})')
        q.select_option('#vsite','Hamburg'); q.wait_for_function("()=>document.querySelectorAll('#vl a').length===2", timeout=10000)
        L=csv_lines(); check(len(L)==3 and all('FC-HH' in x for x in L[1:]),f'{lang} {w}px: CSV nur Standort Hamburg ({len(L)-1})')
        q.fill('#q','FC-HH 2'); q.dispatch_event('#q','input'); q.wait_for_timeout(300)
        L=csv_lines(); check(len(L)==2 and 'FC-HH 2' in L[1],f'{lang} {w}px: CSV folgt der Suche ({len(L)-1})')
        q.fill('#q',''); q.dispatch_event('#q','input')
        q.select_option('#vsite','ohne'); q.wait_for_function("()=>document.querySelectorAll('#vl a').length===1", timeout=10000)
        head=q.evaluate("()=>(document.querySelector('#vprl')||{}).textContent||''")
        check(NOSITE[lang] in head and ' ohne' not in head.replace('ohne Standort',''),f'{lang} {w}px: Druckkopf „{NOSITE[lang]}“ ({head.strip()[:80]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/fahrzeug_csv_{lang}_{w}.png',full_page=True)
        q.select_option('#vsite',''); q.wait_for_timeout(200)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
if fails: print(f'FEHLER: {len(fails)}'); raise SystemExit(1)
print('alles grün')
