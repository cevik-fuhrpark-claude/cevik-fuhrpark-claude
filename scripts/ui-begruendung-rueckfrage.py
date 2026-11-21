# [CLAUDE] UI-Test (21.11.2026, Backlog 1648, Blickwinkel „Leitung storniert einen Nachweis mit zu kurzer oder leerer Begründung“):
# Fahrzeugakte → Massenspeicher-Auslesung stornieren: Begründung nur aus Leerzeichen bzw. „ab“ wird nicht an den Server geschickt, sondern
# erneut erfragt (Hinweis „Bitte eine Begründung eingeben“ bzw. „zu kurz“ in DE/UK/EN); eine gültige Begründung storniert die Auslesung.
# 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EMPTY={'de':'Bitte eine Begründung eingeben.','uk':'Будь ласка, введіть обґрунтування.','en':'Please enter a reason.'}
SHORT={'de':'Begründung ist zu kurz','uk':'Обґрунтування закоротке','en':'Reason is too short'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310164801'; VID='VIN%3A'+VIN
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'TZ-AB 1648','site':'Dortmund','kind':'lkw'}); check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    today=datetime.date.today()
    n=0
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        d=api('POST','/api/tacho/downloads',{'kind':'massenspeicher','vehicle_id':'VIN:'+VIN,'downloaded_on':(today-datetime.timedelta(days=n)).isoformat(),'evidence':f'M_1648_{n}'})
        check(d['s']==201, f'Auslesung {n} angelegt {d["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'tz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+VID); q.reload()
        try: q.wait_for_selector('[data-tcancel]',state='attached',timeout=15000)
        except Exception: pass
        msgs=[]; answers=['   ','ab',f'Tippfehler Datum {n}']
        def on_dialog(dlg):
            msgs.append(dlg.message)
            if answers: dlg.accept(answers.pop(0))
            else: dlg.dismiss()
        q.on('dialog', on_dialog)
        posted=[]; q.on('response', lambda r: posted.append(r.status) if r.request.method=='POST' and '/cancel' in r.url else None)
        q.evaluate("()=>{ let e=document.querySelector('[data-tcancel]'); while(e){ if(e.tagName==='DETAILS') e.open=true; e=e.parentElement; } }")
        b=q.locator('[data-tcancel]').first; b.scroll_into_view_if_needed(); b.click()
        q.wait_for_timeout(1500)
        check(len(msgs)==3, f'{lang} {w}px: dreimal gefragt ({len(msgs)})')
        check(len(msgs)>1 and msgs[1].startswith(EMPTY[lang]), f'{lang} {w}px: Hinweis leer {msgs[1:2]}')
        check(len(msgs)>2 and msgs[2].startswith(SHORT[lang]), f'{lang} {w}px: Hinweis zu kurz {msgs[2:3]}')
        check(posted==[200], f'{lang} {w}px: genau eine Server-Anfrage, storniert ({posted})')
        q.wait_for_timeout(500)
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/br_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
