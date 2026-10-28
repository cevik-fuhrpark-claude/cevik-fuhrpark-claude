# [CLAUDE] UI-Test Sprachpakete (Backlog 588, 28.10.2026): Die App lädt beim Start nur i18n-core.js und das Paket der eigenen
# Sprache (nicht i18n.js, nicht die anderen Pakete); Sprachwechsel auf der Anmeldeseite lädt das neue Paket nach und zeigt die Texte;
# nach der Anmeldung gilt die Kontosprache; Fahrer-Aushang in einer anderen Sprache (#/guide?l=…) lädt deren Paket.
# 390/820/1366 px. Dev-Server: CFP_URL (Standard Port 8787). Screenshots: CFP_SHOTS.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR = "async (l) => { const { STRINGS } = await import('/i18n.js'); return STRINGS[l]; }"
LOC={'de':'de-DE','uk':'uk-UA','en':'en-GB'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sp.inhaber','display_name':'SP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sp.inhaber' if api('POST','/api/login',{'username':'sp.inhaber','password':PW})['s']==200 else None
    if not user:
        # Server schon eingerichtet: eigenes Konto der Fuhrparkleitung über ein vorhandenes Inhaberkonto ist hier nicht bekannt → nur Anmeldeseite prüfen
        print('Hinweis: Server nicht frisch – Teil nach der Anmeldung entfällt')
    T={l: a.evaluate(TR,l) for l in ['de','uk','en']}
    for lang,w,h,other in [('uk',390,844,'en'),('de',820,1180,'uk'),('en',1366,900,'de')]:
        c=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang],service_workers='block'); q=c.new_page(); errs=[]; req=[]
        q.on('pageerror',lambda e: errs.append(str(e))); q.on('request',lambda r: req.append(r.url.split('?')[0].replace(B,'')))
        q.goto(B+'/#/login'); q.wait_for_selector('#lang',timeout=20000)
        packs=sorted(x for x in req if x.startswith('/i18n'))
        check(packs==sorted(['/i18n-core.js','/i18n-'+lang+'.js']), f'{lang} {w}: Start lädt nur Kern + eigenes Paket {packs}')
        check(T[lang]['login'] in q.inner_text('body'), f'{lang} {w}: Anmeldeseite in der Gerätesprache')
        q.select_option('#lang',other); q.wait_for_function("(l)=>document.documentElement.lang===l",arg=other,timeout=20000)
        q.wait_for_timeout(300)
        check(T[other]['login'] in q.inner_text('body') and ('/i18n-'+other+'.js') in req, f'{lang} {w}: Sprachwechsel → {other} nachgeladen und angezeigt')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), f'{lang} {w}: kein waagerechtes Scrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sprachpakete_login_{other}_{w}.png')
        q.select_option('#lang',lang); q.wait_for_function("(l)=>document.documentElement.lang===l",arg=lang,timeout=20000)
        if user:
            q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':other}])
            c.close(); c=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang],service_workers='block')
            c.add_cookies(a.context.cookies()); q=c.new_page(); req=[]; q.on('pageerror',lambda e: errs.append(str(e))); q.on('request',lambda r: req.append(r.url.split('?')[0].replace(B,'')))
            q.goto(B+'/#/'); q.wait_for_function("(l)=>document.documentElement.lang===l && document.querySelector('nav.tabbar')",arg=other,timeout=20000); q.wait_for_timeout(500)
            check(T[other]['nav_more'] in q.inner_text('nav.tabbar'), f'{lang} {w}: nach Anmeldung Kontosprache {other}')
            third=[l for l in ['de','uk','en'] if l not in (lang,other)][0]
            q.goto(B+'/#/guide?l='+third); q.wait_for_selector('article.guide[lang="'+third+'"]',timeout=20000)
            check(T[third]['g_title'] in q.inner_text('article.guide') and ('/i18n-'+third+'.js') in req, f'{lang} {w}: Aushang {third} lädt dessen Paket')
            if SHOTS: q.screenshot(path=f'{SHOTS}/sprachpakete_aushang_{third}_{w}.png')
            q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        check('/i18n.js' not in req and not errs, f'{lang} {w}: kein i18n.js, keine Skriptfehler {errs}')
        c.close()
    br.close()
print('Sprachpakete: '+('alles grün' if not fails else 'FEHLER: '+' | '.join(fails)))
raise SystemExit(1 if fails else 0)
