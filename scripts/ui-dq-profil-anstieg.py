# [CLAUDE] UI-Test (01.11.2026, Backlog 848, Folge aus 847): Datenqualität listet „Profiltiefe höher als die vorherige Messung (ohne Wechsel)“,
# wenn die Einstellung tire_tread_rise_mm gesetzt ist – Detail mit übersetzter Position und mm, Link zum Reifenabschnitt der Fahrzeugakte;
# ohne Einstellung kein Befund. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
V='VIN:WMA06XZZ8RP848012'
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
    r=api('POST','/api/vehicles',{'vin':V[4:],'plate':'PA-DQ 848','site':'Dortmund','kind':'lkw'})
    check(r['s'] in (200,201,409),f'Fahrzeug angelegt ({r["s"]})')
    for i,mm in enumerate(['8','12,5']):
        m=api('POST',f'/api/vehicles/{V}/tires/events',{'event_type':'messung','position':'VA-L','tread_mm':mm,'request_key':f'pa-848-va-l-{i}'})
        check(m['s'] in (200,201),f'Messung VA-L {mm} mm ({m["s"]})')
    api('PUT','/api/settings',{'tire_tread_rise_mm':''})
    d=api('GET','/api/admin/data-quality')['d']
    check(not any(i['check']=='tire_tread_rise' for i in d['items']),'ohne Einstellung kein Befund')
    check(api('PUT','/api/settings',{'tire_tread_rise_mm':'1.5'})['s']==200,'Einstellung 1,5 mm')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pa.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        lbl=q.evaluate("async (l) => { const m = await import('/i18n.js'); return m.STRINGS[l].dq_tire_tread_rise; }",lang)
        q.goto(B+'/#/quality?f=tire_tread_rise'); q.reload(); q.wait_for_selector('a.row[href*="sec=tires"]',timeout=15000)
        row=q.locator(f'a.row[href="#/vehicles/{V}?sec=tires"]')
        txt=row.inner_text() if row.count() else ''
        check(row.count()==1 and row.is_visible() and lbl in txt,f'{lang}/{wd}: Befund mit Bezeichnung')
        check(('12,5' in txt if lang!='en' else '12.5' in txt) and ('мм' in txt if lang=='uk' else 'mm' in txt) and ('VA-L' not in txt or lang=='de'),f'{lang}/{wd}: Detail übersetzt {txt[-90:]!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: row.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dq-profil-{lang}-{wd}.png')
        row.click(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        check('sec=tires' in q.url,f'{lang}/{wd}: Link öffnet den Reifenabschnitt')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    api('PUT','/api/settings',{'tire_tread_rise_mm':''})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
