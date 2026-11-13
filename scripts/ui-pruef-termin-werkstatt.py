# [CLAUDE] UI-Test (13.11.2026, Backlog 1437, Blickwinkel „Werkstatt kommt morgens rein – die UVV von gestern ist noch nicht eingetragen“):
# Werkstatt-Startseite nennt verstrichene Prüf-/Wartungstermine (Frist weit voraus) mit Datum, Hinweis und Sprung ins Formular „Erledigt“. DE/UK/EN 390/820/1366 px.
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
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'PW-T {R%900}{n}'; vin=f'WPW{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Feuerlöscher','last_done_date':iso(-30),'interval_months':24,'evidence':'Prüfplakette (Test)'})
        check(r['s']==201,f'{lang}/{w}: Feuerlöscher angelegt'); rid=r['d']['id']
        check(api('POST',f'/api/maintenance/{rid}/plan',{'planned_date':iso(-1)})['s']==200,f'{lang}/{w}: Termin gestern')
        un=f'pw.ws{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'PW Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(u['s'] in (200,201),f'{lang}/{w}: Werkstattkonto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { chip: S.STRINGS[l].mplan_past, head: S.STRINGS[l].todo_mplan_passed, hint: S.STRINGS[l].mplan_past_hint }; }", lang)
        q.goto(B+'/#/'); q.reload()
        q.wait_for_selector('a[data-wsmmiss]',timeout=20000)
        r=q.locator('a[data-wsmmiss]').filter(has_text=pl)
        check(r.count()==1,f'{lang}/{w}: Zeile für {pl}')
        tx=r.inner_text() if r.count() else ''
        d=iso(-1); dd=f'{d[8:10]}.{d[5:7]}.'
        check(T['chip'] in tx and (dd in tx or f'{d[8:10]}/{d[5:7]}/' in tx) and len(tx)>0,f'{lang}/{w}: „… ⚠ {T["chip"]} {dd}“')
        check(r.locator('.chip.kritisch').count()==1,f'{lang}/{w}: rote Markierung')
        hint=q.locator('#wsmmiss')
        check(hint.count()==1 and T['head'][:20] in hint.inner_text(),f'{lang}/{w}: Überschrift „{T["head"][:30]}…“')
        check(T['hint'][:30] in q.locator('#wsmmiss + p').inner_text(),f'{lang}/{w}: Hinweis unter der Überschrift')
        if SHOTS: hint.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-werkstatt-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        # Zeile führt ins Formular „Erledigt“
        if r.count():
            r.click(); q.wait_for_selector(f'form[data-mdone="{rid}"]:not([hidden])',timeout=20000)
            check('?done=' in q.url,f'{lang}/{w}: Sprung ins Formular „Erledigt“ ({q.url[-30:]})')
            check(q.locator(f'form[data-mdone="{rid}"] input[name="done_date"]').input_value()==iso(-1),f'{lang}/{w}: Datum = geplanter Termin vorbelegt')
        ctx.close()
        api('POST',f'/api/maintenance/{rid}/complete',{'done_date':iso(-1),'evidence':'Prüfplakette (Test 2)'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
