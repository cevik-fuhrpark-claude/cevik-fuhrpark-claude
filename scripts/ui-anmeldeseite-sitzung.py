# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 789, Blickwinkel „Werkstatt-Tablet mit fremder Sprache (UK) und Fotos“): (1) Zwei Tabs stehen auf der
# Anmeldeseite, in Tab A meldet sich jemand an → Tab B wechselt selbst in die App (vorher lud er neu und zeigte wegen „#/login“ wieder das Formular).
# (2) Anmeldeseite mit noch gültiger Sitzung neu geladen → Hinweis „bereits angemeldet als …“ mit „Weiter zur App“, Formular bleibt für eine andere
# Person. (3) Ohne Sitzung kein Hinweis. DE 390, UK 820, EN 1366. Dev-Server: CFP_URL (Standard Port 8787).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LOC={'de':'de-DE','uk':'uk-UA','en':'en-GB'}
NOTE={'de':'bereits als','uk':'вже увійшли як','en':'already signed in'}
GO={'de':'Weiter zur App','uk':'Перейти до застосунку','en':'Continue to the app'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def login_ui(pg,u):
    pg.goto(B+'/#/login'); pg.wait_for_selector('#u'); pg.fill('#u',u); pg.fill('#p',PW); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:5]; ws={}
    for l in ['de','uk','en']:
        un=f'as.ws.{l}{sfx}'; u=api('POST','/api/users',{'username':un,'display_name':f'Werkstatt {l.upper()} {sfx}','role':'workshop','environment':'production','language':l,'workshop_site':'DORTMUND'})
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close(); ws[l]=un
    for lang,w,h in [('de',390,844),('uk',820,1180),('en',1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale=LOC[lang]); A=ctx.new_page(); Bt=ctx.new_page(); errs=[]
        for pg in (A,Bt): pg.on('pageerror',lambda e: errs.append(str(e)))
        Bt.goto(B+'/#/login'); Bt.wait_for_selector('#u'); Bt.wait_for_timeout(800)
        check(Bt.locator('#already').count()==0,f'{lang} {w}: ohne Sitzung kein Hinweis')
        login_ui(A,ws[lang]); Bt.wait_for_timeout(2500)
        check(Bt.evaluate('location.hash')=='#/' and Bt.locator('#u').count()==0,f'{lang} {w}: Tab B nach Anmeldung in Tab A in der App ({Bt.evaluate("location.hash")})')
        A.goto(B+'/#/login'); A.reload(); A.wait_for_selector('#already',timeout=10000)
        txt=A.inner_text('#already')
        check(NOTE[lang] in txt and f'Werkstatt {lang.upper()} {sfx}' in txt and GO[lang] in txt,f'{lang} {w}: Hinweis „bereits angemeldet“ in Kontosprache: {txt!r}')
        check(A.locator('#u').count()==1,f'{lang} {w}: Formular bleibt für eine andere Person')
        check(A.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: ohne Querscrollen')
        if SHOTS: A.screenshot(path=f'{SHOTS}/anmeldeseite-sitzung-{lang}-{w}.png')
        A.click('#alreadygo'); A.wait_for_timeout(1500)
        check(A.evaluate('location.hash')=='#/' and A.locator('#u').count()==0,f'{lang} {w}: „{GO[lang]}“ öffnet die App')
        A.goto(B+'/#/more'); A.wait_for_selector('#lo'); A.click('#lo'); A.wait_for_timeout(1500)
        A.goto(B+'/#/login'); A.reload(); A.wait_for_selector('#u'); A.wait_for_timeout(1000)
        check(A.locator('#already').count()==0,f'{lang} {w}: nach Abmelden kein Hinweis')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
