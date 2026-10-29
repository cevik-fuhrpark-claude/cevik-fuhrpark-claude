# [CLAUDE] UI-Test (30.10.2026, Backlog 630/632/634, Blickwinkel „Diebstahl über Nacht auf dem Rastplatz“):
# Meldeformular: Lkw mit gekoppeltem Auflieger gewählt, Beschreibung „Plane aufgeschlitzt, Ladung fehlt“ → Diebstahl-, Planen- und Auflieger-Hinweis
# (mit Kennzeichen des Aufliegers); Auflieger gewählt bzw. Beschreibung ohne Auflieger → kein Auflieger-Hinweis. Versicherungsfälle: Liste nennt
# „Ort laut Meldung“. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DESC={'de':'Plane aufgeschlitzt, Ladung fehlt','uk':'Тент напівпричепа порізаний, частини вантажу немає','en':'Trailer curtain cut, cargo missing'}
LOC={'de':'Ort laut Meldung','uk':'Місце за повідомленням','en':'Location as reported'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dr.inhaber','display_name':'DR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'dr.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ex.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000; n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; lk=f'DR-LK {R%900}{n}'; ah=f'DR-AH {R%900}{n}'
        check(api('POST','/api/vehicles',{'plate':ah,'vin':f'WDB99{R:05d}A{n:04d}00','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),'Auflieger')
        r=api('POST','/api/vehicles',{'plate':lk,'vin':f'WDB99{R:05d}L{n:04d}00','kind':'lkw','site':'Dortmund','trailer_plate':ah}); check(r['s'] in (200,201),'Lkw mit Auflieger')
        vs=api('GET','/api/vehicles')['d']['vehicles']; lid=[v['id'] for v in vs if v['plate']==lk][0]; aid=[v['id'] for v in vs if v['plate']==ah][0]
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/new'); m.reload(); m.wait_for_selector('#d',timeout=15000)
        m.fill('#vq',lk); m.click(f'label:has(input[name=veh][value="{lid}"])'); m.fill('#d',DESC[lang]); time.sleep(0.3)
        check(m.locator('#trlr').is_visible() and ah in m.inner_text('#trlr'),f'{lang} {w}px: Auflieger-Hinweis mit {ah}')
        check(not m.locator('#theft').is_hidden() and not m.locator('#tarp').is_hidden(),f'{lang} {w}px: Diebstahl- und Planen-Hinweis')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: m.locator('#hintsum').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/diebstahl_{lang}_{w}.png')
        m.fill('#vq',ah); m.click(f'label:has(input[name=veh][value="{aid}"])'); time.sleep(0.3)
        check(m.locator('#trlr').is_hidden(),f'{lang} {w}px: Auflieger gewählt → kein Auflieger-Hinweis')
        m.fill('#vq',lk); m.click(f'label:has(input[name=veh][value="{lid}"])'); m.fill('#d','Tankdeckel aufgebrochen, Diesel abgezapft'); time.sleep(0.3)
        check(m.locator('#trlr').is_hidden() and not m.locator('#theft').is_hidden(),f'{lang} {w}px: nur Lkw-Schaden → kein Auflieger-Hinweis')
        # 632: Versicherungsfall-Liste mit Ort
        c=api('POST','/api/cases',{'vehicle_id':lid,'description':'Diesel abgezapft (Test Rastplatz)','priority':'mittel','driveability':'fahrbereit','location_note':'Rastplatz A2 Lipperland Süd','request_key':f'dr-{R}-{n}'})
        check(c['s']==201,'Vorgang');
        check(api('PUT',f'/api/cases/{c["d"]["id"]}/claim',{'insurer':'Teilkasko Test AG','reported_on':time.strftime('%Y-%m-%d'),'evidence':'Schadenmeldung'})['s']==200,'Versicherungsfall')
        m.goto(B+'/#/claims'); m.wait_for_selector('[data-clloc]',timeout=15000)
        check(any('Lipperland' in x and LOC[lang] in x for x in m.locator('[data-clloc]').all_inner_texts()),f'{lang} {w}px: Versicherungsliste nennt Ort')
        check(m.evaluate(noscroll),f'{lang} {w}px: Versicherungsliste ohne Querscrollen')
        if SHOTS: m.screenshot(path=f'{SHOTS}/diebstahl_claims_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
