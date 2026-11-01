# [CLAUDE] UI-Test (01.11.2026, Backlog 814, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig dasselbe Bußgeld“):
# A (Leitung) hat das Schreiben offen, B (Inhaber) korrigiert inzwischen den Betrag. A ändert das Aktenzeichen und speichert →
# Versionskonflikt: Ansicht neu geladen, Hinweis „Eingaben stehen noch im Formular“, A's Aktenzeichen steht noch im Formular,
# B's Betrag ist sichtbar und markiert; zweites Speichern übernimmt beides. Danach dasselbe für „Fahrer bestätigen“ (Nachweis bleibt).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT={'de':'Ihre Eingaben stehen noch im Formular','uk':'ваші дані залишилися у формі','en':'your entries are still in the form'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bg.inhaber','display_name':'BG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    u=api('POST','/api/users',{'username':'bg.leitung','display_name':'BG Leitung','role':'fleet','environment':env})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    due=(datetime.date.today()+datetime.timedelta(days=20)).isoformat(); due2=(datetime.date.today()+datetime.timedelta(days=35)).isoformat()
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt BG','reference':f'AZ-BG-{lang}-{w}','offense_type':'parken','offense_at':off,'plate_in_letter':'BG-XX 1','amount_eur':30,'response_due':due,'request_key':f'bg-{lang}-{w}'})
        check(fi['s']==201,f'{lang} {w}px: Schreiben erfasst ({fi["s"]})'); FID=fi['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bg.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/fines/'+FID); q.reload(); q.wait_for_selector('#uf',state='attached',timeout=15000)
        q.evaluate("document.querySelector('#uf').closest('details').open=true")
        # B korrigiert den Betrag
        v=api('GET','/api/fines/'+FID)['d']['fine']['version']
        check(api('POST',f'/api/fines/{FID}/commands',{'action':'update','payload':{'amount_eur':77},'expected_version':v})['s']==200,f'{lang} {w}px: B ändert den Betrag')
        q.fill('#uf [name=reference]',f'AZ-NEU-{lang}-{w}'); q.click('#uf button.btn')
        q.wait_for_selector('#uf [data-ctlost]',timeout=10000)
        check(KEPT[lang] in q.inner_text('#uf [data-ctlost]'),f'{lang} {w}px: Hinweis „Eingaben stehen noch im Formular“')
        amt=q.input_value('#uf [name=amount_eur]'); ref=q.input_value('#uf [name=reference]')
        check(ref==f'AZ-NEU-{lang}-{w}' and amt.startswith('77') and q.evaluate("document.querySelector('#uf [name=amount_eur]').classList.contains('ct-other')"),f'{lang} {w}px: eigenes Aktenzeichen bleibt, Betrag von B sichtbar und markiert ({ref}/{amt})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/bussgeld_gleichzeitig_{lang}_{w}.png',full_page=True)
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.click('#uf button.btn'); q.wait_for_timeout(1200)
        f=api('GET','/api/fines/'+FID)['d']['fine']
        check(f['amount_eur']==77 and f['reference']==f'AZ-NEU-{lang}-{w}',f'{lang} {w}px: zweites Speichern gelingt, Betrag von B bleibt ({f["amount_eur"]}/{f["reference"]})')
        check(q.locator('#uf [data-ctlost]').count()==0,f'{lang} {w}px: Hinweis nach Erfolg weg')
        # Fahrer bestätigen: B verlängert inzwischen die Frist
        q.wait_for_selector('#cf',timeout=10000)
        q.fill('#cf [name=driver_name_note]','Fahrer laut Tourenplan'); q.fill('#cf [name=evidence]',f'Tourenplan {lang} {w}')
        check(api('POST',f'/api/fines/{FID}/commands',{'action':'update','payload':{'response_due':due2},'expected_version':f['version']})['s']==200,f'{lang} {w}px: B verlängert die Frist')
        q.click('#cf button.btn'); q.wait_for_selector('#cf [data-ctlost]',timeout=10000)
        check(q.input_value('#cf [name=evidence]')==f'Tourenplan {lang} {w}' and q.input_value('#cf [name=driver_name_note]')=='Fahrer laut Tourenplan',f'{lang} {w}px: Nachweis und Fahrer bleiben im Formular')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.click('#cf button.btn'); q.wait_for_timeout(1200)
        f=api('GET','/api/fines/'+FID)['d']['fine']
        check(f['status']=='fahrer_ermittelt' and f['response_due']==due2,f'{lang} {w}px: Fahrer bestätigt, Frist von B bleibt ({f["status"]}/{f["response_due"]})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
