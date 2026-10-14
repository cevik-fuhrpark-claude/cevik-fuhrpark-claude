# [CLAUDE] Browser-Lasttest Management-Panel: N synthetische offene Agentenbefunde (nur lokaler Dev-Server, /__dev/seed-findings),
# misst Antwortgröße /api/master, Render-Zeit des Panels und CSV-Erzeugung im Browser (Handy 390 px, PC 1366 px).
# Aufruf: frischer Dev-Server (sh scripts/restart-dev.sh), dann python3 scripts/ui-lastpanel.py [N=3000] [--check]
# --check: Fehlercode, wenn das Rendern am PC > 3 s oder die CSV > 2 s dauert (großzügig: Headless-Browser im Container).
import os, sys, time
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'
ARGS=[a for a in sys.argv[1:] if not a.startswith('--')]; N=int(ARGS[0]) if ARGS else 3000; CHECK='--check' in sys.argv
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lp.inhaber','display_name':'LP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('POST',f'/__dev/seed-findings?n={N}&env=production')['d']['seeded']==N,f'{N} Befunde angelegt')
    t0=time.perf_counter(); r=a.evaluate("async()=>{const r=await fetch('/api/master');const t=await r.text();return [r.status,t.length,JSON.parse(t).findings.length]}"); dt=time.perf_counter()-t0
    check(r[0]==200 and r[2]>=N,f'/api/master: {r[2]} Befunde, {r[1]/1024:.0f} KB, {dt*1000:.0f} ms (lokal, ohne Netz)')
    for w,h in [(390,844),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'lp.inhaber','password':PW}])
        q.goto(B+'/#/'); q.wait_for_selector('h1')
        t0=time.perf_counter(); q.goto(B+'/#/master'); q.wait_for_selector('#afcsv'); q.wait_for_function(f"()=>document.body.innerText.includes('Lasttest-Befund {N}')"); dr=time.perf_counter()-t0
        rows=q.evaluate("()=>document.querySelectorAll('.list .row').length")
        check(rows>=N,f'{w}px: {rows} Zeilen gerendert in {dr*1000:.0f} ms')
        if CHECK and w==1366: check(dr<3,f'{w}px: Rendern < 3 s')
        t0=time.perf_counter()
        with q.expect_download() as dl: q.click('#afcsv')
        dc=time.perf_counter()-t0
        lines=open(dl.value.path(),encoding='utf-8-sig',newline='').read().strip().split('\r\n')
        check(len(lines)==N+1,f'{w}px: CSV {len(lines)-1} Zeilen in {dc*1000:.0f} ms')
        if CHECK and w==1366: check(dc<2,f'{w}px: CSV < 2 s')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{w}px: kein Querscrollen')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('Lasttest Panel: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
