# [CLAUDE] UI-Test Backlog 409 (Blickwinkel „Jahresende: Verträge, die im 1. Quartal enden“): Verträge → „bis Ende nächstes Quartal“ →
# Hinweis, nur Verträge mit Ende/Kündigungsfrist bis dahin, eigenes Datum, „alle Termine“, Stichtag blendet die Auswahl aus.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); d=lambda n: str(today+datetime.timedelta(days=n))
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
rows='() => document.querySelectorAll(".list a.row").length'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vf.inhaber','display_name':'VF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for i,(kind,end,notice) in enumerate([('leasing',d(20),None),('miete',d(400),None),('versicherung',None,None)]):
        vin=f'WDB9634031059{7000+i}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'VF-Q {409+i}','site':'Dortmund'})
        b={'kind':kind,'partner':f'UI-{kind}','evidence':'UI-Test','start_date':d(-300)}
        if end: b['end_date']=end
        r=api('POST',f'/api/vehicles/VIN:{vin}/contracts',b); check(r['s']==201,f'Vertrag {kind} {r["s"]}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vf.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctendsby',timeout=15000)
        check(q.evaluate(rows)==3,f'{lang}/{w}: ohne Auswahl alle 3')
        q.click('[data-ctq="1"]'); q.wait_for_selector('[data-ct-endsby]',timeout=10000)
        check(q.evaluate(rows)==1 and 'UI-' in q.inner_text('.list'),f'{lang}/{w}: bis Ende nächstes Quartal → 1 Vertrag')
        check(q.input_value('#ctendsby')!='' and q.is_visible('#ctendsbyx'),f'{lang}/{w}: Datum gesetzt, „alle Termine“ sichtbar')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/vf_{lang}.png',full_page=True)
        check(q.evaluate(noscroll),f'{lang}/{w}: ohne Querscrollen')
        wsplit=q.evaluate("""() => [...document.querySelectorAll('#ctendsby')].map((e) => e.closest('label').querySelector('span').getClientRects().length)""")
        check(all(x==1 for x in wsplit),f'{lang}/{w}: Beschriftung einzeilig')
        q.fill('#ctendsby',d(500)); q.dispatch_event('#ctendsby','change'); q.wait_for_timeout(800)
        check(q.evaluate(rows)==2,f'{lang}/{w}: eigenes Datum → 2 (ohne Ende nie enthalten)')
        q.click('#ctendsbyx'); q.wait_for_timeout(800)
        check(q.evaluate(rows)==3 and not q.query_selector('[data-ct-endsby]'),f'{lang}/{w}: alle Termine → 3')
        q.click('[data-ctq="0"]'); q.wait_for_selector('[data-ct-endsby]',timeout=10000)
        q.fill('#ctasof',d(-10)); q.dispatch_event('#ctasof','change'); q.wait_for_selector('[data-ct-asof]',timeout=10000)
        check(not q.query_selector('#ctendsby') and not q.query_selector('[data-ct-endsby]') and q.evaluate(rows)==3,f'{lang}/{w}: Stichtag hebt Auswahl auf')
        q.click('#ctasofx'); q.wait_for_selector('#ctendsby',timeout=10000)
        check(q.input_value('#ctendsby')=='',f'{lang}/{w}: nach Stichtag aufheben leer')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
