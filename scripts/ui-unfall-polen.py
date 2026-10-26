# [CLAUDE] UI-Test Blickwinkel „Unfall in Polen mit Fremdbeteiligung“ (26.10.2026, Backlog 390–394): Meldeformular zeigt den Unfall-Hinweis
# auch bei „Zusammenstoß/зіткнення/collision“ mit dem Schritt „Unfallbericht fotografieren“; Vorgang zeigt das polnische Gegner-Kennzeichen
# ohne „D“-Länderband. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Zusammenstoß mit polnischem Pkw am Rastplatz','uk':'Зіткнення з польським легковиком, заповнили європротокол','en':'Collision with a Polish car at the rest area'}
REP={'de':'Unfallbericht','uk':'протокол ДТП','en':'accident report'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pl.inhaber','display_name':'PL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ0HP108390'; api('POST','/api/vehicles',{'plate':'PL-UF 390','vin':vin,'site':'Dortmund'})
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':TXT['uk'],'priority':'mittel','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    check(r['s']==201,'Vorgang angelegt'); cid=r['d']['id']
    c=api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Eigene Vers AG','reported_on':__import__('datetime').date.today().isoformat(),'evidence':'Europäischer Unfallbericht (Foto)','opponent_plate':'PO 12345','opponent_insurer':'PZU SA','expected_updated_at':None})
    check(c['s']==200,f'Versicherungsfall ({c["s"]} {c["d"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pl.inhaber','password':PW},None])
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        vis=q.evaluate("!document.querySelector('#acc').hidden")
        check(vis,f'{lang}/{w}: Unfall-Hinweis bei „{TXT[lang]}“')
        check(REP[lang] in q.inner_text('#acc'),f'{lang}/{w}: Schritt Unfallbericht fotografieren')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        if SHOTS: q.locator('#acc').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pl_form_{lang}_{w}.png')
        q.fill('#d','')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('[data-coplate]',timeout=15000)
        cp=q.locator('[data-coplate]')
        check(cp.inner_text().strip()=='PO 12345' and cp.locator('xpath=ancestor::dd//span[@class="eu"]').count()==0,f'{lang}/{w}: Gegner-Kennzeichen ohne D-Band')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS and w==390: cp.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pl_case_{lang}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
