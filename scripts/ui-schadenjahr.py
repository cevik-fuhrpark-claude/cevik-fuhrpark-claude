# [CLAUDE] UI-Test (Backlog 1418, Blickwinkel „Inhaber verlängert die Flottenversicherung – Versicherer verlangt den Schadenverlauf nach Schadenjahr“):
# Mehr → Versicherungsfälle: Auswahl „Zeitraum und Jahr nach“ (Meldedatum/Schadentag), Feldbeschriftungen und Überschrift der Jahressummen
# wechseln, Jahre nach Schadentag, Hinweis „ohne Schadenzeitpunkt“ mit Anzahl. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (CFP_SHOTS=<Ordner> speichert Screenshots).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
H={'de':('Summen je Meldejahr','Summen je Schadenjahr','Schaden ab','Ohne Schadenzeitpunkt am Vorgang'),
   'uk':('Суми за роком повідомлення','Суми за роком пошкодження','Пошкодження з','Без часу пошкодження у справі'),
   'en':('Totals per reporting year','Totals per year of loss','Loss from','No time of damage on the case')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sj.inhaber','display_name':'SJ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'sj.inhaber','password':PW})
    today=datetime.date.today(); d=lambda n:(today+datetime.timedelta(days=n)).isoformat()
    api('POST','/api/vehicles',{'plate':'SJ-UI 1','vin':'WDB96340310779901','kind':'lkw'}); VID='VIN:WDB96340310779901'
    # Fall 1: Schaden vor 330 Tagen, gemeldet gestern; Fall 2: ohne Schadenzeitpunkt (Jahr laut Anlage = heute)
    c1=api('POST','/api/cases',{'vehicle_id':VID,'description':'Unfall Hof','priority':'mittel','driveability':'fahrbereit','request_key':'sj-ui-1','occurred_at':d(-330)})
    check(c1['s']==201,f'Vorgang mit Schadenzeitpunkt ({c1["s"]} {c1["d"]})')
    c2=api('POST','/api/cases',{'vehicle_id':VID,'description':'Unfall Rampe','priority':'mittel','driveability':'fahrbereit','request_key':'sj-ui-2'})
    for c in (c1,c2):
        r=api('PUT',f'/api/cases/{c["d"]["id"]}/claim',{'insurer':'Vers AG','reported_on':d(-1),'evidence':'Schadenmeldung','deductible_net':'500'})
        check(r['s']==200,f'Versicherungsfall ({r["s"]} {r["d"]})')
    y_rep=d(-1)[:4]; y_loss=sorted({d(-330)[:4], today.isoformat()[:4]}, reverse=True)
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sj.inhaber','password':PW}])
        q.goto(B+'/#/claims'); q.wait_for_selector('[data-clf="alle"]'); q.locator('[data-clf="alle"]').click(); q.wait_for_selector('#clsums')
        sums=q.inner_text('#clsums')
        check(H[lang][0] in sums and H[lang][1] not in sums,f'{lang} {w}px: Standard „je Meldejahr“')
        check(q.locator('#cllossfb').count()==0,f'{lang} {w}px: kein Fallback-Hinweis nach Meldedatum')
        yrs=q.locator('#clsums tbody tr td:first-child').all_inner_texts()
        check(yrs[0]==y_rep and len(yrs)==2,f'{lang} {w}px: ein Meldejahr + Summe {yrs}')
        q.select_option('#clbasis','schaden'); q.wait_for_function(f'()=>document.querySelector("#clsums") && document.querySelector("#clsums").innerText.includes({H[lang][1]!r})',timeout=15000)
        yrs=q.locator('#clsums tbody tr td:first-child').all_inner_texts()
        check(yrs[:-1]==y_loss,f'{lang} {w}px: Jahre nach Schadentag {yrs} (erwartet {y_loss})')
        check(H[lang][2] in q.inner_text('#clper'),f'{lang} {w}px: Feld „Schaden ab“')
        fb=q.locator('#cllossfb')
        check(fb.count()==1 and H[lang][3] in fb.inner_text() and fb.inner_text().strip().endswith('1'),f'{lang} {w}px: Hinweis ohne Schadenzeitpunkt mit Anzahl 1')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#clper').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schadenjahr_{lang}_{w}.png',full_page=True)
        q.select_option('#clbasis','meldung'); q.wait_for_function(f'()=>document.querySelector("#clsums") && document.querySelector("#clsums").innerText.includes({H[lang][0]!r})',timeout=15000)
        check(q.locator('#cllossfb').count()==0,f'{lang} {w}px: zurück auf Meldedatum')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
