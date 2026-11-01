# [CLAUDE] UI-Test (01.11.2026, Backlog 824, Blickwinkel „Fahrer mit Zugmaschine + Anhänger – Abfahrtskontrolle für beide“): In der
# Abfahrtskontrolle einer Zugmaschine mit fest gekoppeltem Anhänger zeigt jeder Mangel die Auswahl „Mangel betrifft“ (beide Kennzeichen);
# „Anhänger“ gewählt → gesendet mit on_coupled, Antwort nennt den Anhänger, Auftrag liegt am Anhänger. Fahrzeug ohne Kopplung → keine Auswahl.
# Wechsel Zugmaschine → Anhänger setzt „gekoppelt“ zurück (hieße sonst die Zugmaschine). DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/
# Skriptfehler. Backlog 825: Auftrag am Anhänger nennt „durchgeführt an Zugfahrzeug …“. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TK='VIN:WDB9634031L824001'; TR='VIN:WDB9634031L824002'; SOLO='VIN:WDB9634031L824003'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gs.inhaber','display_name':'GS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r1=api('POST','/api/vehicles',{'vin':TK[4:],'plate':'GS-ZM 824','site':'Dortmund','kind':'lkw','trailer_plate':'GS-AN 824'})
    r2=api('POST','/api/vehicles',{'vin':TR[4:],'plate':'GS-AN 824','site':'Dortmund','kind':'anhaenger'})
    api('POST','/api/vehicles',{'vin':SOLO[4:],'plate':'GS-SO 824','site':'Dortmund','kind':'lkw'})
    check(r1['s'] in (200,201,409) and r2['s'] in (200,201,409),f'Fahrzeuge angelegt ({r1["s"]}/{r2["s"]})')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        posts=[]; q.on('request',lambda r: posts.append(r.post_data_json) if r.method=='POST' and r.url.endswith('/api/inspections') else None)
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gs.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        wrap='.checkitem[data-key=reifen_zustand] .cplwrap'
        # 1) Fahrzeug ohne Kopplung: Mangel ohne Auswahl
        q.select_option('#v',SOLO)
        q.click('.checkitem[data-key=reifen_zustand] label.bad'); q.wait_for_timeout(100)
        check(q.locator(wrap).is_hidden(),f'{lang}/{wd}: ohne gekoppeltes Fahrzeug keine Auswahl')
        q.click('#dcswnew') if q.locator('#dcsw').count() else None
        # 2) Zugmaschine: Auswahl mit beiden Kennzeichen, Anhänger wählen
        q.evaluate("sessionStorage.clear()"); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v',TK)
        q.click('.checkitem[data-key=reifen_zustand] label.bad'); q.wait_for_timeout(100)
        check(q.locator(wrap).is_visible(),f'{lang}/{wd}: Auswahl „Mangel betrifft“ sichtbar')
        opts=q.evaluate(f"[...document.querySelectorAll('{wrap} option')].map((o) => o.textContent)")
        check(len(opts)==2 and 'GS-ZM 824' in opts[0] and 'GS-AN 824' in opts[1],f'{lang}/{wd}: Optionen nennen beide Kennzeichen ({opts})')
        q.select_option('#cpl_reifen_zustand','coupled'); q.fill('input[name=reifen_zustand__note]','Test 824 Reifen Anhänger')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        lw=q.evaluate("(() => { const l = document.querySelector('.checkitem[data-key=reifen_zustand] .cplwrap label'); return l.getClientRects().length === 1; })()")
        check(lw,f'{lang}/{wd}: Beschriftung in einer Zeile')
        if SHOTS: q.locator(wrap).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gespann-{lang}-{wd}.png')
        # 3) Wechsel auf den Anhänger: „gekoppelt“ zurückgesetzt, Optionen gedreht; zurück und erneut wählen
        q.select_option('#v',TR); q.wait_for_timeout(150)
        if q.locator('#dcswkeep').count(): q.click('#dcswkeep')
        o2=q.evaluate(f"[...document.querySelectorAll('{wrap} option')].map((o) => o.textContent)")
        check(q.input_value('#cpl_reifen_zustand')=='' and 'GS-AN 824' in o2[0] and 'GS-ZM 824' in o2[1],f'{lang}/{wd}: Wechsel auf Anhänger setzt Auswahl zurück ({o2})')
        q.select_option('#v',TK); q.wait_for_timeout(150)
        if q.locator('#dcswkeep').count(): q.click('#dcswkeep')
        q.select_option('#cpl_reifen_zustand','coupled')
        q.evaluate("document.querySelectorAll('#f .checkitem').forEach((r) => { if (!r.querySelector('input[type=radio]:checked')) r.querySelector('input[value=ok]').click(); })")
        n0=len(posts)
        with q.expect_response(lambda r: r.url.endswith('/api/inspections') and r.request.method=='POST',timeout=15000) as ri: q.click('#sb')
        res=ri.value.json()
        body=posts[n0] if len(posts)>n0 else {}
        it=[x for x in body.get('items',[]) if x.get('key')=='reifen_zustand']
        check(body.get('vehicle_id')==TK and it and it[0].get('on_coupled') is True,f'{lang}/{wd}: gesendet mit on_coupled')
        check((res.get('coupled_defects') or {}).get('plate')=='GS-AN 824',f'{lang}/{wd}: Antwort nennt den Anhänger ({res.get("coupled_defects")})')
        fu=[f for f in res.get('followups',[]) if f and f.get('id')]
        cv=q.evaluate(JS,['GET','/api/cases/'+fu[0]['id']])['d'] if fu else None
        check(bool(cv) and cv['vehicle']['plate']=='GS-AN 824',f'{lang}/{wd}: Auftrag am Anhänger')
        # Backlog 825: Auftrag am Anhänger nennt die Kontrolle der Zugmaschine
        if fu:
            q.goto(B+'/#/cases/'+fu[0]['id']); q.wait_for_timeout(300); q.reload(); q.wait_for_selector('[data-srcinsp]',timeout=15000)
            vt=q.inner_text('[data-srcvia]') if q.locator('[data-srcvia]').count() else ''
            check('GS-ZM 824' in vt,f'{lang}/{wd}: Auftrag nennt die Kontrolle der Zugmaschine ({vt!r})')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: Auftrag ohne Querscrollen')
            if SHOTS: q.locator('[data-srcinsp]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gespann-auftrag-{lang}-{wd}.png')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
