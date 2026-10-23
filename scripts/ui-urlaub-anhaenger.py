# [CLAUDE] UI-Test (23.10.2026, Teilagenten Urlaubsrückkehr / Anhänger abgestellt):
# (1) 250 ungelesene Hinweise: Liste zeigt 100, „Ältere laden“ hängt die nächsten an (keine Dublette), bis alle erreichbar sind; Hinweistext ohne Selbstverweis.
# (2) Abfahrtskontrolle der Zugmaschine bei gesperrtem Anhänger: Meldung „Anhänger …: gesperrt – nicht fahren“ (Antwort coupled_locked).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs, /__dev/seed-notifications).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MORE={'de':'Ältere laden','uk':'Завантажити старіші','en':'Load older'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ua.inhaber','display_name':'UA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ua.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=a.evaluate("async () => (await fetch('/__dev/seed-notifications?n=250&user=ua.inhaber', { method: 'POST' })).json()")
    check(r.get('seeded')==250,f'250 Hinweise angelegt ({r})')
    # Gespann: Lkw + Anhänger, Sperre am Anhänger
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Anhänger Kennzeichen;Fahrzeugart\nUA-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM722779;UA-AH 1;Lkw\nUA-AH 1;Dortmund;Krone;2016;VAK656EBDG1613179;;ANH'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Gespann importiert')
    c=api('POST','/api/cases',{'vehicle_id':'VIN:VAK656EBDG1613179','description':'UI-Test Bremse Anhänger','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':'ua-lock-1'})
    check(c['s']==201,f"Sperre am Anhänger ({c['s']})")
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    ins=api('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':'VIN:WMA15SZZ2HM722779','request_key':'ua-ins-'+str(uuid.uuid4()),'items':items})
    check(ins['s']==201 and (ins['d'].get('coupled_locked') or {}).get('plate')=='UA-AH 1',f"Kontrolle meldet Gespann-Sperre ({ins['d'].get('coupled_locked') if ins['d'] else ins})")
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ua.inhaber','password':PW},None])
        q.goto(B+'/#/inbox'); q.wait_for_selector('#nlist',timeout=15000); q.wait_for_timeout(300)
        n0=q.locator('#nlist .row').count(); check(n0==100,f'{lang}/{w}: 100 Hinweise angezeigt ({n0})')
        btn=q.locator('#nmore'); check(btn.count()==1 and MORE[lang] in btn.inner_text(),f'{lang}/{w}: Knopf „{MORE[lang]}“')
        check(MORE[lang] in q.inner_text('#ntrunc'),f'{lang}/{w}: Hinweistext nennt den Knopf')
        btn.click(); q.wait_for_timeout(700); n1=q.locator('#nlist .row').count(); check(n1==200,f'{lang}/{w}: nach „Ältere laden“ 200 ({n1})')
        q.locator('#nmore').click(); q.wait_for_timeout(700); n2=q.locator('#nlist .row').count()
        ids=q.evaluate("[...document.querySelectorAll('#nlist [data-open]')].map(a=>a.dataset.open)")
        tot=q.evaluate(JS,['GET','/api/notifications?count=1',None,None])['d']['counts']['unread']
        check(n2==tot and len(ids)==len(set(ids)) and q.locator('#nmore').count()==0,f'{lang}/{w}: alle {tot} ungelesenen erreichbar, keine Dublette, Knopf weg ({n2})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#nlist .row').nth(n2-1).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ua_inbox_{lang}_{w}.png')
        # angehängte Zeile quittieren funktioniert (Handler gebunden)
        b=q.locator('#nlist .row').nth(150).locator('[data-ack]')
        if b.count(): b.click(); q.wait_for_selector('#nlist',timeout=10000); q.wait_for_timeout(400)
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
