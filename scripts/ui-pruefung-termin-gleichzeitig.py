# [CLAUDE] UI-Test (01.11.2026, Backlog 818, Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“ – Prüftermin planen): A (Leitung) hat die
# Fahrzeugakte offen, B (Inhaber) plant inzwischen die UVV auf Tag +10. A trägt Tag +20 ein und speichert → Konflikt: Akte neu geladen,
# Hinweis „Eingaben stehen noch im Formular“, A's Datum steht im Formular und ist markiert (gleiches Feld → Warnung); B's Termin ist
# nicht überschrieben; zweites Speichern übernimmt A's Datum. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pt.inhaber','display_name':'PT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    u=api('POST','/api/users',{'username':'pt.leitung','display_name':'PT Leitung','role':'fleet','environment':env})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    vid=api('POST','/api/vehicles',{'plate':'PT-UI 1','vin':'WDB96340310818001','site':'Dortmund'})['d']['id']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        rr=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Sonstiges','title':f'Prüfung {lang} {w}','last_done_date':day(-300),'interval_months':12,'evidence':'UI-Test 818'})
        check(rr['s']==201,f'{lang} {w}px: Prüftermin angelegt ({rr["s"]} {rr["d"]})'); R=rr['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pt.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{vid}'); q.reload(); sel=f'form[data-hsplan="{R}"]'
        q.wait_for_selector(sel,state='attached',timeout=15000)
        q.evaluate(f"(() => {{ let d = document.querySelector('{sel}').closest('details'); while (d) {{ d.open = true; d = d.parentElement && d.parentElement.closest('details'); }} }})()")
        check(api('POST',f'/api/maintenance/{R}/plan',{'planned_date':day(10),'expected_planned_date':None})['s']==200,f'{lang} {w}px: B plant Tag +10')
        q.fill(f'{sel} [name=planned_date]',day(20)); q.locator(f'{sel} button').first.click()
        hint=''
        try: q.wait_for_selector(f'{sel} [data-ctlost]',timeout=10000); hint=q.inner_text(f'{sel} [data-ctlost]')
        except Exception as ex: print('   ',ex)
        check(KEPT[lang] in hint and '⚠' in hint,f'{lang} {w}px: Hinweis mit Warnung „gleiches Feld“ ({hint[:50]!r})')
        check(q.input_value(f'{sel} [name=planned_date]')==day(20) and q.evaluate(f"document.querySelector('{sel} [name=planned_date]').classList.contains('ct-other')"),f'{lang} {w}px: eigenes Datum bleibt, Feld markiert')
        cur=[m for m in api('GET',f'/api/vehicles/{vid}')['d']['maintenance'] if m['id']==R][0]['planned_date']
        check(cur==day(10),f'{lang} {w}px: Termin von B nicht still überschrieben ({cur})')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator(sel).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pt_gleichzeitig_{lang}_{w}.png')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.locator(f'{sel} button').first.click(); q.wait_for_timeout(1500)
        cur=[m for m in api('GET',f'/api/vehicles/{vid}')['d']['maintenance'] if m['id']==R][0]['planned_date']
        check(cur==day(20),f'{lang} {w}px: zweites Speichern übernimmt das eigene Datum ({cur})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
