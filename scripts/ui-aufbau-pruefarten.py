# [CLAUDE] UI-Test (28.10.2026): Backlog 574/576 (Ladebordwand/Ladekran, Termin ohne Intervall). Braucht einen frischen Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL', 'http://localhost:8787'); PW='Sicheres-Passwort-2026'; SH=os.environ.get('CFP_SHOTS') or '/tmp'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B); api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'mk.inhaber','display_name':'MK Inhaber'})
    api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW}); api('POST','/api/login',{'username':'mk.inhaber','password':PW})
    vid=api('POST','/api/vehicles',{'plate':'DO-MK 1','vin':'WDB96340310776011','site':'Dortmund'})['d']['id']
    for b in [{'kind':'Verbandkasten','next_due_date':'2027-03-31','evidence':'Ablaufdatum'},{'kind':'Ladebordwand','last_done_date':'2026-02-01','interval_months':12,'evidence':'Prüfbuch LBW'},{'kind':'Ladekran','next_due_date':'2026-12-31','evidence':'Kranbuch'},{'kind':'Sonstiges','title':'Kühlaggregat','last_done_date':'2026-01-15','interval_months':12,'evidence':'Wartungsheft'}]:
        r=api('POST',f'/api/vehicles/{vid}/maintenance',b); 
        if r['s']!=201: fails.append(('anlegen',b['kind'],r))
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'mk.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+vid); q.reload(); q.wait_for_selector('form[data-mdone]',state='attached',timeout=30000); q.wait_for_timeout(400)
        txt=q.inner_text('main')
        for k in {'de':['Ladebordwand','Ladekran'],'uk':['Гідроборт','Кран-маніпулятор'],'en':['Tail lift','Loader crane']}[lang]:
            if k not in txt: fails.append((lang,w,'fehlt',k))
        if ' – Kühlaggregat' not in txt: fails.append((lang,w,'Titel fehlt'))
        # Formular „Prüftermin anlegen“: Titel nur bei „Sonstiges“ sichtbar und Pflicht (Backlog 577)
        fv=q.evaluate("()=>{const f=document.getElementById('mf'); f.closest('details').open=true; const r=[]; for (const k of ['UVV','Sonstiges']) { f.kind.value=k; f.kind.dispatchEvent(new Event('change')); const ti=f.querySelector('#mftitle'); r.push([f.querySelector('[data-mftitle]').hidden, ti.required, ti.disabled]); } return r; }")
        if fv!=[[True,False,True],[False,True,False]]: fails.append((lang,w,'Titelfeld',fv))
        n=q.evaluate("()=>document.querySelectorAll('[data-mdonenoint]').length")
        req=q.evaluate("()=>[...document.querySelectorAll('form[data-mdone]')].filter(f=>f.querySelector('input[name=next_due_date]')?.required).length")
        if n!=2 or req!=2: fails.append((lang,w,'hinweis',n,req))  # Verbandkasten + Ladekran ohne Intervall
        q.evaluate("()=>{const f=document.querySelector('[data-mdonenoint]').closest('form'); f.hidden=false; f.scrollIntoView();}"); q.wait_for_timeout(200)
        if q.evaluate('document.documentElement.scrollWidth')>w: fails.append((lang,w,'sw'))
        if errs: fails.append((lang,w,errs[:1]))
        if w==390: q.screenshot(path=f'{SH}/m576_{lang}.png')
        ctx.close()
    br.close()
print('FEHLER' if fails else 'alles grün', fails)
raise SystemExit(1 if fails else 0)
