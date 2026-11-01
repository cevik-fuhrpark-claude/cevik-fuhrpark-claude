# [CLAUDE] UI-Test (01.11.2026, Backlog 820, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“ – Master-Eingang): A hat den Master-Eingang
# offen, B erledigt inzwischen einen Eintrag. A tippt bei diesem Eintrag „Gesehen“ → Konflikt: Ansicht wird neu geladen, Meldung
# „… die Ansicht ist aktualisiert“ (nicht „Bitte neu laden“), der Eintrag zeigt keinen „Gesehen“-Knopf mehr. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, env]) => { const h = { 'content-type': 'application/json', 'x-cfp': '1' }; if (env) h['x-cfp-env'] = env;
  const r = await fetch(path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'die Ansicht ist aktualisiert','uk':'вигляд оновлено','en':'the view has been refreshed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,env=None: a.evaluate(JS,[m,pa,b,env])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'mg.inhaber','display_name':'MG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'mg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('POST','/api/vehicles',{'vin':'WDB96340310820001','plate':'MG-HA 1','site':'Dortmund'})['s'] in (200,201),'Fahrzeug')
    for i in range(12):
        k=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310820001','description':f'UI-Test 820: Bremsleitung undicht {i}','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':f'mg-krit-{i}'},'production')
        check(k['s'] in (200,201),'kritischer Vorgang '+str(k['s']))
    check(api('POST','/api/agent/run',None,'production')['s']==200,'Agent gelaufen (Übergaben an den Master-Eingang)')
    n=len([x for x in (api('GET','/api/master',None,'production')['d'].get('inbox') or []) if x.get('decision_status')=='offen'])
    print('   offene Einträge:',n)
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'mg.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_env','production')")
        q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/master'); q.reload(); q.wait_for_selector('[data-dec][data-st="gesehen"]',timeout=15000); q.wait_for_load_state('networkidle')
        ev=q.locator('[data-dec][data-st="gesehen"]').first.get_attribute('data-dec')
        r=api('POST',f'/api/master/{ev}/decision',{'decision_status':'erledigt'},'production')
        check(r['s']==200,f'{lang} {w}px: B erledigt den Eintrag ({r["s"]})')
        q.locator(f'[data-dec="{ev}"][data-st="gesehen"]').click()
        tx=''
        try: q.wait_for_selector('.toast',timeout=10000); q.wait_for_timeout(500); tx=' '.join(q.locator('.toast').all_inner_texts())
        except Exception as ex: print('   ',ex)
        check(TXT[lang] in tx,f'{lang} {w}px: Meldung „Ansicht aktualisiert“ ({tx[:70]!r})')
        q.wait_for_timeout(500)
        check(q.locator(f'[data-dec="{ev}"][data-st="gesehen"]').count()==0,f'{lang} {w}px: Eintrag nach dem Neuladen ohne „Gesehen“-Knopf')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/master_gleichzeitig_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        c.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
