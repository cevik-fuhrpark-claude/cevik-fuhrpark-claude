# [CLAUDE] UI-Test (24.10.2026, Backlog 217, Teilagent „Fahrer im Ausland mit Panne“): „Panne & Notfall“ zeigt bei einer deutschen Nummer
# im Inlandsformat zusätzlich „aus dem Ausland: +49 …“ (Link tel:+49…), bei +49/+43 nicht; Formular „Rufnummern pflegen“ zeigt beim
# Eintippen den Hinweis Inlandsformat; Hilfe „Unfall melden“ enthält den Absatz zum Ausland.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
AB={'de':'aus dem Ausland','uk':'з-за кордону','en':'from abroad'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'au.inhaber','display_name':'AU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'au.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for b in [{'kind':'dispo','label':'Disposition Test','phone':'0231 123456','scope':'all'},{'kind':'panne','label':'Pannendienst Test','phone':'+49 800 111222','scope':'all'},{'kind':'werkstatt','label':'Werkstatt AT Test','phone':'+43 662 12345','scope':'all'}]:
        r=api('POST','/api/emergency/contacts',b); check(r['s'] in (200,201,409),'Nummer angelegt '+b['label']+' '+str(r['s']))
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'au.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/emergency'); q.wait_for_selector('#em112',timeout=15000); q.wait_for_timeout(300)
        ab=q.evaluate("[...document.querySelectorAll('.emabroad a')].map(x=>[x.getAttribute('href'),x.textContent])")
        check(ab==[['tel:+49231123456','+49 231 123456']],f'{lang}/{w}: genau ein Auslands-Zusatz (Inlandsnummer) {ab}')
        check(AB[lang] in q.inner_text('.emabroad'),f'{lang}/{w}: Beschriftung „{AB[lang]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/ausland-{lang}-{w}.png')
        q.goto(B+'/#/emergency/edit'); q.wait_for_selector('#emf',timeout=15000)
        check(q.evaluate("document.querySelector('#emnat').hidden"),f'{lang}/{w}: leeres Feld ohne Hinweis')
        q.fill('#emf input[name=phone]','(0231) 456-7'); q.wait_for_timeout(100)
        check(not q.evaluate("document.querySelector('#emnat').hidden") and '+49 231 456-7' in q.inner_text('#emnat'),f'{lang}/{w}: Hinweis Inlandsformat')
        q.fill('#emf input[name=phone]','+49 231 4567'); q.wait_for_timeout(100)
        check(q.evaluate("document.querySelector('#emnat').hidden"),f'{lang}/{w}: +49 ohne Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        if SHOTS and w==390: q.fill('#emf input[name=phone]','0231 4567'); q.wait_for_timeout(100); q.locator('#emnat').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ausland-form-{lang}.png')
        q.goto(B+'/#/help?s=accident'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check('+49' in bt and '112' in bt,f'{lang}/{w}: Hilfe mit Ausland-Absatz')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
