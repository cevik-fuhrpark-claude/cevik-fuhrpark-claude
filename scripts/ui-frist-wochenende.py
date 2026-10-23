# [CLAUDE] UI-Test (23.10.2026): Bußgeld-Antwortfrist am Wochenende.
# Liste/Startseite zeigen die Frist mit Wochentag und „(Wochenende)“, die Detailseite einen Hinweis; im Formular erscheint der Hinweis nur
# bei Samstag/Sonntag. Werktagsfrist ohne Markierung. Gespeicherte Frist bleibt der Tag laut Schreiben.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WE={'de':'(Wochenende)','uk':'(вихідний)','en':'(weekend)'}
HINT={'de':'Wochenende','uk':'вихідний','en':'weekend'}
today=datetime.date.today()
sat=today+datetime.timedelta(days=(5-today.weekday())%7 or 7)
wed=sat+datetime.timedelta(days=4)
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fw.inhaber','display_name':'FW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    base={'kind':'anhoerung','authority':'Stadt Dortmund Bußgeldstelle','offense_type':'geschwindigkeit','offense_at':datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%SZ'),'location':'B1','plate_in_letter':'FW-XX 1','amount_eur':70}
    f1=api('POST','/api/fines',{**base,'reference':'FW-SA','response_due':sat.isoformat()}); check(f1['s']==201,f'Bußgeld Samstag ({f1["s"]})')
    f2=api('POST','/api/fines',{**base,'reference':'FW-MI','response_due':wed.isoformat()}); check(f2['s']==201,f'Bußgeld Mittwoch ({f2["s"]})')
    check(api('GET','/api/fines/'+f1['d']['id'])['d']['fine']['response_due']==sat.isoformat(),'gespeicherte Frist unverändert')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fw.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/fines'); q.wait_for_selector('.list a.row',timeout=15000); q.wait_for_timeout(300)
        rows=q.evaluate("[...document.querySelectorAll('.list a.row')].map(a=>a.innerText)")
        rs=[r for r in rows if 'FW-SA' in r or sat.strftime('%d.%m.%Y') in r or sat.strftime('%d/%m/%Y') in r]
        n_we=sum(1 for r in rows if WE[lang] in r)
        check(n_we==1,f'{lang}/{w}: genau eine Frist als Wochenende markiert ({n_we}: {rows})')
        hints=q.evaluate("[...document.querySelectorAll('[data-due-we]')].map(h=>h.hidden)")
        check(hints==[True],f'{lang}/{w}: Formular-Hinweis zunächst verborgen ({hints})')
        if q.locator('input[name=response_due]').count():
            q.evaluate("(d) => { const el = document.querySelector('input[name=response_due]'); el.value = d; el.dispatchEvent(new Event('input', { bubbles: true })); }", sat.isoformat())
            check(q.evaluate("!document.querySelector('[data-due-we]').hidden"),f'{lang}/{w}: Hinweis bei Samstag')
            q.evaluate("(d) => { const el = document.querySelector('input[name=response_due]'); el.value = d; el.dispatchEvent(new Event('input', { bubbles: true })); }", wed.isoformat())
            check(q.evaluate("document.querySelector('[data-due-we]').hidden"),f'{lang}/{w}: kein Hinweis bei Mittwoch')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Liste ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fw_list_{lang}_{w}.png')
        q.goto(B+'/#/fines/'+f1['d']['id']); q.wait_for_selector('dl',timeout=15000); q.wait_for_timeout(300)
        txt=q.inner_text('main') if q.locator('main').count() else q.inner_text('body')
        check(WE[lang] in txt and HINT[lang] in txt,f'{lang}/{w}: Detail mit Wochenend-Hinweis')
        q.goto(B+'/#/fines/'+f2['d']['id']); q.wait_for_selector('dl',timeout=15000); q.wait_for_timeout(300)
        txt=q.evaluate("[...document.querySelectorAll('dl dd')].map(d=>d.innerText).join('|')")
        check(WE[lang] not in txt,f'{lang}/{w}: Werktagsfrist ohne Markierung')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Detail ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fw_detail_{lang}_{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
