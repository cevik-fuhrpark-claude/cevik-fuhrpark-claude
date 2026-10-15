# [CLAUDE] UI-Test: Zahl am Glockensymbol. Eine Push-Nachricht des Service Workers aktualisiert nur die Zahl – die Seite wird NICHT neu
# aufgebaut (früher: route() → halb ausgefüllte Schadensmeldung war leer). Beim Zurückkehren in die App wird die Zahl nachgefragt
# (höchstens alle 30 s). Antworten von /api/notifications?count=1 werden im Browser ersetzt. 390/820/1366 px, keine Skriptfehler.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gl.inhaber','display_name':'GL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'gl.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'GL-GL 1','vin':'WDB96340310999913','site':'Dortmund'})
    api('POST','/api/push/test')  # ein Hinweis, damit Filter und „Alle gelesen“ erscheinen
    for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.clock.install(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gl.inhaber','password':PW}])
        state={'n':0,'calls':0}
        def fake(route):
            state['calls']+=1; r=route.fetch(); d=r.json(); d['unread']=state['n']; route.fulfill(response=r, body=json.dumps(d))
        q.route('**/api/notifications?count=1', fake)
        q.goto(B+'/#/new'); q.wait_for_selector('textarea')
        q.locator('textarea').first.fill('Halb ausgefüllte Meldung')
        check(q.locator('.topbar .badge').count()==0,f'{w}px: ohne ungelesene keine Zahl')
        state['n']=3; before=state['calls']
        q.evaluate("()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'push'}}))")
        q.wait_for_function("()=>{const b=document.querySelector('.topbar .badge'); return b && b.textContent==='3'}")
        check(state['calls']==before+1,f'{w}px: Push fragt die Zahl nach')
        check(q.locator('textarea').first.input_value()=='Halb ausgefüllte Meldung',f'{w}px: Formular bleibt erhalten (kein Neuaufbau)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/glocke_{w}.png')
        # Zurückkehren in die App: erst nach 30 s erneut (Drosselung), dann Zahl aktualisiert
        state['n']=0; before=state['calls']
        q.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))"); q.wait_for_timeout(300)
        check(state['calls']==before,f'{w}px: innerhalb 30 s keine weitere Abfrage')
        q.clock.fast_forward(31000); q.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
        q.wait_for_function("()=>!document.querySelector('.topbar .badge')")
        check(state['calls']==before+1,f'{w}px: beim Zurückkehren nachgefragt, Zahl entfernt')
        check(q.locator('textarea').first.input_value()=='Halb ausgefüllte Meldung',f'{w}px: Formular weiter erhalten')
        # in den Hinweisen: Push baut die Liste neu auf
        q.goto(B+'/#/inbox'); q.wait_for_selector('#push')
        q.evaluate("()=>{ document.querySelector('#push').dataset.alt='1'; navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'push'}})); }")
        q.wait_for_function("()=>{const p=document.querySelector('#push'); return p && !p.dataset.alt}")
        check(True,f'{w}px: Hinweise werden bei Push neu geladen')
        # „Push für diese Hinweise“ aufgeklappt + Ruhezeit eingetippt: kein Neuaufbau, nur Hinweis mit Knopf
        q.locator('#np summary').click(); q.wait_for_selector('#qfrom')
        q.fill('#qfrom','22:00')
        q.evaluate("()=>{ document.querySelector('#push').dataset.alt='1'; navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'push'}})); }")
        q.wait_for_selector('#nnew')
        check(q.evaluate("()=>document.querySelector('#push').dataset.alt==='1'"),f'{w}px: bei Eingaben kein Neuaufbau')
        check(q.input_value('#qfrom')=='22:00' and q.evaluate("()=>document.querySelector('#np').open"),f'{w}px: Ruhezeit-Eingabe und aufgeklappter Bereich bleiben')
        q.evaluate("()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'push'}}))"); q.wait_for_timeout(300)
        check(q.locator('#nnew').count()==1,f'{w}px: Hinweis erscheint nur einmal')
        if SHOTS: q.screenshot(path=f'{SHOTS}/glocke_hinweis_{w}.png')
        q.click('#nnewb'); q.wait_for_function("()=>{const p=document.querySelector('#push'); return p && !p.dataset.alt && !document.querySelector('#nnew')}")
        check(True,f'{w}px: „Liste aktualisieren“ lädt neu')
        # Filterwechsel bei aufgeklapptem Bereich: bleibt offen; „Alle gelesen“ ohne Netz → Fehlermeldung statt stillem Abbruch
        if not q.evaluate("()=>document.querySelector('#np').open"): q.locator('#np summary').click()
        check(q.locator('[data-nf]').count()>0 and q.locator('#ra').count()>0,f'{w}px: Filter und „Alle gelesen“ vorhanden')
        if q.locator('[data-nf]').count():
            q.locator('[data-nf="all"]').click(); q.wait_for_timeout(400)
            check(q.evaluate("()=>document.querySelector('#np').open"),f'{w}px: Filterwechsel lässt Bereich offen')
        if q.locator('#ra').count():
            q.route('**/api/notifications/read-all', lambda r: r.abort()); q.click('#ra'); q.wait_for_selector('.toast')
            check(True,f'{w}px: „Alle gelesen“ ohne Netz zeigt Meldung'); q.unroute('**/api/notifications/read-all')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
