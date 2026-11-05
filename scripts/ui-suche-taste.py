# [CLAUDE] UI-Test (05.11.2026, Backlog 1002, Blickwinkel „Fuhrparkleitung am PC, Telefon am Ohr – Kennzeichen schnell nachschlagen“):
# Taste „/“ öffnet von einer Liste die globale Suche mit Cursor im Suchfeld, in der Hilfe den Cursor im Hilfe-Suchfeld; in einem Eingabefeld
# wird „/“ normal getippt. Hinweis „Tipp am PC“ nur an Geräten mit Maus (nicht am Handy). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/
# Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KBD={'de':'Taste /','uk':'клавіша /','en':'press /'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'st.inhaber','display_name':'ST Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'st.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        tag=f'{lang}/{w}'; mobile=w<500
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h},**({'has_touch':True,'is_mobile':True} if mobile else {})); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'st.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/vehicles'); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(800); q.click('h1')
        q.keyboard.press('/'); okf=False
        for _ in range(40):  # wait_for_function nutzt eval – verbietet die CSP der App
            okf=q.evaluate("() => location.hash==='#/search' && !!document.activeElement && document.activeElement.id==='gq'")
            if okf: break
            q.wait_for_timeout(200)
        check(okf and q.evaluate("() => document.getElementById('gq').value")=='',f'{tag}: „/“ öffnet die Suche, Cursor im Suchfeld, kein „/“ eingetragen')
        hint=q.locator('#gr [data-kbd]')
        if mobile: check(hint.count()==0,f'{tag}: kein PC-Tipp am Handy')
        else: check(hint.count()==1 and KBD[lang] in hint.inner_text(),f'{tag}: PC-Tipp in der App-Sprache')
        if SHOTS: q.screenshot(path=f'{SHOTS}/suche-taste-{lang}-{w}.png')
        q.keyboard.type('SZ/'); check(q.evaluate("document.getElementById('gq').value")=='SZ/',f'{tag}: im Suchfeld wird „/“ normal getippt')
        q.goto(B+'/#/help'); q.wait_for_selector('#hq',timeout=15000); q.click('h1'); q.keyboard.press('/')
        check(q.evaluate("document.activeElement && document.activeElement.id")=='hq' and q.evaluate("location.hash").startswith('#/help'),f'{tag}: in der Hilfe springt „/“ ins Hilfe-Suchfeld')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
