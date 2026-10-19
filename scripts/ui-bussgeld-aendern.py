# [CLAUDE] UI-Test Bußgeld (18.10.2026): Formular „Frist, Betrag, Aktenzeichen ändern“ (Fristverlängerung laut Schreiben),
# deaktivierter Fahrer-Kandidat ist im Auswahlfeld wählbar (vorher leer → „Fahrer ist erforderlich“), Fahrer der anderen
# Umgebung erscheinen nicht. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Angaben laut Schreiben ändern','uk':'Змінити дані згідно з листом','en':'Change details per letter'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ba.inhaber','display_name':'BA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'ba.inhaber','password':PW})
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    other='test' if envn=='production' else 'production'
    drv=api('POST','/api/users',{'username':'ba.fahrer','display_name':'BA Fahrer Alt','role':'driver','environment':envn})
    api('POST','/api/users',{'username':'ba.fahrer.t','display_name':'BA Fahrer Andere Umgebung','role':'driver','environment':other})
    did=drv['d']['id']
    vin='WDB96340310777901'; VID='VIN:'+vin; api('POST','/api/vehicles',{'plate':'BA-BG 1','vin':vin,'kind':'lkw'})
    asg=api('POST',f'/api/vehicles/{VID}/drivers',{'user_id':did,'evidence':'Test-Zuordnung'}); check(asg['s']==201,f'Zuordnung ({asg["s"]} {asg["d"]})')
    import time; time.sleep(1.5); off=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'); time.sleep(1.5)  # Tat nach Zuordnungsbeginn, vor der Deaktivierung (beendet die Zuordnung)
    due=(datetime.date.today()+datetime.timedelta(days=10)).isoformat(); due2=(datetime.date.today()+datetime.timedelta(days=40)).isoformat()
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':'AZ-BA-1','offense_type':'parken','offense_at':off,'plate_in_letter':'BA-BG 1','amount_eur':35,'response_due':due,'request_key':'ba-1'})
    check(fi['s']==201,f'Schreiben erfasst ({fi["s"]} {fi["d"]})'); FID=fi['d']['id']
    x=api('PATCH',f'/api/users/{did}',{'active':False}); check(x['s']==200,f'Fahrer deaktiviert ({x["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ba.inhaber','password':PW}])
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#uf', state='attached', timeout=15000)
        check(TXT[lang] in q.inner_text('body'),f'{lang} {w}px: Formular „ändern“ vorhanden')
        q.wait_for_function("() => document.querySelectorAll('#drv option').length > 1")
        opts=q.eval_on_selector_all('#drv option','els => els.map(e => e.textContent)')
        check('BA Fahrer Alt' in opts,f'{lang} {w}px: deaktivierter Kandidat wählbar ({opts})')
        check('BA Fahrer Andere Umgebung' not in opts,f'{lang} {w}px: keine Fahrer der anderen Umgebung')
        q.locator('input[name=cand]').first.check()
        check(q.eval_on_selector('#drv','e=>e.value')==did,f'{lang} {w}px: Kandidat setzt das Auswahlfeld')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS and w==390:
            for d in q.locator('#uf').locator('xpath=..').all(): d.evaluate('e=>e.open=true')
            q.screenshot(path=f'{SHOTS}/bg_aendern_{lang}_{w}.png',full_page=True)
        if lang=='de' and w==390:
            q.evaluate("()=>document.querySelector('#uf').closest('details').open=true")
            q.fill('#uf input[name=response_due]',due2); q.locator('#uf button').click(); q.wait_for_timeout(800)
            f=api('GET',f'/api/fines/{FID}')['d']['fine']; check(f['response_due']==due2 and f['amount_eur']==35 and f['reference']=='AZ-BA-1',f'Frist geändert, Rest unverändert ({f["response_due"]}, {f["amount_eur"]}, {f["reference"]})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
