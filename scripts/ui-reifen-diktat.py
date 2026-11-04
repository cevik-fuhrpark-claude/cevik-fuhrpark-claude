# [CLAUDE] UI-Test (04.11.2026, Backlog 986, Blickwinkel „Werkstatt misst die Reifen und diktiert/tippt mit Einheit“): In der Fahrzeugakte
# → Reifen erfassen werden „Profil 6,5 Millimeter“ / „6,5 мм“ / „6.5 mm“ und „8,5 bar“ / „тиск 9 бар“ beim Verlassen der Felder zur Zahl,
# die Messung wird gespeichert (vorher „ungültige Zahl“). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SAY={'de':('Profil 6,5 Millimeter','6,5','8,5 bar','8,5'),'uk':('6,5 мм','6,5','тиск 9 бар','9'),'en':('6.5 mm','6.5','tyre pressure 8.5 bar','8.5')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rd.inhaber','display_name':'RD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rd.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ8RP'+str(uuid.uuid4().int)[:6]; plate='RD-K '+str(uuid.uuid4().int)[:3]
    r=api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201),'Fahrzeug angelegt')
    vid=r['d'].get('id') or r['d'].get('vehicle',{}).get('id')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang}/{wd}'; tsay,twant,psay,pwant=SAY[lang]
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rd.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+vid); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        q.select_option('#tf select[name="event_type"]','messung'); q.select_option('#tf select[name="position"]','VA-L')
        t=q.locator('#tf input[name="tread_mm"]'); t.click(); t.type(tsay); t.evaluate('el => el.blur()')
        check(t.input_value()==twant,f'{tag}: Profiltiefe „{tsay}“ → {t.input_value()!r}')
        pr=q.locator('#tf input[name="pressure_bar"]'); pr.click(); pr.type(psay); pr.evaluate('el => el.blur()')
        check(pr.input_value()==pwant,f'{tag}: Luftdruck „{psay}“ → {pr.input_value()!r}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: pr.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifen-diktat-{lang}-{wd}.png')
        before=len((api('GET','/api/vehicles/'+vid+'/tires')['d'] or {}).get('history') or [])
        q.locator('#tf button.btn:not(.secondary)').last.click(); hist=[]
        for _ in range(40):
            q.wait_for_timeout(250); hist=(api('GET','/api/vehicles/'+vid+'/tires')['d'] or {}).get('history') or []
            if len(hist)>before: break
        ok=len(hist)>before and hist[0]['tread_mm']==float(twant.replace(',','.')) and hist[0]['pressure_bar']==float(pwant.replace(',','.'))
        check(ok,f'{tag}: Messung gespeichert ({hist[0]["tread_mm"] if hist else None} mm, {hist[0]["pressure_bar"] if hist else None} bar)')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
