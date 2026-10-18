# [CLAUDE] UI-Test: Bußgeld-Erfassung ohne Aktenzeichen – geht die Antwort der ersten Anlage verloren (Funkloch) und wird erneut auf
# „Speichern“ getippt, entsteht kein zweiter Vorgang (request_key je Formular, Migration 0061). DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bw.inhaber','display_name':'BW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'BW-UI 1','vin':'WDB96340310777771','site':'Dortmund'})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        auth=f'Behörde {lang} {w}'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bw.inhaber','password':PW}])
        state={'n':0}
        def handle(route):
            state['n']+=1
            if state['n']==1:
                route.fetch(); route.abort('internetdisconnected')  # Server legt an, Antwort geht verloren
            else: route.continue_()
        q.route('**/api/fines',lambda route: handle(route) if route.request.method=='POST' else route.continue_())
        q.goto(B+'/#/fines'); ok=True
        try:
          q.wait_for_selector('#nf',state='attached',timeout=15000)
          q.evaluate("() => { const d = document.querySelector('#nf').closest('details'); if (d) d.open = true; }")
          q.fill('#nf [name=authority]',auth); q.fill('#nf [name=offense_at]','2026-10-01T08:30'); q.fill('#nf [name=plate_in_letter]','BW-UI 1')
          q.locator('#nf button[type=submit], #nf button').last.click()
          q.wait_for_timeout(1500)
          q.locator('#nf button[type=submit], #nf button').last.click()
          q.wait_for_url('**/#/fines/*',timeout=10000)
        except Exception as ex: ok=False; print('   ',ex)
        check(ok and state['n']>=2,f'{lang}/{w}: zweiter Versuch geöffnet ({state["n"]} Sendungen)')
        rows=[f for f in api('GET','/api/fines')['d']['fines'] if f.get('authority')==auth]
        check(len(rows)==1,f'{lang}/{w}: genau ein Bußgeldvorgang ({len(rows)})')
        if SHOTS and ok: q.wait_for_timeout(500); q.screenshot(path=f'{SHOTS}/bw_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
