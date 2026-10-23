# [CLAUDE] UI-Test (23.10.2026, Backlog 194): drei Fahrzeuge „verkehrsunsicher“ an dieselbe Disposition ohne Push-Gerät → ein gebündelter Befund
# „Dringende Benachrichtigungen an dieselben Empfänger …“ mit allen Kennzeichen in der App-Sprache (DE/UK/EN), 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Nachrichten: 3, Empfänger: 1. Betroffen: BB-UND 1941, BB-UND 1942, BB-UND 1943.','uk':'повідомлень: 3, отримувачів: 1. Стосується: BB-UND 1941','en':'notifications: 3, recipients: 1. Affected: BB-UND 1941, BB-UND 1942, BB-UND 1943.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bb.inhaber','display_name':'BB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'bb.dispo','display_name':'Ilka Bündel-Dispo','role':'dispatch','environment':envn})
    check(u['s'] in (200,201),'Disposition angelegt '+str(u['s']))
    if u['s'] in (200,201):
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B)
        check(q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s']==200,'Einladung angenommen'); c0.close()
    for i in (1,2,3):
        VID=f'VIN:WDB9634031088194{i}'
        api('POST','/api/vehicles',{'vin':f'WDB9634031088194{i}','plate':f'BB-UND 194{i}','site':'Dortmund'})
        r=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'UVV','last_done_date':str(today-datetime.timedelta(days=300)),'interval_months':12,'evidence':'UI-Test Bündel'})
        check(r['s'] in (200,201),f'UVV {i} angelegt '+str(r['s']))
        r2=api('POST',f"/api/maintenance/{r['d']['id']}/complete",{'done_date':str(today-datetime.timedelta(days=1)),'evidence':'UI-Test Protokoll','result':'verkehrsunsicher'})
        check(r2['s']==200,f'Prüfung {i} verkehrsunsicher '+str(r2['s']))
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'bb.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master'); q.wait_for_function("()=>document.body.innerText.includes('Ilka Bündel-Dispo')", timeout=15000)
        check(EXP[lang] in q.inner_text('body'),f'{lang} {w}px: {EXP[lang]}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.get_by_text('Ilka Bündel-Dispo').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/buendel_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
