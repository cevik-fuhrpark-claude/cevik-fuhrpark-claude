# [CLAUDE] UI-Test (31.10.2026, Backlog 787, Blickwinkel „Werkstatt-Tablet im Freien“): In der Fahrzeugauswahl (Meldeformular)
# ragt kein Kennzeichen aus seiner Karte – vorher am Tablet (820 px) 5 Spalten à 151 px bei 147 px breitem Schild.
# Breiten 390/600/820/1024/1366 px, Schrift 100 % und 125 %, am Handy weiterhin 2 Spalten, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fw.inhaber','display_name':'FW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:3]
    rows='\n'.join(f'SZ-YC 5{sfx}{i};Dortmund;MAN;2016;WMA15SZZ2HM7{sfx}{i}{i};Lkw' for i in range(6))
    check(api('POST','/api/vehicles/import','Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+rows,'text/csv')['s']==200,'Fahrzeuge importiert')
    api('PATCH','/api/me',{'language':'de'})
    for (w,h) in [(390,844),(600,960),(820,1180),(1024,768),(1366,900)]:
        for fs in ['100%','125%']:
            ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fw.inhaber','password':PW},None])
            for rt in ['#/new']:
                q.goto(B+'/'+rt); q.wait_for_selector('.vehpick label',timeout=15000)
                q.add_style_tag(content=f'html{{font-size:{fs}}}'); q.wait_for_timeout(150)
                r=q.evaluate("""() => { const ls=[...document.querySelectorAll('.vehpick label')]; const bad=ls.filter(l=>{const p=l.querySelector('.plate'); if(!p) return false; const a=l.getBoundingClientRect(), b=p.getBoundingClientRect(); return b.right>a.right-1 || l.scrollWidth>l.clientWidth+1;});
                  const tops=new Set(ls.map(l=>Math.round(l.getBoundingClientRect().top))); const perRow=ls.filter(l=>Math.round(l.getBoundingClientRect().top)===[...tops][0]).length;
                  return {n:ls.length, bad:bad.length, perRow, sw: document.documentElement.scrollWidth<=innerWidth+1}; }""")
                check(r['n']>=6 and r['bad']==0,f'{w}/{fs} {rt}: kein Kennzeichen ragt aus der Karte ({r["bad"]} von {r["n"]})')
                if w==390 and fs=='100%': check(r['perRow']==2,f'{w} {rt}: am Handy 2 Spalten ({r["perRow"]})')
                check(r['sw'],f'{w}/{fs} {rt}: ohne Querscrollen')
                if SHOTS: q.screenshot(path=f"{SHOTS}/fahrzeugwahl-{w}-{fs.strip('%')}-{rt.strip('#/')}.png")
            check(not errs,f'{w}/{fs}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
