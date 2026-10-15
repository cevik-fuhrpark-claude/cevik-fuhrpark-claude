# [CLAUDE] UI-Test: Archive „Hinweise zum Fahrzeug“ (Fahrzeugakte) und „Panne & Notfall – Archiv“ zeigen einen Hinweis, wenn ältere
# Einträge nicht angezeigt werden (`truncated`); ohne `truncated` kein Hinweis. Antworten werden im Browser abgefangen (100/200 Einträge
# anzulegen wäre langsam) – die Serverseite prüft test/run.mjs. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888814'; VID='VIN:'+VIN
NT={'de':'archivierten Hinweise','uk':'архівованих приміток','en':'archived notes'}
ET={'de':'archivierten Rufnummern','uk':'архівованих номерів','en':'archived numbers'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ar.inhaber','display_name':'AR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ar.inhaber','password':PW})
    api('POST','/api/vehicles',{'plate':'AR-AR 1','vin':VIN,'site':'Dortmund'})
    nid=api('POST',f'/api/vehicles/{VID}/notes',{'text':'Archivierter Hinweis'})['d']['id']; api('POST',f'/api/vehicles/{VID}/notes/{nid}/archive')
    cid=api('POST','/api/emergency/contacts',{'kind':'dispo','label':'Archiv (Test)','phone':'0123 4'})['d']['id']; api('POST',f'/api/emergency/contacts/{cid}/archive')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ar.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#vnar')
        q.locator('#vnar').click(); q.wait_for_selector('#vnotes s')
        check(q.locator('#vnartrunc').count()==0,f'{lang} {w}px: Hinweis-Archiv ohne Kürzung kein Hinweis')
        def ntrunc(route):
            r=route.fetch(); d=r.json(); d['truncated']=True; route.fulfill(response=r, body=json.dumps(d))
        q.route('**/notes?archived=1', ntrunc)
        q.locator('#vnar').click(); q.wait_for_selector('#vnar'); q.locator('#vnar').click(); q.wait_for_selector('#vnartrunc')
        hint=q.locator('#vnartrunc').inner_text(); href=q.locator('#vnartrunc a').get_attribute('href')
        check(NT[lang] in hint and '1' in hint and href.endswith('/timeline?f=note'),f'{lang} {w}px: Hinweis-Archiv mit Anzahl und Link ({href})')
        q.locator('#vnartrunc a').click(); q.wait_for_selector('[data-tl]')
        check('/timeline' in q.url,f'{lang} {w}px: Link öffnet die Zeitleiste')
        q.unroute('**/notes?archived=1')
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#vnar'); q.locator('#vnar').click(); q.route('**/notes?archived=1', ntrunc); q.locator('#vnar').click(); q.locator('#vnar').click(); q.wait_for_selector('#vnartrunc')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Akte ohne Querscrollen')
        if SHOTS: q.locator('#vnotes').screenshot(path=f'{SHOTS}/vnotes_archiv_hinweis_{lang}_{w}.png')
        q.unroute('**/notes?archived=1')
        q.goto(B+'/#/emergency/edit'); q.wait_for_selector('[data-emtab="1"]')
        q.locator('[data-emtab="1"]').click(); q.wait_for_selector('[data-emtab="1"][aria-pressed="true"]')
        check(q.locator('#emartrunc').count()==0,f'{lang} {w}px: Notfall-Archiv ohne Kürzung kein Hinweis')
        q.route('**/api/emergency/contacts?archived=1', ntrunc)
        q.locator('[data-emtab="0"]').click(); q.wait_for_selector('[data-emtab="0"][aria-pressed="true"]')
        q.locator('[data-emtab="1"]').click(); q.wait_for_selector('#emartrunc')
        eh=q.locator('#emartrunc').inner_text()
        check(ET[lang] in eh,f'{lang} {w}px: Notfall-Archiv-Hinweis ({eh[:50]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Notfall ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/notfall_archiv_hinweis_{lang}_{w}.png',full_page=True)
        q.unroute('**/api/emergency/contacts?archived=1')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
