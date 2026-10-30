# [CLAUDE] UI-Test (30.10.2026, Backlog 635–638, Blickwinkel „Wartung nach km“): Fahrzeugakte zeigt Rest-km wie die Prüftermine (belegter km-Stand
# der letzten Durchführung), „bald fällig“ bei Vorwarnung in km und „(km-Stand vom …)“; Fahrzeug ohne km-Stand → „kein km-Stand erfasst“;
# Erledigen einer km-Fälligkeit ohne Intervall zeigt den Hinweis. Prüftermin-Liste mit Stand-Datum. DE/UK/EN bei 390/820/1366 px.
# Braucht den Dev-Server (frisch oder mit vorhandenem Inhaber). Screenshots: CFP_SHOTS=<Ordner>.
import os, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SOON={'de':'bald fällig','uk':'скоро','en':'due soon'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wk.inhaber','display_name':'WK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'wk.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['gp.inhaber','dr.inhaber','ex.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    old=api('GET','/api/settings')['d']; oldw=(old.get('values') or old).get('maintenance_warn_km') if isinstance(old,dict) else None
    check(api('PUT','/api/settings',{'maintenance_warn_km':5000})['s']==200,'Vorwarnung 5000 km')
    R=os.getpid()%100000; n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'WK-LK {R%900}{n}'; vin=f'WDB96{R:05d}K{n:04d}00'; V='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
        check(api('POST',f'/api/vehicles/{V}/odometer',{'km':348000})['s']==201,'km-Stand')
        r=api('POST',f'/api/vehicles/{V}/maintenance',{'kind':'Ölwechsel','interval_km':100000,'last_done_km':250000,'evidence':'Werkstattrechnung'}); check(r['s']==201,'km-Regel')
        pl2=f'WK-NO {R%900}{n}'; vin2=f'WDB96{R:05d}N{n:04d}00'
        api('POST','/api/vehicles',{'plate':pl2,'vin':vin2,'kind':'lkw','site':'Dortmund'})
        check(api('POST',f'/api/vehicles/VIN:{vin2}/maintenance',{'kind':'Ölwechsel','interval_km':50000,'last_done_km':100000,'evidence':'Rechnung'})['s']==201,'Regel ohne km-Stand')
        r3=api('POST',f'/api/vehicles/{V}/maintenance',{'kind':'Sonstiges','title':'Service','due_km':360000,'evidence':'Serviceanzeige'}); check(r3['s']==201,'km-Fälligkeit ohne Intervall')
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/vehicles/'+V.replace(':','%3A')); m.reload(); m.wait_for_selector('[data-kmsoon]',timeout=15000)
        check(SOON[lang] in m.inner_text('[data-kmsoon]') and m.locator('[data-kmasof]').count()>=1,f'{lang} {w}px: Akte „{SOON[lang]}“ mit Stand-Datum')
        check(m.evaluate(noscroll),f'{lang} {w}px: Akte ohne Querscrollen')
        if SHOTS: m.locator('[data-kmsoon]').first.scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/wartung_km_{lang}_{w}.png')
        btn=m.locator(f'[data-mdonebtn="{r3["d"]["id"]}"], button[data-mdoneopen="{r3["d"]["id"]}"]')
        frm=m.locator(f'form[data-mdone="{r3["d"]["id"]}"]')
        check(frm.count()==1 and frm.locator('[data-mdonenokm]').count()==1,f'{lang} {w}px: Erledigen-Formular mit Hinweis „nächste km-Fälligkeit“')
        m.goto(B+'/#/vehicles/VIN%3A'+vin2); m.wait_for_selector('[data-kmnone]',timeout=15000)
        check(m.locator('[data-kmnone]').count()>=1,f'{lang} {w}px: Akte ohne km-Stand → Hinweis')
        m.goto(B+'/#/maintenance?f=all'); m.wait_for_selector('[data-kmasof]',timeout=15000); time.sleep(0.5)
        check(m.locator('[data-kmasof]').count()>=1 and m.locator('[data-kmnone]').count()>=1,f'{lang} {w}px: Prüftermin-Liste mit Stand-Datum und „kein km-Stand“')
        check(m.evaluate(noscroll),f'{lang} {w}px: Liste ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PUT','/api/settings',{'maintenance_warn_km': oldw if oldw else ''})
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
