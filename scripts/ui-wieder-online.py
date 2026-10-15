# [CLAUDE] UI-Test: App im Funkloch gestartet (Offline-Start mit gespeichertem Konto), Netz kommt zurück („online“).
# Mit Eingaben (halb ausgefüllte Schadensmeldung) wird die Seite NICHT neu aufgebaut, die Sitzung aber im Hintergrund aufgefrischt
# (früher: route() → Eingaben weg). Ohne Eingaben wird die Seite wie bisher neu aufgebaut. Funkloch per abgebrochenen API-Aufrufen.
# 390/820/1366 px, keine Skriptfehler.
import os
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wo.inhaber','display_name':'WO Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'wo.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'WO-WO 1','vin':'WDB96340310999920','site':'Dortmund'})
    for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wo.inhaber','password':PW}])
        q.goto(B+'/#/new'); q.wait_for_selector('#d')   # online: Konto + Fahrzeuge werden für Offline gespeichert
        calls=[]
        q.on('request', lambda r: calls.append(r.url.split('8787')[-1]) if '/api/' in r.url else None)
        loch=lambda route: route.abort()
        q.route('**/api/**', loch)
        q.reload(); q.wait_for_selector('#d')
        check(q.locator('input[name=veh]').count()>=1,f'{w}px: Offline-Start zeigt Meldeformular aus dem Zwischenspeicher')
        q.locator('#d').fill('Spiegel rechts lose, im Funkloch erfasst')
        q.unroute('**/api/**', loch); calls.clear()
        q.evaluate("()=>{ document.querySelector('#d').dataset.alt='1'; window.dispatchEvent(new Event('online')); }")
        q.wait_for_function("()=>performance.getEntriesByType('resource').some((e)=>e.name.endsWith('/api/meta'))")
        q.wait_for_timeout(300)
        check(q.locator('#d').input_value()=='Spiegel rechts lose, im Funkloch erfasst' and q.locator('#d').get_attribute('data-alt')=='1',f'{w}px: Eingabe bleibt erhalten, kein Neuaufbau')
        check('/api/me' in calls and '/api/meta' in calls,f'{w}px: Sitzung im Hintergrund aufgefrischt {calls}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/wieder_online_{w}.png')
        # ohne Eingaben: Neuaufbau wie bisher
        q.route('**/api/**', loch); q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#main')
        q.unroute('**/api/**', loch)
        q.evaluate("()=>{ document.querySelector('#main').dataset.alt='1'; window.dispatchEvent(new Event('online')); }")
        q.wait_for_function("()=>{const h=document.querySelector('#main'); return h && !h.dataset.alt}")
        check(True,f'{w}px: ohne Eingaben wird die Seite neu aufgebaut')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
