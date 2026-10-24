# [CLAUDE] UI-Test (24.10.2026, Backlog 225, Teilagent „Fahrer wechselt sein Handy“): (a) „Mein Konto → Meine Anmeldungen“ zeigt bei einem
# Push-Gerät ohne aktive Anmeldung (Antwort des Servers per Playwright-Route nachgestellt – Ablauf der Sitzung braucht sonst Wartezeit; Serverlogik
# prüft Test 590) den Hinweis und „Alle anderen Geräte abmelden“, auch wenn nur dieses Gerät angemeldet ist; (b) die Kontosprache bleibt nach
# Abmeldung und Neustart auf der Anmeldeseite (Gerät auf Deutsch, Konto Ukrainisch); Werkstatt-Konten setzen sie nicht (geteilte Tablets).
# (c) Backlog 227: Fahrer-Startseite zeigt „Push einschalten“, bis aktiviert oder ausgeblendet. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OTHERS={'de':'Alle anderen Geräte abmelden','uk':'Вийти на всіх інших пристроях','en':'Sign out all other devices'}
LOGIN={'de':'Anmelden','uk':'Увійти','en':'Sign in'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=uuid.uuid4().hex[:4]
    def mkuser(role,name,**kw):
        u=api('POST','/api/users',{'username':name,'display_name':name,'role':role,'environment':'production',**kw})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    drv='hw.fahrer.'+tag; ws='hw.werkstatt.'+tag
    mkuser('driver',drv); mkuser('workshop',ws,workshop_site='DORTMUND')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        def fake(route):
            r=route.fetch(); d=r.json(); d['orphan_push_devices']=1; route.fulfill(response=r,body=json.dumps(d))
        q.route('**/api/me/sessions',fake)
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':drv,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("localStorage.removeItem('cfp_lang')")
        q.goto(B+'/#/more'); q.reload(); q.wait_for_selector('#sess',timeout=15000)
        q.evaluate("document.querySelector('#sess').open=true; document.querySelector('#sess').dispatchEvent(new Event('toggle'))")
        q.wait_for_selector('#sessorphan',timeout=8000)
        check(q.locator('#sessall').count()==1 and q.locator('#sessall').inner_text().strip()==OTHERS[lang],f'{lang}/{w}: Hinweis + Knopf „{OTHERS[lang]}“ bei nur diesem Gerät')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#sess').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/handywechsel-{lang}-{w}.png')
        check(q.evaluate("localStorage.getItem('cfp_lang')")==lang,f'{lang}/{w}: Kontosprache gemerkt')
        # Abmeldung ohne Seite (z. B. Leerlauf) + Neustart → Anmeldeseite in Kontosprache
        q.evaluate(JS,['POST','/api/logout',None]); q.goto(B+'/'); q.wait_for_selector('#login, form',timeout=15000); q.wait_for_timeout(500)
        check(q.evaluate('document.documentElement.lang')==lang,f'{lang}/{w}: Anmeldeseite nach Neustart in Kontosprache ({q.evaluate("document.documentElement.lang")})')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # Backlog 227: Fahrer-Startseite zeigt einmal „Push einschalten“, ausblendbar
    # Headless-Chromium meldet immer „denied“ (dann bewusst kein Hinweis) – hier „noch nicht gefragt“ nachstellen
    for lang,(w,h) in [(l,(390,844)) for l in ['de','uk','en']]+[('de',(1366,900))]:
        ctx=br.new_context(viewport={'width':w,'height':h}); ctx.add_init_script("Object.defineProperty(Notification, 'permission', { get: () => 'default' })"); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':drv,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#pushnudge:not([hidden]) #pushnudgeoff',timeout=15000)
        check(q.locator('#pushnudge #pe').count()==1,f'{lang}/{w}: Startseite – Knopf „Aktivieren“ im Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Startseite ohne Querscrollen')
        if SHOTS: q.locator('#pushnudge').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pushhinweis-{lang}-{w}.png')
        q.click('#pushnudgeoff'); check(q.locator('#pushnudge').count()==0,f'{lang}/{w}: ausgeblendet')
        q.reload(); q.wait_for_selector('a[href="#/new"]',timeout=15000); q.wait_for_timeout(800)
        check(q.locator('#pushnudge:not([hidden])').count()==0,f'{lang}/{w}: bleibt nach Neuladen ausgeblendet')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # verweigerte Berechtigung: kein Hinweis
    ctx=br.new_context(); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':drv,'password':PW}])
    q.goto(B+'/#/'); q.reload(); q.wait_for_selector('a[href="#/new"]',timeout=15000); q.wait_for_timeout(1000)
    check(q.evaluate('Notification.permission')=='denied' and q.locator('#pushnudge:not([hidden])').count()==0,'verweigerte Berechtigung: kein Hinweis')
    ctx.close()
    # Werkstatt (geteiltes Tablet): Kontosprache wird nicht gemerkt
    ctx=br.new_context(locale='de-DE'); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':ws,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'uk'}])
    q.evaluate("localStorage.removeItem('cfp_lang')"); q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(1500)
    check(q.evaluate("localStorage.getItem('cfp_lang')") is None,'Werkstatt: Kontosprache nicht für die Anmeldeseite gemerkt')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
