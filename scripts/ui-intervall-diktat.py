# [CLAUDE] UI-Test (04.11.2026, Backlog 987, Blickwinkel „Leitung überträgt Wartungsintervalle aus dem Serviceheft“): Fahrzeugakte → Prüftermin
# anlegen: „alle 12 Monate“ / „12 місяців“ / „every 12 months“ und „alle 100.000 km“ / „100 000 кілометрів“ werden beim Verlassen der Felder
# zur Zahl und gespeichert (vorher „ungültige Zahl“); Ändern-Formular lässt „6 Monate“ zu (maxlength 3 → 20). DE/UK/EN bei 390/820/1366 px,
# ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SAY={'de':('alle 12 Monate','alle 100.000 km','100.000'),'uk':('12 місяців','100 000 кілометрів','100 000'),'en':('every 12 months','every 100000 kilometres','100000')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'id.inhaber','display_name':'ID Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'id.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang}/{wd}'; msay,ksay,kwant=SAY[lang]
        vin='WMA06XZZ8RP'+str(uuid.uuid4().int)[:6]; plate='ID-K '+str(uuid.uuid4().int)[:3]
        r=api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'}); vid=r['d'].get('id') or r['d'].get('vehicle',{}).get('id')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'id.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+vid); q.reload(); q.wait_for_selector('#mf',state='attached',timeout=15000)
        q.locator('#mf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        q.select_option('#mf select[name="kind"]','Sonstiges'); q.fill('#mf input[name="title"]','Ölwechsel')
        mi=q.locator('#mf input[name="interval_months"]'); mi.click(); mi.type(msay); mi.evaluate('el => el.blur()')
        check(mi.input_value()=='12',f'{tag}: Intervall „{msay}“ → {mi.input_value()!r}')
        ki=q.locator('#mf input[name="interval_km"]'); ki.click(); ki.type(ksay); ki.evaluate('el => el.blur()')
        check(ki.input_value()==kwant,f'{tag}: Intervall „{ksay}“ → {ki.input_value()!r}')
        q.fill('#mf input[name="next_due_date"]','2027-03-31'); q.fill('#mf input[name="evidence"]','Serviceheft')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: ki.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/intervall-diktat-{lang}-{wd}.png')
        q.locator('#mf button.btn').click(); mt=None
        for _ in range(40):
            q.wait_for_timeout(250); mt=[x for x in ((api('GET','/api/vehicles/'+vid)['d'] or {}).get('maintenance') or []) if x.get('kind')=='Sonstiges']
            if mt: break
        check(bool(mt) and mt[0]['interval_months']==12 and mt[0]['interval_km']==100000,f'{tag}: gespeichert ({mt[0]["interval_months"] if mt else None} Monate, {mt[0]["interval_km"] if mt else None} km)')
        # Ändern-Formular: maxlength lässt „6 Monate“ zu
        q.wait_for_selector('form[data-medit] input[name="interval_months"]',state='attached',timeout=15000)
        ml=q.locator('form[data-medit] input[name="interval_months"]').first.get_attribute('maxlength')
        check(ml is not None and int(ml)>=15,f'{tag}: Ändern-Formular maxlength {ml}')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
