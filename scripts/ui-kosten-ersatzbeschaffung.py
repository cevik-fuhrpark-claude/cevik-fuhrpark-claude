# [CLAUDE] UI-Test (Backlog 1419, Blickwinkel „Inhaber plant die Ersatzbeschaffung – welcher Lkw kostet zu viel?“):
# Mehr → Kosten je Fahrzeug: aufgeklappte Fahrzeugzeile nennt Erstzulassung, letzten km-Stand (mit Tag) und neue Vorgänge im Zeitraum;
# Fahrzeug ohne Angaben zeigt „–“. Hinweis im Regeltext. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (CFP_SHOTS=<Ordner> speichert Screenshots).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
H={'de':('Erstzulassung','Letzter km-Stand','Neue Vorgänge im Zeitraum: 2','Ersatzbeschaffung'),
   'uk':('Перша реєстрація','Останній показник км','Нові справи за період: 2','заміні транспорту'),
   'en':('First registration','Latest odometer reading','New cases in period: 2','replacement')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'eb.inhaber','display_name':'EB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'eb.inhaber','password':PW})
    today=datetime.date.today(); d=lambda n:(today+datetime.timedelta(days=n)).isoformat()
    api('POST','/api/vehicles',{'plate':'EB-UI 1','vin':'WDB96340310779911','kind':'lkw'}); V1='VIN:WDB96340310779911'
    api('POST','/api/vehicles',{'plate':'EB-UI 2','vin':'WDB96340310779912','kind':'lkw'}); V2='VIN:WDB96340310779912'
    r=api('POST',f'/api/vehicles/{V1}/spec',{'zgm_class':'ueber_12','first_registration':'2019-03-15','spec_source':'Zulassungsbescheinigung Teil I'})
    check(r['s']==200,f'Erstzulassung gesetzt ({r["s"]} {r["d"]})')
    r=api('POST',f'/api/vehicles/{V1}/odometer',{'km':612345,'measured_on':d(-2)}); check(r['s']==201,f'km-Stand ({r["s"]} {r["d"]})')
    for i,(v,txt) in enumerate([(V1,'Bremse quietscht'),(V1,'Spiegel lose'),(V2,'Plane gerissen')]):
        c=api('POST','/api/cases',{'vehicle_id':v,'description':txt,'priority':'mittel','driveability':'fahrbereit','request_key':f'eb-ui-{i}'})
        check(c['s']==201,f'Vorgang {i} ({c["s"]})')
    kmd=datetime.date.fromisoformat(d(-2))
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'eb.inhaber','password':PW}])
        q.goto(B+'/#/costs'); q.wait_for_selector('[data-cstamm]',state='attached',timeout=15000)
        rows=q.locator('details.row')
        check(rows.count()==2,f'{lang} {w}px: zwei Fahrzeuge ({rows.count()})')
        for i in range(rows.count()): rows.nth(i).locator('summary').click()
        txt={}
        for i in range(rows.count()):
            t=rows.nth(i).inner_text(); txt['1' if 'EB-UI 1' in t else '2']=rows.nth(i).locator('[data-cstamm]').inner_text()
        t1=txt.get('1',''); t2=txt.get('2','')
        check(H[lang][0] in t1 and '2019' in t1 and H[lang][1] in t1 and ('612' in t1 and '345' in t1) and str(kmd.year) in t1 and H[lang][2] in t1,f'{lang} {w}px: Zeile EB-UI 1 „{t1}“')
        check(t2.count('–')>=2 and H[lang][2].replace(': 2',': 1') in t2,f'{lang} {w}px: Zeile EB-UI 2 ohne Angaben „{t2}“')
        check(H[lang][3] in q.inner_text('#app'),f'{lang} {w}px: Hinweis im Regeltext')
        box=rows.nth(0).locator('[data-cstamm]').bounding_box()
        check(box and box['x']+box['width']<=w+1,f'{lang} {w}px: Zeile im Bild')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: rows.nth(0).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ersatzbeschaffung_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
