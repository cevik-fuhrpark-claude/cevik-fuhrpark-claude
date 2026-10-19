# [CLAUDE] UI-Test (19.10.2026): Fahrerakte – Nachweise-Tabelle bei 390 px gestapelt (kein Umbruch mitten im Wort, kein Querscrollen),
# App-Konto nachträglich in „Stammdaten bearbeiten“ verknüpfen; „Fahrer anlegen“ bietet nur freie Konten der Ansicht an.
# EN 390 px, UK 390 px, DE 1440 px; keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; env=(me.get('user') or me).get('environment') or 'production'
    u1=api('POST','/api/users',{'username':'fk.fahrer1','display_name':'Fahrer Eins','role':'driver','environment':env})['d']['id']
    u2=api('POST','/api/users',{'username':'fk.fahrer2','display_name':'Fahrer Zwei','role':'driver','environment':env})['d']['id']
    u3=api('POST','/api/users',{'username':'fk.fahrertest','display_name':'Fahrer Testumgebung','role':'driver','environment':'test' if env=='production' else 'production'})['d']['id']
    d1=api('POST','/api/drivers',{'display_name':'Akte Verknüpft','user_id':u1})['d']['id']
    d2=api('POST','/api/drivers',{'display_name':'Akte Ohne Konto'})['d']['id']
    for k,extra in [('fuehrerschein',{'number':'B072RRE2I55','license_classes':'C, CE','valid_until':'2030-01-31'}),('unterweisung',{'title':'Bescheinigung Ladungssicherung Unterweisung','valid_until':'2027-03-31'}),('code95',{'valid_until':'2028-06-30'})]:
        r=api('POST',f'/api/drivers/{d2}/documents',{'kind':k,'evidence':'Kopie Personalakte Ordner 3',**extra}); check(r['s'] in (200,201),f'Nachweis {k} ({r["s"]})')
    for lang,w,h in [('en',390,844),('uk',390,844),('de',1440,900)]:
      api('PATCH','/api/me',{'language':lang})
      ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW}])
      q.goto(B+'/#/drivers'); q.wait_for_selector('#ndf select[name=user_id]',state='attached',timeout=15000)
      opts=q.eval_on_selector_all('#ndf select[name=user_id] option','os=>os.map(o=>o.value)')
      check(u2 in opts and u1 not in opts and u3 not in opts,f'{lang}/{w}: „Fahrer anlegen“ nur freie Konten der Ansicht')
      q.goto(B+f'/#/drivers/{d2}'); q.wait_for_selector('#edf',state='attached',timeout=15000)
      ov=q.evaluate("() => { const t = document.querySelector('table'); return t ? t.scrollWidth - t.parentElement.clientWidth : 0; }")
      check(ov<=1,f'{lang}/{w}: Nachweise-Tabelle ohne Überbreite ({ov})')
      if w<=420: check(q.evaluate("() => !!document.querySelector('table.stack')"),f'{lang}/{w}: Nachweise gestapelt')
      if SHOTS: q.screenshot(path=f'{SHOTS}/fahrerakte_{lang}_{w}.png',full_page=True)
      if lang=='de':
        q.click('#edf >> xpath=..//summary') if q.locator('#edf').is_hidden() else None
        q.select_option('#edf select[name=user_id]',u2); q.click('#edf button')
        q.wait_for_timeout(800)
        d=api('GET',f'/api/drivers/{d2}')['d']['driver']; check(d.get('user_id')==u2,'Konto nachträglich verknüpft')
      check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
      check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
      ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
