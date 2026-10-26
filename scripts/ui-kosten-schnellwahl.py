# [CLAUDE] UI-Test Backlog 413 (Blickwinkel „Jahresabschluss: Kosten 2026 für die Steuerberatung“): Mehr → Kosten je Fahrzeug →
# Schnellwahl „Laufendes Jahr“, „Vorjahr“, „Letzte 12 Monate“ setzt Von/Bis, markiert die aktive Wahl (aria-pressed) und lädt den Bericht.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, Knöpfe nicht umbrochen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ks.inhaber','display_name':'KS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ks.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ym=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()).slice(0, 7)"); y=int(ym[:4])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ks.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/costs'); q.wait_for_selector('#crq',timeout=15000)
        check(q.get_attribute('[data-crq="12m"]','aria-pressed')=='true',f'{lang}/{w}: Standard = letzte 12 Monate markiert')
        for k,f,t in [('prev',f'{y-1}-01',f'{y-1}-12'),('year',f'{y}-01',ym),('12m',None,ym)]:
            q.click(f'[data-crq="{k}"]'); q.wait_for_function(f"() => document.querySelector('[data-crq=\"{k}\"]')?.getAttribute('aria-pressed') === 'true'",timeout=15000)
            fr=q.input_value('#cr input[name=from]'); to=q.input_value('#cr input[name=to]')
            check((f is None or fr==f) and to==t,f'{lang}/{w}: {k} → {fr}–{to}')
            if SHOTS and k=='prev': q.screenshot(path=f'{SHOTS}/kosten_schnellwahl_{lang}_{w}.png')
        check(q.evaluate(noscroll),f'{lang}/{w}: kein Querscrollen')
        split=q.evaluate("() => [...document.querySelectorAll('[data-crq]')].filter((x) => x.getClientRects().length > 1).length")
        check(split==0,f'{lang}/{w}: Knöpfe nicht umbrochen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
