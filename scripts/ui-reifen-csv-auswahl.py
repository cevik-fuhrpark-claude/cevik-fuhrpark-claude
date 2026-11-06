# [CLAUDE] UI-Test Blickwinkel „Seitenfilter wirkt auf alle Teile einer Seite“ (06.11.2026, Backlog 1065): Reifen – Flotte →
# CSV-Export folgt dem gewählten Reiter (wie Liste und Ausdruck): Reiter „Winter nicht erfüllt“ → nur diese Fahrzeuge, Dateiname mit
# festem deutschem Zusatz (auch in UK/EN); Reiter „Alle“ → alle Fahrzeuge ohne Zusatz. DE/UK/EN bei 390/820/1366 px, keine Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rc.inhaber','display_name':'RC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rc.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vids=[]
    for i in range(3):
        vin=f'WMA06XZZ0HP1065{10+i}'; api('POST','/api/vehicles',{'plate':f'RC-SV {650+i}','vin':vin,'site':'Csvstadt'}); vids.append('VIN:'+vin)
    # 650: Winter nicht erfüllt; 651: Winter erfüllt (Lenkachse + Antriebsachse außen mit Alpine-Symbol); 652: nichts erfasst
    for pos in ['VA-L','VA-R','HA-L-aussen','HA-R-aussen']: api('POST',f'/api/vehicles/{vids[0]}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'keine'})
    for pos in ['VA-L','VA-R','HA-L-aussen','HA-R-aussen']: api('POST',f'/api/vehicles/{vids[1]}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'3pmsf'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rc.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/tires?f=winter_bad'); q.wait_for_selector('#trcsv',timeout=15000); q.wait_for_timeout(400)
        with q.expect_download() as d: q.click('#trcsv')
        dl=d.value; txt=open(dl.path(),encoding='utf-8-sig').read()
        check(dl.suggested_filename.endswith('_winter-nicht-erfuellt.csv'),f'{lang}/{w}: Dateiname mit Reiter ({dl.suggested_filename})')
        check('RC-SV 650' in txt and 'RC-SV 651' not in txt and 'RC-SV 652' not in txt,f'{lang}/{w}: CSV nur „Winter nicht erfüllt“')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/rcsv_{lang}.png',full_page=True)
        q.click('[data-tf="all"]'); q.wait_for_selector('[data-tf="all"][aria-pressed="true"]',timeout=10000)
        with q.expect_download() as d: q.click('#trcsv')
        dl=d.value; txt=open(dl.path(),encoding='utf-8-sig').read()
        check(all(f'RC-SV {650+i}' in txt for i in range(3)) and dl.suggested_filename.endswith(f'_{dl.suggested_filename.split("_")[-1]}') and 'winter' not in dl.suggested_filename and '_-' not in dl.suggested_filename,f'{lang}/{w}: „Alle“ → alle Fahrzeuge ohne Zusatz ({dl.suggested_filename})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
