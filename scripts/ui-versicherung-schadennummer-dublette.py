# [CLAUDE] UI-Test (04.11.2026, Backlog 998, Blickwinkel „Versicherer schreibt zum selben Schaden erneut, Kollegin legt den Fall am zweiten Vorgang an“):
# Zwei Vorgänge desselben Lkw, Versicherungsfälle mit „Schadennummer: KS 2024/… 456“ bzw. „ks2024-….456“ → Vorgang zeigt ⚠️-Hinweis mit Link zum anderen Vorgang,
# Bezeichnung „Schadennummer:“ nicht gespeichert; Gespann (Zugmaschine/Anhänger, gleiche Nummer) nur ℹ️-Infohinweis, kein ⚠️.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000; today=a.evaluate("()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date())")
    ah=f'WDB96340330{R:05d}A'[:17]; lk=f'WDB96340330{R:05d}L'[:17]
    r=api('POST','/api/vehicles',{'plate':f'SN-A {R%10000}','vin':ah,'kind':'anhaenger','site':'Dortmund'}); check(r['s'] in (200,201),f'Anhänger {r["s"]}')
    r=api('POST','/api/vehicles',{'plate':f'SN-L {R%10000}','vin':lk,'kind':'lkw','site':'Dortmund','trailer_plate':f'SN-A {R%10000}'}); check(r['s'] in (200,201),f'Lkw {r["s"]}')
    def case(v,d):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:'+v,'description':d,'priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':f'sn{R}{d}'}); check(r['s']==201,f'Vorgang {r["s"]} {r["d"]}'); return r['d']['id']
    c1=case(lk,'Seitenschaden links beim Spurwechsel'); c2=case(lk,'Seitenschaden links (zweite Meldung)'); c3=case(ah,'Plane eingerissen beim Spurwechsel')
    base={'insurer':'Straßen-Versicherung AG','reported_on':today,'evidence':'Schreiben des Versicherers'}
    for cid,no in [(c1,f'Schadennummer: KS 2024/{R} 456'),(c2,f'ks2024-{R}.456')]:
        r=api('PUT',f'/api/cases/{cid}/claim',{**base,'claim_no':no}); check(r['s']==200,f'Versicherungsfall {r["s"]} {r["d"]}')
    r=api('PUT',f'/api/cases/{c3}/claim',{**base,'claim_no':f'KS-2024-{R}-456'}); check(r['s']==200,f'Gespann-Fall {r["s"]}')
    d=api('GET',f'/api/cases/{c1}')['d']; check(d['claim']['claim_no']==f'KS 2024/{R} 456','Bezeichnung nicht gespeichert')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},service_workers='block'); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+f'/#/cases/{c2}'); m.reload(); m.wait_for_selector('[data-claimsamenodup]',timeout=20000)
        dup=m.eval_on_selector_all('[data-claimsamenodup] a','as=>as.map(a=>a.getAttribute("href"))')
        # Gespann: c1 und c2 sind am Lkw, c3 am gekoppelten Anhänger → c3 nur ℹ️ (wenn offen), nie ⚠️
        check(dup==[f'#/cases/{c1}'],f'{lang} {w}px: ⚠️ nur mit Link zum anderen Vorgang desselben Lkw {dup}')
        info=m.eval_on_selector_all('[data-claimsameno]','ps=>ps.length')
        check(info==1,f'{lang} {w}px: ℹ️ Gespann-Hinweis ({info})')
        el=m.query_selector('[data-claimsamenodup]'); el.scroll_into_view_if_needed()
        if SHOTS: m.screenshot(path=f'{SHOTS}/schadennummer_dublette_{lang}_{w}.png')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
