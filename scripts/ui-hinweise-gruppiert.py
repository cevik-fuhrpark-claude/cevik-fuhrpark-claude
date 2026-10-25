# [CLAUDE] UI-Test (25.10.2026, Backlog 306): Passen mehrere Hinweise zur Beschreibung im Meldeformular, steht der wichtigste
# (Rauch/Brand vor Unfall vor Reifenpanne …) oben und offen, die weiteren nur mit Titel und Knopf „Schritte anzeigen“; von Hand
# Aufgeklapptes bleibt beim Weitertippen offen; ein einzelner Hinweis bleibt ohne Knopf; Klick sendet nicht ab.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Ölspur + Reifenpanne + Rauch (in dieser Reihenfolge getippt) → Brand zuerst
MULTI={'de':'Öl läuft aus, Reifen geplatzt, Rauch aus dem Motorraum','uk':'Тече масло, лопнуло колесо, дим з двигуна','en':'Oil leaking, tyre burst, smoke from the engine'}
ONE={'de':'Plane links eingerissen','uk':'Тент порваний','en':'Curtain torn on the left'}
SHOW={'de':'Schritte anzeigen','uk':'Показати кроки','en':'Show steps'}
HIDE={'de':'Schritte ausblenden','uk':'Сховати кроки','en':'Hide steps'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hg.inhaber','display_name':'HG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nHG-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'hg.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        st=lambda: q.evaluate("""() => { const f = document.querySelector('#f'); const ps = [...f.querySelectorAll(':scope > .panel[id]')].filter((p) => !p.hidden);
          return { sum: !document.querySelector('#hintsum').hidden, ids: ps.map((p) => p.id), open: ps.map((p) => !p.querySelector('ul').hidden),
            btn: ps.map((p) => (p.querySelector('[data-hintfold]') || {}).textContent || '') }; }""")
        q.fill('#d',ONE[lang]); q.wait_for_timeout(100); r=st()
        check(r['ids']==['tarp'] and r['open']==[True] and r['btn']==[''] and not r['sum'],f'{lang}/{w}: ein Hinweis offen, ohne Knopf/Sammelhinweis {r}')
        q.fill('#d',MULTI[lang]); q.wait_for_timeout(100); r=st()
        check(r['ids'][:1]==['fire'] and set(r['ids'])>={'fire','flat','leak'},f'{lang}/{w}: Rauch/Brand zuerst {r["ids"]}')
        check(r['sum'] and r['open'][0] and not any(r['open'][1:]),f'{lang}/{w}: wichtigster offen, weitere eingeklappt {r["open"]}')
        check(r['btn'][0]=='' and all(b==SHOW[lang] for b in r['btn'][1:]),f'{lang}/{w}: Knopf „{SHOW[lang]}“ an den weiteren')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#hintsum').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/hinweise-{lang}-{w}.png')
        sec=r['ids'][1]; hash0=q.evaluate('location.hash')
        q.click(f'#{sec} [data-hintfold]'); q.wait_for_timeout(100); r=st()
        check(r['open'][r['ids'].index(sec)] and r['btn'][r['ids'].index(sec)]==HIDE[lang],f'{lang}/{w}: Klick klappt „{sec}“ auf')
        check(q.evaluate('location.hash')==hash0 and q.input_value('#d')==MULTI[lang],f'{lang}/{w}: Klick sendet nicht ab')
        q.type('#d',' ok'); q.wait_for_timeout(100); r=st()
        check(r['open'][r['ids'].index(sec)],f'{lang}/{w}: bleibt beim Weitertippen offen')
        q.click(f'#{sec} [data-hintfold]'); q.wait_for_timeout(100); r=st()
        check(not r['open'][r['ids'].index(sec)],f'{lang}/{w}: zweiter Klick klappt wieder ein')
        q.fill('#d',ONE[lang]); q.wait_for_timeout(100); r=st()
        check(r['ids']==['tarp'] and r['open']==[True] and r['btn']==[''],f'{lang}/{w}: zurück auf einen Hinweis → wieder offen ohne Knopf')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
