# [CLAUDE] UI-Test (16.11.2026, Backlog 1530, Blickwinkel „Leitung prüft vor der Mautabrechnung, ob Schadstoffklasse und Achszahl in der OBU stimmen“):
# Fahrzeugakte → HU/SP → „Prüfrelevante Fahrzeugdaten“: Auswahl Schadstoffklasse (nur Lkw), Achszahl, Hinweis; Anzeige in der Zeile darunter;
# Anhänger ohne Auswahl, mit Hinweis; falsche Achszahl wird am Feld markiert. DE/UK/EN, 390/820/1366 px.
# Backlog 1531: Fahrzeugliste – Auswahl „Schadstoffklasse“ (nur Lkw, „nicht erfasst“), Hinweis, Druckkopf.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Schadstoffklasse','uk':'Екологічний клас','en':'Emission class'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sk.inhaber','display_name':'SK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for plate,vin,extra in [('SK-AB 1530','WDB96340315300001',{}),('SK-AH 1530','WSM00000015300003',{'kind':'anhaenger'})]:
        check(api('POST','/api/vehicles',{'plate':plate,'vin':vin,'site':'Dortmund',**extra})['s'] in (200,201),f'Fahrzeug {plate}')
    first=True
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sk.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+'VIN%3AWDB96340315300001'); q.reload(); q.wait_for_selector('#specf',state='attached',timeout=20000); q.wait_for_timeout(500)
        q.evaluate("()=>{ const f=document.querySelector('#specf'); f.closest('details').open=true; f.scrollIntoView(); }"); q.wait_for_timeout(300)
        check(q.locator('#specf select[name=emission_class] option').count()==8,f'{lang} {wd}px: 7 Klassen + leer')
        check(q.locator('#specf [data-emishint]').is_visible(),f'{lang} {wd}px: Hinweis sichtbar')
        if first:
            # falsche Achszahl → Feld markiert, dann gültig speichern
            q.fill('#spaxles','2,5'); q.fill('#specf input[name=spec_source]','Zulassungsbescheinigung'); q.locator('#specf button.btn').click(); q.wait_for_timeout(800)
            check(q.locator('#spaxles').get_attribute('aria-invalid')=='true',f'{lang} {wd}px: Achszahl markiert')
            q.select_option('#spemis','euro_6'); q.fill('#spaxles','2'); q.locator('#specf button.btn').click(); q.wait_for_timeout(1200)
            first=False
            q.wait_for_selector('#specf',state='attached',timeout=15000)
        txt=q.locator('[data-emis]').first.inner_text() if q.locator('[data-emis]').count() else ''
        check(txt.startswith(LBL[lang]) and 'Euro VI' in txt,f'{lang} {wd}px: Anzeige „{txt}“')
        check('2' in (q.locator('[data-axles]').first.inner_text() if q.locator('[data-axles]').count() else ''),f'{lang} {wd}px: Achsen angezeigt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS:
            q.evaluate("()=>{ const f=document.querySelector('#specf'); f.closest('details').open=true; f.closest('details').previousElementSibling.scrollIntoView(); }"); q.wait_for_timeout(300)
            q.screenshot(path=f'{SHOTS}/schadstoff_{lang}_{wd}.png',full_page=False)
        # Anhänger
        q.goto(B+'/#/vehicles/'+'VIN%3AWSM00000015300003'); q.wait_for_selector('#specf',state='attached',timeout=20000); q.wait_for_timeout(400)
        check(q.locator('#specf select[name=emission_class]').count()==0 and q.locator('#specf [data-emistr]').count()==1 and q.locator('[data-emis]').count()==0,f'{lang} {wd}px: Anhänger ohne Schadstoffklasse')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # Backlog 1531: Filter in der Fahrzeugliste
    check(api('POST','/api/vehicles',{'plate':'SK-CD 1530','vin':'WDB96340315300002','site':'Dortmund'})['s'] in (200,201),'Fahrzeug SK-CD 1530')
    check(api('POST','/api/vehicles/VIN:WDB96340315300002/spec',{'emission_class':'euro_5','spec_source':'Zulassungsbescheinigung'})['s']==200,'SK-CD Euro V')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sk.inhaber','password':PW}])
        q.goto(B+'/#/vehicles'); q.reload(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(500)
        sel=q.locator('#vemis')
        check(sel.count()==1 and LBL[lang] in sel.inner_text() and 'Euro VI (1)' in sel.inner_text() and 'Euro V (1)' in sel.inner_text(),f'{lang} {wd}px: Auswahl mit Euro VI/V')
        if sel.count(): sel.select_option('euro_6'); q.wait_for_timeout(600)
        rows=q.locator('#vl a.row').all_inner_texts()
        check(any('SK-AB 1530' in x for x in rows) and not any('SK-CD 1530' in x or 'SK-AH 1530' in x for x in rows),f'{lang} {wd}px: nur Euro-VI-Lkw ({len(rows)})')
        check(q.locator('[data-emisfhint]').count()==1 and 'Euro VI' in (q.locator('#vprl').text_content() or ''),f'{lang} {wd}px: Hinweis und Druckkopf')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen (Liste)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/schadstoff_liste_{lang}_{wd}.png',full_page=False)
        q.locator('#vemis').select_option(''); q.wait_for_timeout(400)
        check(not errs,f'{lang} {wd}px: Liste ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
