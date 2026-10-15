# [CLAUDE] UI-Test (1) Reifenakte: Verlauf mit „+“ und Hinweis samt Link zur Zeitleiste (Reifen), wenn ältere Ereignisse nicht angezeigt werden (`history_truncated`).
# (2) Datenqualität zeigt einen Hinweis, wenn bei Listen-Prüfungen mehr als 200 Befunde vorliegen (`truncated_checks`),
# die Prüfknöpfe zeigen „200+“, der Hinweis erscheint auch im Ausdruck; ohne Kappung kein Hinweis. Die Antwort wird im Browser
# abgefangen (Serverseite prüft test/run.mjs). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Mehr als 200 Befunde','uk':'Понад 200 висновків','en':'More than 200 findings'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dq.inhaber','display_name':'DQ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'dq.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'DQ-KP 1','vin':'WDB96340310888815'}); VID='VIN:WDB96340310888815'
    api('POST',f'/api/vehicles/{VID}/tires/events',{'event_type':'messung','position':'VA-L','tread_mm':8})
    TT={'de':'Reifenereignisse','uk':'подій шин','en':'tyre events'}
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dq.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#tires details summary')
        check(q.locator('#tiretrunc').count()==0,f'{lang} {w}px: Reifenverlauf ohne Kürzung kein Hinweis')
        def ttrunc(route):
            r=route.fetch(); d=r.json(); d['history_truncated']=True; d['history_max']=200
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/tires', ttrunc)
        q.reload(); q.wait_for_load_state('networkidle'); q.wait_for_selector('#tires details summary')
        sm=q.locator('#tires details summary').last.inner_text(); q.locator('#tires details summary').last.click()
        th=q.locator('#tiretrunc').inner_text() if q.locator('#tiretrunc').count() else ''
        href=q.locator('#tiretrunc a').get_attribute('href') if th else ''
        check(sm.endswith('+)') and TT[lang] in th and href.endswith('/timeline?f=tire'),f'{lang} {w}px: Reifenverlauf „+“, Hinweis, Link ({sm!r}, {href!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Fahrzeugakte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/reifen_kappung_{lang}_{w}.png',full_page=True)
        q.unroute('**/tires')
        q.goto(B+'/#/quality'); q.wait_for_selector('[data-dq]')
        check(q.locator('#dqtrunc').count()==0 and '+)' not in q.inner_text('body'),f'{lang} {w}px: ohne Kappung kein Hinweis')
        cap={}
        def trunc(route):
            r=route.fetch(); d=r.json(); c=sorted(d['counts'])[0]; cap['c']=c; d['truncated_checks']=[c]; d['check_max']=200
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/api/admin/data-quality*', trunc)
        q.reload(); q.wait_for_load_state('networkidle'); q.wait_for_selector('#dqtrunc')
        hint=q.locator('#dqtrunc').inner_text()
        check(TXT[lang] in hint,f'{lang} {w}px: Hinweis ({hint[:70]!r})')
        btn=q.locator(f'[data-dq="{cap["c"]}"]').inner_text()
        check(btn.endswith('+)'),f'{lang} {w}px: Prüfknopf mit „+“ ({btn!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/dq_kappung_{lang}_{w}.png',full_page=True)
        q.emulate_media(media='print')
        check(q.locator('#dqtrunc').is_visible(),f'{lang} {w}px: Hinweis auch im Ausdruck')
        q.emulate_media(media='screen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print(f'{len(fails)} Fehler' if fails else 'alles in Ordnung')
raise SystemExit(1 if fails else 0)
