# [CLAUDE] UI-Test (13.11.2026, Backlog 1434, Blickwinkel „Prüftermin war gestern – Durchführung nicht eingetragen“):
# verstrichener Prüf-/Wartungstermin ohne Auftrag: Marke in Prüftermin-Übersicht und Fahrzeugakte (mit Hinweis), Gruppe in „Heute zu tun“. DE/UK/EN 390/820/1366 px.
import os, datetime
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tu.inhaber','display_name':'TU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; me_un=(me.get('user') or me).get('username')
    R=os.getpid()%100000; n=0
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'PT-V {R%900}{n}'; vin=f'WPT{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'UVV','last_done_date':iso(-380),'interval_months':12,'evidence':'Prüfbuch UVV (Test)'})
        check(r['s']==201,f'{lang}/{w}: UVV angelegt'); rid=r['d']['id']
        check(api('POST',f'/api/maintenance/{rid}/plan',{'planned_date':iso(-1)})['s']==200,f'{lang}/{w}: Termin gestern')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/login',{'username':me_un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return S.STRINGS[l]; }", lang)
        # Prüftermin-Übersicht
        q.goto(B+'/#/maintenance'); q.reload()
        sel=f'a[href*="{vin}"] [data-mplanpast]'
        q.wait_for_selector(sel,timeout=20000); mk=q.locator(sel).first
        check(T['mplan_past'] in mk.inner_text(),f'{lang}/{w}: Übersicht „{T["mplan_past"]}“')
        check(mk.evaluate('e => e.getClientRects().length')==1,f'{lang}/{w}: Marke einzeilig')
        if SHOTS: mk.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-uebersicht-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Übersicht ohne Querscrollen')
        # Fahrzeugakte
        q.goto(B+f'/#/vehicles/{vid}'); q.wait_for_selector('[data-mplanpasttxt]',timeout=20000)
        tx=q.locator('[data-mplanpasttxt]').first
        check(T['mplan_past_hint'][:40] in tx.inner_text() and q.locator('[data-mplanpast]').count()>=1,f'{lang}/{w}: Akte mit Marke und Hinweis')
        if SHOTS: tx.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-akte-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Akte ohne Querscrollen')
        # Heute zu tun
        q.goto(B+'/#/'); q.wait_for_selector(f'text={T["todo_mplan_passed"]}',timeout=20000)
        sm=q.locator('summary',has_text=T['todo_mplan_passed']).first; sm.click()
        det=q.locator('details',has=sm).first
        check(pl in det.inner_text(),f'{lang}/{w}: „Heute zu tun“ nennt {pl}')
        if SHOTS: sm.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-heute-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        # Durchführung erfasst → Termin weg
        check(api('POST',f'/api/maintenance/{rid}/complete',{'done_date':iso(-1),'evidence':'Prüfbuch UVV (Test 2)'})['s']==200,f'{lang}/{w}: Durchführung erfasst')
        a.goto(B+f'/#/vehicles/{vid}'); a.reload(); a.wait_for_selector('h1',timeout=20000); a.wait_for_timeout(800)
        check(a.locator('[data-mplanpast]').count()==0,f'{lang}/{w}: nach dem Erfassen keine Marke')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
