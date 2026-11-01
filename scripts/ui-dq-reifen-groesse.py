# [CLAUDE] UI-Test (01.11.2026, Backlog 850, Folge aus 849): Datenqualität listet „Montierte Reifengröße weicht von der hinterlegten ab“ –
# Detail mit übersetzter Achse und Hinweis „nicht bestätigt“, Link zum Reifenabschnitt der Fahrzeugakte; nach Anpassen der Achsgröße kein Befund.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V='VIN:WMA06XZZ8RP850012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pa.inhaber','display_name':'PA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/vehicles',{'vin':V[4:],'plate':'PA-DQ 850','site':'Dortmund','kind':'lkw'})
    check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
    check(api('POST',f'/api/vehicles/{V}/tires/specs',{'axle':'lenkachse','size':'385/65 R22.5','verified':False})['s']==200,'Achsgröße (nicht bestätigt)')
    m=api('POST',f'/api/vehicles/{V}/tires/events',{'event_type':'wechsel','position':'VA-L','size':'315/80 R22.5','request_key':'pa-850-va-l'})
    check(m['s'] in (200,201),f'Wechsel VA-L ({m["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        lbl,unv,ax=q.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return [S.dq_tire_size_differs, S.dq_sd_unverified, S.axle_lenkachse]; }",lang)
        q.goto(B+'/#/quality?f=tire_size_differs'); q.reload(); q.wait_for_selector('a.row[href*="sec=tires"]',timeout=15000)
        row=q.locator(f'a.row[href="#/vehicles/{V}?sec=tires"]')
        txt=row.inner_text() if row.count() else ''
        check(row.count()==1 and row.is_visible() and lbl in txt,f'{lang}/{wd}: Befund mit Bezeichnung')
        check('315/80 R22.5' in txt and '385/65 R22.5' in txt and unv in txt and ax in txt and ('lenkachse' not in txt),f'{lang}/{wd}: Detail übersetzt {txt[-140:]!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: row.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dq-groesse-{lang}-{wd}.png')
        row.click(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        check('sec=tires' in q.url,f'{lang}/{wd}: Link öffnet den Reifenabschnitt')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    check(api('POST',f'/api/vehicles/{V}/tires/specs',{'axle':'lenkachse','size':'315/80 R22.5','verified':True})['s']==200,'Achsgröße angepasst')
    d=api('GET','/api/admin/data-quality')['d']
    check(not any(i['check']=='tire_size_differs' and i['vehicle_id']==V for i in d['items']),'danach kein Befund')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
