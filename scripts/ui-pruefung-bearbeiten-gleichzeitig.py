# [CLAUDE] UI-Test (01.11.2026, Backlog 819, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“ – Prüftermin bearbeiten): A (Leitung) hat
# die Fahrzeugakte offen, B (Inhaber) ändert inzwischen das Intervall auf 6 Monate. A korrigiert den Nachweis und speichert → Konflikt:
# Akte neu geladen, Hinweis „Eingaben stehen noch im Formular“, A's Nachweis steht im Formular, B's Intervall sichtbar und markiert;
# zweites Speichern übernimmt beides (Intervall von B wird nicht still auf 12 zurückgesetzt). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT={'de':'Ihre Eingaben stehen noch im Formular','uk':'ваші дані залишилися у формі','en':'your entries are still in the form'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); day=lambda n:(today+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pb.inhaber','display_name':'PB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    u=api('POST','/api/users',{'username':'pb.leitung','display_name':'PB Leitung','role':'fleet','environment':env})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    vid=api('POST','/api/vehicles',{'plate':'PB-UI 1','vin':'WDB96340310819001','site':'Dortmund'})['d']['id']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        rr=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Sonstiges','title':f'Prüfung {lang} {w}','last_done_date':day(-300),'interval_months':12,'evidence':'UI-Test 819'})
        check(rr['s']==201,f'{lang} {w}px: Prüftermin angelegt ({rr["s"]} {rr["d"]})'); R=rr['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pb.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{vid}'); q.reload(); sel=f'form[data-medit="{R}"]'
        q.wait_for_selector(sel,state='attached',timeout=15000)
        q.evaluate(f"(() => {{ let d = document.querySelector('{sel}').closest('details'); while (d) {{ d.open = true; d = d.parentElement && d.parentElement.closest('details'); }} }})()")
        check(api('PATCH',f'/api/maintenance/{R}',{'interval_months':'6'})['s']==200,f'{lang} {w}px: B ändert das Intervall auf 6')
        q.fill(f'{sel} [name=evidence]',f'Prüfbuch {lang} {w}'); q.locator(f'{sel} button').first.click()
        hint=''
        try: q.wait_for_selector(f'{sel} [data-ctlost]',timeout=10000); hint=q.inner_text(f'{sel} [data-ctlost]')
        except Exception as ex: print('   ',ex)
        check(KEPT[lang] in hint and '⚠' not in hint,f'{lang} {w}px: Hinweis „Eingaben stehen noch im Formular“ ohne Warnung ({hint[:50]!r})')
        check(q.input_value(f'{sel} [name=evidence]')==f'Prüfbuch {lang} {w}' and q.input_value(f'{sel} [name=interval_months]')=='6' and q.evaluate(f"document.querySelector('{sel} [name=interval_months]').classList.contains('ct-other')"),f'{lang} {w}px: eigener Nachweis bleibt, Intervall von B sichtbar und markiert')
        m=[m for m in api('GET',f'/api/vehicles/{vid}')['d']['maintenance'] if m['id']==R][0]
        check(m['interval_months']==6 and m['evidence']=='UI-Test 819',f'{lang} {w}px: nichts still überschrieben ({m["interval_months"]}/{m["evidence"]})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pb_gleichzeitig_{lang}_{w}.png')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.locator(f'{sel} button').first.click(); q.wait_for_timeout(1500)
        m=[m for m in api('GET',f'/api/vehicles/{vid}')['d']['maintenance'] if m['id']==R][0]
        check(m['interval_months']==6 and m['evidence']==f'Prüfbuch {lang} {w}',f'{lang} {w}px: zweites Speichern übernimmt Nachweis, Intervall von B bleibt ({m["interval_months"]}/{m["evidence"]})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
