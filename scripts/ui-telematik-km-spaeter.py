# [CLAUDE] UI-Test: Telematik-km „größer als später erfasster Stand“ (nachgereichter Wert, nicht übernommen) erscheint wie in der
# Datenqualität auch in der Telematik-Übersicht („Letzter Stand je Fahrzeug“, data-tmkm="above") und in der Fahrzeugakte –
# mit Datum des späteren Stands und Link zur Datenqualität. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (Integrations-Token des Dev-Servers).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, tok]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (tok) h.authorization = 'Bearer ' + tok;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'größer als später erfasster Stand','uk':'більше за пізніше записаний пробіг','en':'higher than later recorded reading'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,tok=None: a.evaluate(JS,[m,pa,b,tok])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tk.inhaber','display_name':'TK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'tk.inhaber','password':PW})
    vin='WDB96340310777716'; VID='VIN:'+vin
    api('POST','/api/vehicles',{'plate':'TK-KM 1','vin':vin,'kind':'lkw'})
    o=api('POST',f'/api/vehicles/{VID}/odometer',{'km':200000,'measured_on':(datetime.date.today()-datetime.timedelta(days=1)).isoformat()})
    check(o['s']==201,f'km-Stand erfasst ({o["s"]})')
    gps=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
    t=api('POST','/api/integration/v1/telematics',{'provider':'yellowfox','items':[{'external_id':'TK-1','vin':vin,'km':250000,'gps_time':gps}]},'integration-token-xyz')
    check(t['s']==200 and (t['d'] or {}).get('odometer_rejected')==1,f'Nachlieferung abgewiesen ({t})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tk.inhaber','password':PW},None])
        q.goto(B+'/#/telematics'); q.wait_for_selector('#tmcsv', state='attached')
        for d in q.locator('details').all():
            if not d.get_attribute('open'): d.locator('summary').first.click()
        el=q.locator('[data-tmkm="above"]')
        tx=el.first.inner_text() if el.count() else ''
        check(TXT[lang] in tx and '200' in tx,f'{lang} {w}px: Übersicht zeigt „größer als später“ ({tx[:90]!r})')
        check(q.locator('a[href="#/quality?f=telematics_km_rejected"]').count()>0,f'{lang} {w}px: Link zur Datenqualität')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Übersicht ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/tm_km_spaeter_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('[data-tmkm]', state='attached', timeout=15000)
        el=q.locator('[data-tmkm="above"]'); tx=el.first.inner_text() if el.count() else ''
        check(TXT[lang] in tx,f'{lang} {w}px: Fahrzeugakte zeigt den Hinweis ({tx[:90]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Akte ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/tm_km_spaeter_akte_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
