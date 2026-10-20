# [CLAUDE] UI-Test (20.10.2026): Lager-CSV = angezeigte Auswahl (Suche), Stückpreis mit drei Nachkommastellen, Dateiname mit Umgebung;
# Kennzahlen-Seite öffnet ohne Fehler. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PRICE={'de':'0,125','uk':'0,125','en':'0.125'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lc.inhaber','display_name':'LC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'lc.inhaber','password':PW})
    u=api('POST','/api/users',{'username':'lc.werkstatt','display_name':'LC Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    if u['s'] in (200,201): api('POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'lc.werkstatt','password':PW})
    api('POST','/api/stock',{'name':'Csvtest Kabelbinder','unit':'Stk','initial_qty':100,'unit_price_net':'0,125'})
    api('POST','/api/stock',{'name':'Csvtest Bremsscheibe','unit':'Stk','initial_qty':2,'unit_price_net':'189,90'})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},accept_downloads=True); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lc.werkstatt','password':PW}])
        q.goto(B+'/#/stock'); q.wait_for_selector('#sl')
        row=q.locator('#sl a',has_text='Csvtest Kabelbinder').inner_text()
        check(PRICE[lang] in row,f'{lang} {w}px: Stückpreis mit 3 Nachkommastellen ({row!r})')
        q.fill('#q','Kabelbinder')
        with q.expect_download() as d: q.click('#scsv')
        dl=d.value; txt=open(dl.path(),encoding='utf-8-sig').read().strip().split('\n')
        check(len(txt)==2 and 'Kabelbinder' in txt[1],f'{lang} {w}px: CSV nur angezeigte Auswahl ({len(txt)} Zeilen)')
        check(dl.suggested_filename.startswith('fuhrpark-lager_production_'),f'{lang} {w}px: Dateiname mit Umgebung ({dl.suggested_filename})')
        q.fill('#q','')
        with q.expect_download() as d2: q.click('#scsv')
        txt2=open(d2.value.path(),encoding='utf-8-sig').read().strip().split('\n')
        check(len(txt2)>=3,f'{lang} {w}px: ohne Filter alle Artikel ({len(txt2)} Zeilen)')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager_csv_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    # Kennzahlen (Inhaber) öffnen ohne Skriptfehler
    api('POST','/api/login',{'username':'lc.inhaber','password':PW})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lc.inhaber','password':PW}])
      q.goto(B+'/#/kpi'); q.wait_for_selector('#kf2')
      check(not errs and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} 390px: Kennzahlen ohne Fehler/Querscrollen {errs}')
      c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Lager-CSV-Auswahl: alles grün')
raise SystemExit(1 if fails else 0)
