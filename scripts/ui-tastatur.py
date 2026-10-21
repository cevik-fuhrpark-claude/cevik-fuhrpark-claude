# [CLAUDE] UI-Test Tastatur/Bildschirmleser (22.10.2026): Fokus bleibt nach Kommentar senden und Filterwahl auf derselben Seite
# (nicht body), Escape schließt das Aktionsformular und gibt den Fokus an den Knopf zurück, aktive Seite mit aria-current,
# Fehlerseite mit fokussierter Überschrift und „Zur Übersicht“, Filter als Knopfgruppe mit aria-pressed, Lesezugriff ohne
# „Schaden melden“ auf „Panne & Notfall“. DE/UK/EN bei 390/820/1366 px ohne Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UNAV={'de':'Seite nicht verfügbar','uk':'Сторінка недоступна','en':'Page not available'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
AE="()=>{const e=document.activeElement; return !e||e===document.body?'body':(e.id?'#'+e.id:e.tagName.toLowerCase()+[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>'['+a.name+'='+a.value+']').join(''))}"
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kb.inhaber','display_name':'KB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    toks={}
    for un,role in [('kb.leitung','fleet'),('kb.lesen','viewer')]:
        u=api('POST','/api/users',{'username':un,'display_name':un,'role':role,'environment':'production'}); toks[un]=u['d']['invite_token']
    api('POST','/api/vehicles',{'vin':'WDB96340310778101','plate':'KB-TA 1','site':'Dortmund'})
    cs=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310778101','description':'UI-Test: Tür klemmt','priority':'mittel','driveability':'fahrbereit','request_key':'kb-1'})
    check(cs['s']==201,f'Vorgang angelegt {cs["s"]}'); cid=cs['d']['id']
    for un,tok in toks.items():
        b2=br.new_page(); b2.goto(B); b2.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}]); b2.close()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'kb.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        # aktive Seite in der Navigation
        q.goto(B+'/#/'); q.wait_for_selector('nav.tabbar a.active'); q.wait_for_timeout(400)
        check(q.get_attribute('nav.tabbar a.active','aria-current')=='page',f'{lang} {w}px: aktive Seite aria-current')
        check(q.locator('nav.tabbar a[aria-current]').count()==1,f'{lang} {w}px: genau ein aria-current')
        # Kommentar senden → Fokus nicht auf body
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#ct'); q.wait_for_timeout(300)
        q.focus('#ct'); q.keyboard.type(f'Kommentar {lang} {w}'); q.keyboard.press('Tab')
        q.wait_for_timeout(100)
        sb=q.evaluate(AE)
        if 'input' in sb or sb.startswith('label'): pass
        q.evaluate("()=>{const b=document.querySelector('#cf button.btn, #cf button:not([type=button])'); b.focus()}")
        q.keyboard.press('Enter'); q.wait_for_function("()=>document.body.innerText.includes('Kommentar')",timeout=8000); q.wait_for_timeout(1200)
        ae=q.evaluate(AE)
        check(ae!='body',f'{lang} {w}px: nach Kommentar Fokus auf {ae} (nicht body)')
        # Aktionsformular: Enter öffnet, Escape schließt, Fokus zurück
        btn=q.locator('button[data-act]').first
        if btn.count():
            act=btn.get_attribute('data-act'); btn.focus(); q.keyboard.press('Enter'); q.wait_for_selector('#af',timeout=5000)
            check(q.evaluate("()=>!!document.activeElement.closest('#af')"),f'{lang} {w}px: Fokus im Aktionsformular ({act})')
            q.keyboard.press('Escape'); q.wait_for_timeout(200)
            check(q.locator('#af').count()==0,f'{lang} {w}px: Escape schließt Aktionsformular')
            check(q.evaluate(AE)==f'button[data-act={act}]',f'{lang} {w}px: Fokus zurück auf Knopf ({q.evaluate(AE)})')
        else: check(False,f'{lang} {w}px: kein Aktionsknopf')
        # Filter per Tastatur in der Fahrzeugliste: Fokus bleibt auf dem gewählten Filter, aria-pressed
        q.goto(B+'/#/vehicles'); q.wait_for_selector('button[data-av]'); q.wait_for_timeout(300)
        f=q.locator('button[data-av]').nth(1); key=f.get_attribute('data-av'); f.focus(); q.keyboard.press('Enter'); q.wait_for_timeout(900)
        check(q.evaluate(AE).startswith(f'button[data-av={key}]'),f'{lang} {w}px: Fokus nach Filter auf {q.evaluate(AE)}')
        check(q.get_attribute(f'button[data-av="{key}"]','aria-pressed')=='true',f'{lang} {w}px: gewählter Filter aria-pressed')
        check(q.locator('[role=tab],[role=tablist]').count()==0,f'{lang} {w}px: keine Tab-Rollen')
        # Fehlerseite: unbekannter Vorgang
        q.goto(B+'/#/cases/gibt-es-nicht'); q.wait_for_selector('#errh',timeout=8000); q.wait_for_timeout(200)
        check(q.evaluate(AE)=='#errh',f'{lang} {w}px: Fehlerseite Fokus auf Überschrift')
        check(q.inner_text('#errh')==UNAV[lang],f'{lang} {w}px: Überschrift „{q.inner_text("#errh")}“')
        check(q.locator('[role=alert] a[href="#/"]').count()==1,f'{lang} {w}px: Link „Zur Übersicht“')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/tastatur_fehler_{lang}_{w}.png')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w,f'{lang} {w}px: kein Querscrollen ({sw})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        c.close()
    # Lesezugriff: „Panne & Notfall“ ohne „Schaden melden“
    c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page(); q.goto(B)
    q.evaluate(JS,['POST','/api/login',{'username':'kb.lesen','password':PW}])
    q.goto(B+'/#/emergency'); q.wait_for_selector('main h1'); q.wait_for_timeout(500)
    check(q.locator('main a[href^="#/new"]').count()==0,'Lesezugriff: kein Link „Schaden melden“ auf Panne & Notfall')
    check(q.locator('main a[href="#/help?s=accident"]').count()==1,'Lesezugriff: Hilfe „Unfall“ bleibt')
    c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Alles grün (ui-tastatur)')
raise SystemExit(1 if fails else 0)
