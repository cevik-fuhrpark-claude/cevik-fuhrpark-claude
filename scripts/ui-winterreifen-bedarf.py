# [CLAUDE] UI-Test Blickwinkel „Winterreifen bestellen, bevor der erste Schnee kommt“ (26.10.2026, Backlog 406): Reifen-Flotte → Reiter
# „Winter nicht erfüllt“ zeigt „Winterreifen-Bedarf je Reifengröße“ (Achse, Größe, Positionen, Kennzeichen; Größe nicht hinterlegt
# getrennt; nicht erfasste Positionen nur gezählt). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Winterreifen-Bedarf je Reifengröße','uk':'Потреба в зимових шинах за розміром','en':'Winter tyre demand by size'}
NOSIZE={'de':'Größe nicht hinterlegt','uk':'Розмір не вказано','en':'Size not stored'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wr.inhaber','display_name':'WR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vids=[]
    for i in range(3):
        vin=f'WMA06XZZ0HP1098{10+i}'; api('POST','/api/vehicles',{'plate':f'WR-BD {800+i}','vin':vin,'site':'Dortmund'}); vids.append('VIN:'+vin)
    for v in vids:
        check(api('POST',f'/api/vehicles/{v}/tires/specs',{'axle':'lenkachse','size':'385/65 R22.5','verified':True})['s']==200,'Größe Lenkachse')
        for pos in ['VA-L','VA-R']: api('POST',f'/api/vehicles/{v}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'ms'})
    for pos in ['HA-L-aussen','HA-R-aussen']: api('POST',f'/api/vehicles/{vids[0]}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'keine'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wr.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/tires?f=winter_bad'); q.wait_for_selector('#twneed',timeout=15000)
        t=q.inner_text('#twneed')
        check(TITLE[lang] in t,f'{lang}/{w}: Überschrift')
        rows=q.query_selector_all('#twneed tr[data-twn]')
        check(len(rows)==2 and '385/65 R22.5' in rows[0].inner_text() and '6' in rows[0].inner_text() and 'WR-BD 802' in rows[0].inner_text(),f'{lang}/{w}: Lenkachse 6 Positionen an 3 Lkw')
        check(NOSIZE[lang] in rows[1].inner_text() and 'WR-BD 800' in rows[1].inner_text(),f'{lang}/{w}: Antriebsachse ohne Größe getrennt')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/twn_{lang}.png',full_page=True)
        q.click('[data-tf="attention"]'); q.wait_for_timeout(600)
        check(not q.query_selector('#twneed'),f'{lang}/{w}: nur in den Winter-Reitern')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
