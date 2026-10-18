# [CLAUDE] UI-Test: Versicherungsfälle eines ruhenden Fahrzeugs bleiben sichtbar (Chip „Ruhend“), zählen aber nicht in
# „Summe Erstattungen“ – eigene Zeile „Erstattungen ruhender Fahrzeuge“ mit Hinweis. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':('Erstattungen ruhender Fahrzeuge','Ruhend'),'uk':('Відшкодування за ТЗ поза обліком','Неактивний облік'),'en':('Reimbursements for dormant vehicles','Dormant')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vr.inhaber','display_name':'VR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'vr.inhaber','password':PW})
    d=lambda n:(datetime.date.today()-datetime.timedelta(days=n)).isoformat()
    ids=[]
    for i,vin in enumerate(['WDB96340310777801','WDB96340310777802']):
        VID='VIN:'+vin; api('POST','/api/vehicles',{'plate':f'VR-RU {i+1}','vin':vin,'kind':'lkw'})
        c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Unfall Spiegel','priority':'mittel','driveability':'fahrbereit','request_key':f'vr-{i}'})
        check(c['s']==201,f'Vorgang {i+1} ({c["s"]})')
        r=api('PUT',f'/api/cases/{c["d"]["id"]}/claim',{'insurer':'Vers AG','reported_on':d(10),'status':'reguliert','reimbursed_net':100+i*400,'reimbursed_on':d(2),'evidence':'Abrechnung'})
        check(r['s']==200,f'Versicherungsfall {i+1} ({r["s"]} {r["d"]})'); ids.append(VID)
    x=api('POST',f'/api/vehicles/{ids[1]}/evaluation',{'excluded':True,'reason':'Verkauf offen'})
    check(x['s']==200,f'Fahrzeug 2 ruhend ({x["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vr.inhaber','password':PW}])
        q.goto(B+'/#/claims'); q.wait_for_selector('[data-clf]')
        q.locator('[data-clf="alle"]').click(); q.wait_for_timeout(400)
        body=q.locator('main').inner_text() if q.locator('main').count() else q.inner_text('body')
        check(TXT[lang][0] in body,f'{lang} {w}px: eigene Zeile ruhender Fahrzeuge')
        check(TXT[lang][1] in body,f'{lang} {w}px: Chip ruhend in der Liste')
        check(q.locator('a.row').count()==2,f'{lang} {w}px: beide Fälle sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vers_ruhend_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
