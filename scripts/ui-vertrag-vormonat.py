# [CLAUDE] UI-Test (29.10.2026, Backlog 601, Blickwinkel „Monatsende: km für den Leasinggeber“): Verträge – Knopf „Ende Vormonat“ setzt den
# Stichtag auf den letzten Tag des Vormonats, km-Stand mit Ablesedatum steht auch neben der Kontingent-Zeile, zum Stichtag keine Prognose;
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
FC={'de':'Prognose bis Vertragsende','uk':'Прогноз до кінця договору','en':None}
BTN={'de':'Ende Vormonat','uk':'Кінець попереднього місяця','en':'End of last month'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vm.inhaber','display_name':'VM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    # Berliner Datum wie die App (Server-Zeitzone des Testrechners kann abweichen)
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: str(today+datetime.timedelta(days=n))
    prev=str(today.replace(day=1)-datetime.timedelta(days=1))
    V='VIN:WDB96340310601901'
    api('POST','/api/vehicles',{'vin':'WDB96340310601901','plate':'VM-ON 601','site':'Dortmund'})
    r=api('POST',f'/api/vehicles/{V}/contracts',{'kind':'leasing','partner':'UI-Leasing','evidence':'UI-Test','start_date':d(-400),'end_date':d(330),'km_allowance':100000,'start_km':0})
    check(r['s'] in (200,201),'Vertrag angelegt '+str(r['s']))
    for km,n in [(0,-400),(90000,-60),(91000,-40)]:
        check(api('POST',f'/api/vehicles/{V}/odometer',{'km':km,'measured_on':d(n)})['s']==201,f'km {km}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'vm.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/contracts'); q.reload(); q.wait_for_selector('#ctasofprev', timeout=15000)
        txt=q.inner_text('#main')
        fc=FC[lang] or q.evaluate("async () => (await import('/i18n.js')).STRINGS.en.ct_forecast")
        check(fc in txt,f'{lang} {w}: heute Prognose sichtbar')
        check(BTN[lang] in q.inner_text('#ctasofprev'),f'{lang} {w}: Knopf „{BTN[lang]}“')
        check(q.locator('[data-ctread]').count()>=1 and '91' in q.inner_text('[data-ctread]'),f'{lang} {w}: km-Stand neben dem Kontingent')
        q.click('#ctasofprev'); q.wait_for_selector('#ctasofx', timeout=15000)
        check(q.input_value('#ctasof')==prev,f'{lang} {w}: Stichtag = {prev} ({q.input_value("#ctasof")})')
        row=q.inner_text('#main')
        check(fc not in row,f'{lang} {w}: zum Stichtag keine Prognose')
        check(q.evaluate('() => document.documentElement.scrollWidth <= window.innerWidth + 1'),f'{lang} {w}: ohne Querscrollen')
        check(not errs,f'{lang} {w}: ohne Skriptfehler {errs}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vertrag-vormonat-{lang}-{w}.png', full_page=True)
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'OK')
if fails: raise SystemExit(1)
