# [CLAUDE] UI-Test: Anmelde-Hinweis bei neuem Gerät. Anmeldung über das echte Formular (App erzeugt die Gerätekennung selbst):
# erstes Gerät still, gleiches Gerät still, zweites Gerät → Hinweis; Hinweis öffnet Mein Konto mit aufgeklappter Geräteliste;
# bekannte Geräte mit „dieses Gerät“, ein anderes Gerät vergessen; Hinweistext nach Sprachwechsel in der aktuellen Sprache.
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Neue Anmeldung auf einem anderen Gerät','uk':'Новий вхід на іншому пристрої','en':'New sign-in on another device'}
NOTYOU={'de':'Waren Sie das nicht?','uk':'Це були не ви?','en':'Not you?'}  # Text gespeichert auf Deutsch, Liste in der aktuellen Sprache
HINT={'de':'erhalten Sie einen Hinweis','uk':'ви отримаєте сповіщення','en':'you receive a notification'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def form_login(page,user):
    page.goto(B+'/#/login'); page.fill('#u',user); page.fill('#p',PW); page.click('#f button')
    page.wait_for_function("()=>!location.hash.startsWith('#/login')")
def count(page):
    return len([x for x in page.evaluate(JS,['GET','/api/notifications',None])['d']['notifications'] if x['kind']=='new_login'])
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ng.inhaber','display_name':'NG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ng.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/users',{'username':'ng.fahrer','display_name':'NG Fahrer','role':'driver','environment':'production'})
    api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}); api('POST','/api/login',{'username':'ng.inhaber','password':PW})
    d1=br.new_context(viewport={'width':390,'height':844}); p1=d1.new_page(); p1.goto(B)
    form_login(p1,'ng.fahrer'); check(count(p1)==0,'erstes Gerät: kein Hinweis')
    dev=p1.evaluate("()=>localStorage.getItem('cfp_device')"); check(bool(dev) and len(dev)==32,'Gerätekennung im Browser')
    p1.goto(B+'/#/more'); p1.wait_for_selector('#lo'); p1.wait_for_timeout(600); p1.click('#lo'); p1.wait_for_function("()=>location.hash==='#/login'")
    check(p1.evaluate("()=>localStorage.getItem('cfp_device')")==dev,'Kennung bleibt nach dem Abmelden')
    form_login(p1,'ng.fahrer'); check(count(p1)==0,'gleiches Gerät: kein Hinweis')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        form_login(q,'ng.fahrer'); n+=1
        check(count(q)==n,f'{lang} {w}px: neues Gerät → Hinweis ({n})')
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/inbox'); q.reload(); q.wait_for_selector('.row.note')
        link=q.locator('a.title',has_text=TITLE[lang]).first
        check(link.count()==1,f'{lang} {w}px: Titel „{TITLE[lang]}“')
        body=q.locator('.row.note',has=link).first.inner_text()
        check(NOTYOU[lang] in body and all(NOTYOU[o] not in body for o in NOTYOU if o!=lang),f'{lang} {w}px: Text in der aktuellen Sprache (gespeichert deutsch)')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/neugeraet_inbox_{lang}_{w}.png')
        link.click(); q.wait_for_function("()=>location.hash==='#/more?o=sess'")
        q.wait_for_function("()=>document.querySelector('#sess') && document.querySelector('#sess').open && !document.querySelector('#sesslist').innerText.includes('…') && document.querySelectorAll('#sesslist .row').length>0")
        check(HINT[lang] in q.inner_text('#sess'),f'{lang} {w}px: Geräteliste offen mit Hinweistext')
        q.wait_for_function("()=>document.querySelectorAll('#kdlist .row').length>0")
        check(q.locator('#kdlist .chip.ok').count()==1,f'{lang} {w}px: bekannte Geräte mit genau einem „dieses Gerät“')
        kd=q.locator('#kdlist [data-kd]').count(); check(kd>=1,f'{lang} {w}px: andere Geräte vergessbar ({kd})')
        if lang=='en' and w==1366:
            q.once('dialog',lambda d: d.accept()); q.locator('#kdlist [data-kd]').first.click()
            q.wait_for_function(f"()=>document.querySelectorAll('#kdlist [data-kd]').length=={kd-1}")
            check(True,'Gerät vergessen (Bestätigung, Liste neu geladen)')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/neugeraet_konto_{lang}_{w}.png')
        q.evaluate(JS,['PATCH','/api/me',{'language':'de'}]); c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles in Ordnung'); raise SystemExit(1 if fails else 0)
