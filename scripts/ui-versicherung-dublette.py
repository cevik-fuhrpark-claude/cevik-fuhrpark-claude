# [CLAUDE] UI-Test (20.10.2026): Als Dublette abgelehnter Vorgang zeigt beim Versicherungsfall einen Hinweis mit Link zum Ursprungsvorgang
# statt eines Formulars, das nur mit Fehler enden kann; Ursprungsvorgang zeigt das Formular. Hinweise: „Alle gelesen“ ohne Fehler.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Als Dublette abgelehnt','uk':'Відхилено як дублікат','en':'Rejected as a duplicate'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vd.inhaber','display_name':'VD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'vd.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'DO-VD 1','vin':'WDB96340310009901','site':'Dortmund','kind':'lkw'})
    V='VIN:WDB96340310009901'
    mk=lambda d: api('POST','/api/cases',{'vehicle_id':V,'description':d,'priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':os.urandom(8).hex()})['d']['id']
    A=mk('Spiegel abgefahren'); Bc=mk('Spiegel abgefahren (doppelt)')
    ver=api('GET',f'/api/cases/{Bc}')['d']['case']['version']
    r=api('POST',f'/api/cases/{Bc}/commands',{'action':'reject','command_id':os.urandom(8).hex(),'expected_version':ver,'payload':{'duplicate_of':A},'note':'Dublette'})
    check(r['s']==200,f'Dublette abgelehnt ({r["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vd.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{Bc}'); q.wait_for_selector('h1')
        q.wait_for_timeout(300)
        body=q.inner_text('main') if q.locator('main').count() else q.inner_text('body')
        check(HINT[lang] in body,f'{lang} {w}px: Hinweis bei Dublette')
        check(q.locator('#clf').count()==0,f'{lang} {w}px: kein Formular bei Dublette')
        check(q.locator(f'a[href="#/cases/{A}"]').count()>=1,f'{lang} {w}px: Link zum Ursprungsvorgang')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/versicherung_dublette_{lang}_{w}.png',full_page=True)
        q.goto(B+f'/#/cases/{A}'); q.wait_for_selector('h1'); q.wait_for_timeout(300)
        check(q.locator('#clf').count()==1,f'{lang} {w}px: Formular im Ursprungsvorgang')
        q.goto(B+'/#/inbox'); q.wait_for_selector('h1'); q.wait_for_timeout(300)
        if q.locator('#ra').count(): q.click('#ra'); q.wait_for_timeout(400)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Versicherungsfall bei Dublette: alles grün')
raise SystemExit(1 if fails else 0)
