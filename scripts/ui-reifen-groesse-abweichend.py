# [CLAUDE] UI-Test (01.11.2026, Backlog 849, Blickwinkel „Reifendienst montiert eine andere Größe als für die Achse hinterlegt“):
# Reifen erfassen → Reifenwechsel an der Lenkachse mit anderer Größe als hinterlegt zeigt beim Tippen einen Hinweis (nicht bei gleicher Größe in
# anderer Schreibweise, nicht bei Messung, nicht nach „Übernehmen“ der hinterlegten Größe); nach dem Speichern Hinweis im Toast.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V='VIN:WMA06XZZ8RP849012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def open_form(q):
    q.goto(B+f'/#/vehicles/{V}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
    q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pa.inhaber','display_name':'PA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/vehicles',{'vin':V[4:],'plate':'PA-RG 849','site':'Dortmund','kind':'lkw'})
    check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
    check(api('POST',f'/api/vehicles/{V}/tires/specs',{'axle':'lenkachse','size':'385/65 R22.5','verified':True})['s']==200,'Größe Lenkachse hinterlegt')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        open_form(q)
        q.select_option('#tf select[name="event_type"]','wechsel'); q.select_option('#tf select[name="position"]','VA-L')
        q.fill('#tf input[name="size"]','385/65r22.5'); q.wait_for_timeout(50)
        check(q.locator('[data-tfsizediff]').count()==0,f'{lang}/{wd}: gleiche Größe anders geschrieben → kein Hinweis')
        q.fill('#tf input[name="size"]','315/80 R22.5'); q.wait_for_timeout(50)
        hint=q.locator('[data-tfsizediff="lenkachse"]')
        txt=hint.inner_text() if hint.count() else ''
        check(hint.count()==1 and hint.is_visible() and '385/65 R22.5' in txt and '315/80 R22.5' in txt,f'{lang}/{wd}: Hinweis {txt!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: hint.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifengroesse-{lang}-{wd}.png')
        q.select_option('#tf select[name="event_type"]','messung'); q.wait_for_timeout(50)
        check(q.locator('[data-tfsizediff]').count()==0,f'{lang}/{wd}: Messung → kein Hinweis')
        q.select_option('#tf select[name="event_type"]','wechsel'); q.wait_for_timeout(50)
        check(q.locator('[data-tfsizediff]').count()==1,f'{lang}/{wd}: zurück zu Wechsel → Hinweis')
        q.click('#tfspecgo'); q.wait_for_timeout(50)
        check(q.locator('[data-tfsizediff]').count()==0 and q.input_value('#tf input[name="size"]')=='385/65 R22.5',f'{lang}/{wd}: hinterlegte Größe übernommen → kein Hinweis')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    open_form(q)
    q.select_option('#tf select[name="event_type"]','wechsel'); q.select_option('#tf select[name="position"]','VA-R')
    q.fill('#tf input[name="size"]','315/80 R22.5')
    wm=q.locator('#tf select[name="winter_mark"]')
    if wm.count() and wm.is_visible(): wm.select_option('3pmsf')
    q.locator('#tf button.btn').last.click()
    q.wait_for_function("() => [...document.querySelectorAll('.toast, #toast')].some((x) => /weicht von der hinterlegten Größe ab/.test(x.textContent))",timeout=10000)
    check(True,'Speichern: Hinweis im Toast')
    check(not errs,f'Speichern: keine Skriptfehler {errs[:2]}')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
