# [CLAUDE] UI-Test (28.10.2026): Backlog 583 (Kühlauflieger: Prüfarten Kühlgerät, ATP, Temperaturschreiber). Braucht einen frischen Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL', 'http://localhost:8787'); PW='Sicheres-Passwort-2026'; SH=os.environ.get('CFP_SHOTS') or '/tmp'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
L={'de':['Kühlgerät','ATP-Bescheinigung','Temperaturschreiber'],'uk':['Холодильна установка (ТО)','Свідоцтво ATP','Термописач'],'en':['Reefer unit (service)','ATP certificate','Temperature recorder']}
fails=[]
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B); api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kp.inhaber','display_name':'KP Inhaber'})
    api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW}); api('POST','/api/login',{'username':'kp.inhaber','password':PW})
    vid=api('POST','/api/vehicles',{'plate':'DO-KP 1','vin':'WDB96340310776012','site':'Dortmund'})['d']['id']
    for b in [{'kind':'Kühlgerät','last_done_date':'2026-04-15','interval_months':12,'evidence':'Wartungsnachweis'},{'kind':'ATP-Bescheinigung','next_due_date':'2029-06-30','evidence':'ATP-Bescheinigung'},{'kind':'Temperaturschreiber','next_due_date':'2027-02-01','evidence':'Prüfbericht'}]:
        r=api('POST',f'/api/vehicles/{vid}/maintenance',b)
        if r['s']!=201: fails.append(('anlegen',b['kind'],r))
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kp.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+vid); q.reload(); q.wait_for_selector('form[data-mdone]',state='attached',timeout=30000); q.wait_for_timeout(400)
        txt=q.inner_text('main')
        for k in L[lang]:
            if k not in txt: fails.append((lang,w,'fehlt',k))
        opts=q.evaluate("()=>[...document.getElementById('mf').kind.options].map(o=>o.textContent)")
        for k in L[lang]:
            if k not in opts: fails.append((lang,w,'Auswahl fehlt',k))
        if q.evaluate('document.documentElement.scrollWidth')>w: fails.append((lang,w,'sw'))
        if errs: fails.append((lang,w,errs[:1]))
        if w==390: q.screenshot(path=f'{SH}/m583_{lang}.png', full_page=True)
        ctx.close()
    br.close()
print('FEHLER' if fails else 'alles grün', fails)
raise SystemExit(1 if fails else 0)
