# [CLAUDE] UI-Test: Tippen auf einen Hinweis ohne Vorgang öffnet den Gegenstand – „Prüfung mit gefährlichen Mängeln“ → Fahrzeugakte
# (Bezug ref 'vehicle:<id>', gleiche Regel wie der Push-Klick im Service Worker). DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Prüfung mit gefährlichen Mängeln','uk':'Огляд із небезпечними дефектами','en':'Inspection with dangerous defects'}
VIN='WDB96340310654321'; PLATE='HZ-XY 77'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hz.inhaber','display_name':'HZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=me.get('active_environment') or 'test'
    r=api('POST','/api/users',{'username':'hz.leitung','display_name':'HZ Leitung','role':'fleet','environment':envn})
    if r['s'] in (200,201): api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'hz.leitung','password':PW})
    api('POST','/api/vehicles',{'vin':VIN,'plate':PLATE,'site':'Dortmund'})
    vid='VIN:'+VIN
    rule=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'UVV','last_done_date':(datetime.date.today()-datetime.timedelta(days=300)).isoformat(),'interval_months':12,'evidence':'HZ 0'})
    check(rule['s'] in (200,201),'Prüfregel angelegt '+str(rule['s']))
    done=api('POST',f"/api/maintenance/{rule['d']['id']}/complete",{'done_date':(datetime.date.today()-datetime.timedelta(days=1)).isoformat(),'evidence':'HZ 1','result':'verkehrsunsicher'})
    check(done['s']==200 and done['d'].get('notified',0)>=1,'Prüfung verkehrsunsicher erfasst → Hinweis '+str(done['d']))
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'hz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/inbox'); q.reload(); q.wait_for_selector('.row.note')
        link=q.locator('a.title',has_text=TITLE[lang]).first
        check(link.count()==1,f'{lang} {w}px: Hinweis „{TITLE[lang]}“')
        href=link.get_attribute('href') or ''
        check(href=='#/vehicles/VIN%3A'+VIN,f'{lang} {w}px: Ziel Fahrzeugakte ({href})')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/hinweisziel_inbox_{lang}_{w}.png')
        link.click(); q.wait_for_function("()=>location.hash.startsWith('#/vehicles/VIN')"); q.wait_for_timeout(700)
        check(PLATE in q.inner_text('main') if q.locator('main').count() else PLATE in q.inner_text('body'),f'{lang} {w}px: Fahrzeugakte {PLATE} geöffnet')
        check(q.evaluate("()=>document.documentElement.scrollWidth<=window.innerWidth+1"),f'{lang} {w}px: kein Querscrollen')
        if SHOTS and w!=820: q.screenshot(path=f'{SHOTS}/hinweisziel_akte_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('Hinweisziel: alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
