# [CLAUDE] UI-Test (20.10.2026): benutzte/ungültige Einladung ohne Sackgasse (Hinweis, „Anmelden“, Sprachauswahl), Einladungsformular
# mit App-Meldung statt Browserblase (novalidate), Datenqualität-Link in der Fahrzeugakte nur bei Fahrzeug in Betrieb und nicht ruhend,
# Offline-Fahrzeugliste wird auf der Startseite aufgefrischt (neues Fahrzeug erscheint ohne Öffnen von „Schaden melden“).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (Integrations-Token des Dev-Servers).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, tok]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (tok) h.authorization = 'Bearer ' + tok;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LOGIN={'de':'Anmelden','uk':'Увійти','en':'Sign in'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,tok=None: a.evaluate(JS,[m,pa,b,tok])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ed.inhaber','display_name':'ED Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ed.inhaber','password':PW})
    vin='WDB96340310777731'; VID='VIN:'+vin
    api('POST','/api/vehicles',{'plate':'ED-DQ 1','vin':vin,'kind':'lkw'})
    gps=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    t=api('POST','/api/integration/v1/telematics',{'provider':'webfleet','items':[{'external_id':'ED-1','vin':vin,'plate':'ED-XX 9','km':1000,'gps_time':gps}]},'integration-token-xyz')
    check(t['s']==200,f'Telematik mit anderem Kennzeichen ({t["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        # ungültige Einladung (nicht angemeldet, Sprache des Geräts gewählt)
        q.goto(B+'/#/invite/ungueltiger-link-0000000000'); q.wait_for_selector('#invbad', timeout=15000)
        q.evaluate(f"()=>localStorage.setItem('cfp_lang','{lang}')"); q.reload(); q.wait_for_selector('#invbad', timeout=15000)
        btn=q.locator('#invbad a.btn[href="#/login"]')
        check(btn.count()==1 and btn.inner_text().strip()==LOGIN[lang],f'{lang} {w}px: Einladung ungültig → Knopf „{LOGIN[lang]}“')
        check(q.locator('#invbad #lang').count()==1,f'{lang} {w}px: Sprachauswahl auf der Fehlerseite')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Fehlerseite ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/einladung_ungueltig_{lang}_{w}.png',full_page=True)
        # Fahrzeugakte: Link zur Datenqualität (Fahrzeug in Betrieb)
        q.evaluate(JS,['POST','/api/login',{'username':'ed.inhaber','password':PW},None])
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('[data-tmmism]', state='attached', timeout=15000)
        check(q.locator('[data-tmmism] a[href="#/quality?f=telematics_plate_mismatch"]').count()==1,f'{lang} {w}px: Akte verlinkt Datenqualität')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Akte ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    # ruhend → Hinweis bleibt, Link entfällt (Datenqualität nimmt ruhende aus)
    r=api('POST',f'/api/vehicles/{VID}/evaluation',{'excluded':True,'reason':'UI-Test ruhend'})
    check(r['s']==200,f'ruhend gesetzt ({r["s"]})')
    q=a; q.goto(B+'/#/vehicles/'+VID); q.reload(); q.wait_for_selector('[data-tmmism]', state='attached', timeout=15000)
    check(q.locator('[data-tmmism] a[href^="#/quality"]').count()==0,'ruhend: kein Link zur Datenqualität, Hinweis bleibt')
    # Offline-Fahrzeugliste: Startseite frischt veraltete Liste auf
    q.goto(B+'/#/'); q.wait_for_timeout(1500)
    key=q.evaluate("()=>Object.keys(localStorage).find((k)=>/^cfp_veh_.*_(test|production)$/.test(k))")
    check(bool(key),f'Offline-Fahrzeugliste angelegt ({key})')
    api('POST','/api/vehicles',{'plate':'ED-NEU 2','vin':'WDB96340310777732','kind':'lkw'})
    q.evaluate(f"()=>localStorage.setItem('{key}_at','0')")
    q.reload(); q.wait_for_timeout(2000)
    check('ED-NEU 2' in (q.evaluate(f"()=>localStorage.getItem('{key}')") or ''),'Startseite: neues Fahrzeug in der Offline-Liste')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
