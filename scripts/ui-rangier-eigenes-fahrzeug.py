# [CLAUDE] UI-Test (Backlog 852/853, Blickwinkel „Rangierunfall auf dem eigenen Hof: eigener Lkw gegen eigenen Lkw“):
# Versicherungsfall an Lkw A mit dem Kennzeichen von Lkw B als Unfallgegner → Vorgang A zeigt „gehört zum eigenen Fuhrpark“ mit Link
# zur Fahrzeugakte und „Schaden dort melden“ (bzw. die Vorgänge von B seit dem Schadentag); Vorgang B zeigt den Rückverweis auf A.
# Meldeformular: Unfall-Hinweis nennt das zweite eigene Fahrzeug. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Wiederholbar gegen denselben Dev-Server (eigene Kennzeichen/FIN, request_key je Lauf).
import os, datetime, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OWN={'de':('gehört zum eigenen Fuhrpark','Schaden dort melden','Vorgänge dort seit dem Schadentag'),
     'uk':('належить до власного автопарку','Повідомити про пошкодження','Заявки щодо нього від дня пошкодження'),
     'en':('belongs to our own fleet','Report damage there','Cases there since the day of damage')}
NAMED={'de':'als Unfallgegner genannt','uk':'вказано як другу сторону ДТП','en':'named as the other party'}
ACC={'de':'beim Rangieren auf dem Hof','uk':'під час маневрування на базі','en':'while manoeuvring in the yard'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
RUN=uuid.uuid4().hex[:6]
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    me=api('POST','/api/login',{'username':'ra.inhaber','password':PW})
    if me['s']!=200: # Server schon von anderem Skript eingerichtet – vorhandenes Inhaberkonto des Dev-Servers nutzen
        print('  ℹ Anmeldung ra.inhaber nicht möglich – Dev-Server frisch starten'); raise SystemExit(1)
    today=datetime.date.today().isoformat()
    n=int(RUN,16)%9000+1000
    VA=f'VIN:WDB9634031RA{n:05d}'; VB=f'VIN:WDB9634031RB{n:05d}'; PA=f'RA-A {n}'; PB=f'RA-B {n}'
    check(api('POST','/api/vehicles',{'plate':PA,'vin':VA[4:],'kind':'lkw'})['s']==201,'Lkw A angelegt')
    check(api('POST','/api/vehicles',{'plate':PB,'vin':VB[4:],'kind':'lkw'})['s']==201,'Lkw B angelegt')
    ca=api('POST','/api/cases',{'vehicle_id':VA,'description':f'Rangierschaden auf dem Hof, gegen {PB} gefahren','priority':'mittel','driveability':'fahrbereit','request_key':'ra-a-'+RUN})['d']['id']
    r=api('PUT',f'/api/cases/{ca}/claim',{'insurer':'Eigene Vers AG','reported_on':today,'evidence':'Schadenanzeige','opponent_plate':PB.lower()})
    check(r['s']==200,f'Versicherungsfall mit eigenem Kennzeichen als Gegner ({r["s"]})')
    def page(w,h):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ra.inhaber','password':PW}]); return ctx,q,errs
    for step in ['vor','nach']:
      if step=='nach':
        cb=api('POST','/api/cases',{'vehicle_id':VB,'description':'Delle Tür links, angefahren beim Rangieren','priority':'niedrig','driveability':'fahrbereit','request_key':'ra-b-'+RUN})['d']['id']
      for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w,h in [(390,844),(820,1180),(1366,900)]:
          ctx,q,errs=page(w,h)
          q.goto(B+f'/#/cases/{ca}'); q.wait_for_selector('[data-coown]',state='attached',timeout=15000)
          txt=q.inner_text('[data-coown]')
          check(OWN[lang][0] in txt and PB in txt,f'{step} {lang} {w}px: Hinweis eigenes Fahrzeug')
          if step=='vor':
            check(q.locator('[data-coownnew]').count()==1 and OWN[lang][1] in txt,f'{step} {lang} {w}px: Link „Schaden dort melden“')
          else:
            check(q.locator('[data-coownnew]').count()==0 and q.locator('[data-coowncase]').count()==1 and OWN[lang][2] in txt,f'{step} {lang} {w}px: Vorgang von B verlinkt')
          check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{step} {lang} {w}px: Vorgang A ohne Querscrollen')
          if SHOTS and w==390: q.locator('[data-coown]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rangier-a-{step}-{lang}-{w}.png')
          if step=='nach':
            q.goto(B+f'/#/cases/{cb}'); q.wait_for_selector('[data-conamed]',state='attached',timeout=15000)
            t2=q.inner_text('[data-conamed]')
            check(NAMED[lang] in t2 and PA in t2,f'{lang} {w}px: Vorgang B zeigt Rückverweis auf A')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang B ohne Querscrollen')
            if SHOTS and w in (390,1366): q.locator('[data-conamed]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/rangier-b-{lang}-{w}.png')
          if step=='vor' and w==390:
            q.goto(B+'/#/new'); q.wait_for_selector('#d'); q.fill('#d','Rangierschaden am Hoftor'); q.wait_for_timeout(300)
            check(q.locator('#acc').is_visible() and ACC[lang] in q.inner_text('#acc'),f'{lang} {w}px: Unfall-Hinweis nennt das zweite eigene Fahrzeug')
          check(not errs,f'{step} {lang} {w}px: keine Skriptfehler {errs}')
          ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alle UI-Prüfungen bestanden'); raise SystemExit(1 if fails else 0)
