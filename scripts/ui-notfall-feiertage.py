# [CLAUDE] UI-Test (27.10.2026, Backlog 434, Blickwinkel „Allerheiligen und Weihnachten: Büro zu – ist für die Fahrer überhaupt jemand erreichbar?“):
# „Rufnummern pflegen“ nennt Feiertage der nächsten 60 Tage, an denen wegen „nicht an Feiertagen“ zusätzlich keine Nummer „für alle Fahrzeuge“
# besetzt ist (Vergleich mit holidayGaps aus /emhours.js im Browser – unabhängig vom Prüfdatum). DE/UK/EN bei 390/820/1366 px, kein Querscrollen,
# keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Feiertage ohne besetzte Nummer','uk':'Святкові дні без доступного номера','en':'Public holidays without a staffed number'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nf.inhaber','display_name':'NF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'nf.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['tz.inhaber','nw.inhaber','nb.inhaber','au.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000
    ids=[]
    for body in [{'kind':'dispo','label':f'FT-Büro {R}','phone':f'0231 {R} 1','scope':'all','hours_days':'1234567','hours_from':'06:00','hours_to':'18:00','hours_no_holidays':True,'hours_holiday_state':'NW'},
                 {'kind':'werkstatt','label':f'FT-Nacht {R}','phone':f'0231 {R} 2','scope':'all','hours_days':'1234567','hours_from':'18:00','hours_to':'06:00','hours_no_holidays':True}]:
        r=api('POST','/api/emergency/contacts',body); check(r['s']==201,f'Rufnummer angelegt {r["s"]} {r["d"]}'); ids.append(r['d'].get('id') if r['d'] else None)
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/emergency/edit'); m.reload(); m.wait_for_selector('#emcount',timeout=15000)
        exp=m.evaluate("""async () => { const { holidayGaps } = await import('/emhours.js'); const d = await (await fetch('/api/emergency/contacts')).json();
          return holidayGaps(d.contacts.filter((c) => c.scope === 'all').map((c) => c.hours), new Date(), 60); }""")
        got=m.evaluate("() => [...document.querySelectorAll('[data-emholgap]')].map((x) => [x.getAttribute('data-emholgap'), x.textContent])")
        if exp:
          check(m.locator('#emholgaps').count()==1 and TITLE[lang] in m.inner_text('#emholgaps'),f'{lang} {w}px: Abschnitt Feiertage sichtbar')
          check([g[0] for g in got]==[x['day'] for x in exp],f'{lang} {w}px: Tage wie berechnet {[g[0] for g in got]}')
          check(all(all(f'{a}–{b}' in g[1] for a,b in x['ranges']) or x['all'] for g,x in zip(got,exp)),f'{lang} {w}px: Zeiten genannt')
        else:
          check(m.locator('#emholgaps').count()==0,f'{lang} {w}px: kein Feiertag in den nächsten 60 Tagen – kein Abschnitt')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS and m.locator('#emholgaps').count(): m.locator('#emholgaps').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/notfall_feiertage_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    for cid in ids:
        if cid: api('POST',f'/api/emergency/contacts/{cid}/archive',{})
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
