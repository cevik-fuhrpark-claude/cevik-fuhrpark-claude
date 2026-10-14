# [CLAUDE] UI-Test: Hilfe „Benutzer, Zugänge & Protokoll“. Benutzer und Protokoll zeigen „Hilfe zu dieser Seite“ → Abschnitt help-access,
# Inhaber und Fuhrparkleitung sehen ihn (Fahrer nicht), Hilfe-Suche findet ihn. DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Benutzer, Zugänge & Protokoll','uk':'Користувачі, доступи та журнал','en':'Users, access & audit log'}
SEARCH={'de':'Sperre aufheben','uk':'Розблокувати','en':'End all sign-ins'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hz.inhaber','display_name':'HZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for un,role in [('hz.leitung','fleet'),('hz.fahrer','driver')]:
        r=api('POST','/api/users',{'username':un,'display_name':un,'role':role,'environment':'production'})
        api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW})
    for un in ['hz.inhaber','hz.leitung','hz.fahrer']:
        api('POST','/api/login',{'username':un,'password':PW}); api('PATCH','/api/me',{'language':'de'})
    for lang in ['de','uk','en']:
      for un in ['hz.inhaber','hz.leitung','hz.fahrer']:
        api('POST','/api/login',{'username':un,'password':PW}); api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'hz.inhaber','password':PW}])
        for route in ['users','audit']:
            q.goto(B+'/#/'+route); q.wait_for_selector('a[href="#/help?s=access"]')
            q.click('a[href="#/help?s=access"]'); q.wait_for_selector('#help-access')
            check(TITLE[lang] in q.inner_text('#help-access h2'),f'{lang} {w}px {route}: Seitenhilfe öffnet Abschnitt')
            check(q.locator('#help-access li').count()==8,f'{lang} {w}px {route}: 8 Schritte')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/hilfe_zugang_{lang}_{w}.png',full_page=False)
        q.goto(B+'/#/help'); q.wait_for_selector('#hq'); q.fill('#hq',SEARCH[lang]); q.wait_for_timeout(400)
        check(q.locator('#help-access').is_visible(),f'{lang} {w}px: Suche „{SEARCH[lang]}“ findet Abschnitt')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
      for un,see in [('hz.leitung',True),('hz.fahrer',False)]:
        c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page()
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        q.goto(B+'/#/help'); q.wait_for_selector('#hq')
        check((q.locator('#help-access').count()==1)==see,f'{lang} {un}: Abschnitt {"sichtbar" if see else "nicht vorhanden"}')
        if see:
            q.goto(B+'/#/users'); q.wait_for_selector('a[href="#/help?s=access"]'); check(True,f'{lang} {un}: Seitenhilfe auf Benutzer')
        c.close()
    br.close()
if fails: print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('Hilfe Zugänge: alles grün')
