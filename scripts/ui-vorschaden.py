# [CLAUDE] UI-Test (30.10.2026, Backlog 643–647, Blickwinkel „Springer findet bei der Abfahrtskontrolle einen Vorschaden“): Vorgang aus einer
# (offline gespeicherten) Abfahrtskontrolle zeigt „Festgestellt bei Abfahrtskontrolle am …“ (nachgereicht, km) und für die Leitung
# „Prüfpunkt zuletzt ohne Befund“; Abfahrtskontrolle verlinkt „Schaden melden“ mit dem gewählten Fahrzeug. DE/UK/EN bei 390/820/1366 px.
# Braucht den Dev-Server (frisch oder mit vorhandenem Inhaber). Screenshots: CFP_SHOTS=<Ordner>.
import os, time
from datetime import datetime, timedelta, timezone
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FOUND={'de':'Abfahrtskontrolle am','uk':'контролю перед виїздом','en':'departure check on'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
iso=lambda d: d.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vs.inhaber','display_name':'VS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'vs.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['wk.inhaber','gp.inhaber','dr.inhaber','ex.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    K=[i['key'] for i in api('GET','/api/meta')['d']['checklist']]
    items=lambda bad: [({'key':k,'result':'mangel','note':'Spiegel rechts abgerissen, bei Übernahme vorgefunden'} if k==bad else {'key':k,'result':'ok'}) for k in K]
    R=os.getpid()%100000; n=0; now=datetime.now(timezone.utc)
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'VS-LK {R%900}{n}'; vin=f'WDB96{R:05d}V{n:04d}00'; V='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
        check(api('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':V,'request_key':f'vs-{R}-{n}-a','items':items(None),'odometer_km':200000,'performed_at':iso(now-timedelta(days=1))})['s']==201,'Kontrolle ohne Befund')
        r=api('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':V,'request_key':f'vs-{R}-{n}-b','items':items(K[1]),'odometer_km':200400,'performed_at':iso(now-timedelta(hours=2))})
        check(r['s']==201,'Kontrolle mit Mangel (nachgereicht)'); cid=r['d']['followups'][0]['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('[data-srcinsp]',timeout=15000)
        txt=m.inner_text('[data-srcinsp]')
        check(FOUND[lang] in txt and '200' in txt,f'{lang} {w}px: „Festgestellt bei …“ mit km ({txt[:60]})')
        check(m.locator('[data-srcinsp] .muted').count()==1,f'{lang} {w}px: nachgereicht')
        check(FOUND[lang] in m.inner_text('[data-lastok]'),f'{lang} {w}px: Prüfpunkt zuletzt ohne Befund')
        check(m.evaluate(noscroll),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: m.locator('[data-srcinsp]').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/vorschaden_{lang}_{w}.png')
        m.goto(B+'/#/check'); m.wait_for_selector('#dcdmglink',timeout=15000)
        m.select_option('#v',V); time.sleep(0.2)
        check(m.get_attribute('#dcdmglink','href')=='#/new/'+V,f'{lang} {w}px: Link „Schaden melden“ mit Fahrzeug')
        m.click('#dcdmglink'); m.wait_for_selector('#d',timeout=15000); time.sleep(0.3)
        check(m.evaluate("()=>{const r=document.querySelector('input[name=veh]:checked'); return r && r.value}")==V,f'{lang} {w}px: Meldung mit vorausgewähltem Fahrzeug')
        check(m.evaluate(noscroll),f'{lang} {w}px: Meldung ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
