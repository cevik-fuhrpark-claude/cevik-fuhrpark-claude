# [CLAUDE] UI-Test (09.11.2026, Backlog 1224, Blickwinkel „Fuhrparkleitung bearbeitet Bußgeldbescheide am PC“): im Schreiben
# „Nächstes offenes Schreiben“ in der Reihenfolge der Liste (nach Frist), am Ende wieder das erste offene, nach „Eingestellt“ weiter zum
# nächsten; Betrag in der Liste. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Nächstes offenes Schreiben','uk':'Наступний відкритий лист','en':'Next open letter'}
NONE={'de':'Keine weiteren offenen Schreiben.','uk':'Інших відкритих листів немає.','en':'No other open letters.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nx.inhaber','display_name':'NX Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'nx.inhaber','password':PW})
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    fl=api('POST','/api/users',{'username':'nx.leitung','display_name':'NX Leitung','role':'fleet','environment':envn})
    check(fl['s']==201,f'Leitung angelegt ({fl["s"]})'); api('POST','/api/invite/accept',{'token':fl['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'nx.leitung','password':PW})
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ')
    d=lambda n:(datetime.date.today()+datetime.timedelta(days=n)).isoformat()
    ids={}
    for k,(ref,amt,due) in enumerate([('NX-2',55,d(20)),('NX-1',70,d(10)),('NX-3',None,d(30))]):
        r=api('POST','/api/fines',{'kind':'bussgeldbescheid','authority':'Stadt NX','reference':ref,'offense_type':'parken','offense_at':off,'plate_in_letter':'NX-AB '+str(k+1),'amount_eur':amt,'response_due':due,'request_key':'nx'+str(k)})
        check(r['s']==201,f'Schreiben {ref} ({r["s"]})'); ids[ref]=r['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'nx.leitung','password':PW}])
        q.goto(B+'/#/fines'); q.wait_for_selector('[data-famt]',timeout=15000)
        amts=q.eval_on_selector_all('[data-famt]','els=>els.map(e=>e.textContent)')
        check(len(amts)==2 and any('70' in x for x in amts) and any('55' in x for x in amts),f'{lang} {w}px: Betrag in der Liste ({amts})')
        order=q.eval_on_selector_all('a.row[href^="#/fines/"]','els=>els.map(e=>e.getAttribute("href").split("/").pop())')
        q.goto(B+'/#/fines/'+ids['NX-1']); q.wait_for_selector('#fnext',timeout=15000)
        tx=q.inner_text('#fnext')
        check(TXT[lang] in tx and 'NX-AB 1' in tx,f'{lang} {w}px: nach NX-1 kommt NX-2 (Kennzeichen NX-AB 1) – {tx!r}')
        check(q.get_attribute('[data-fnext]','href')=='#/fines/'+ids['NX-2'],f'{lang} {w}px: Verweis auf das nächste nach Frist')
        check(order[:3]==[ids['NX-1'],ids['NX-2'],ids['NX-3']],f'{lang} {w}px: Reihenfolge wie in der Liste')
        q.click('[data-fnext]'); q.wait_for_function(f"() => location.hash.endsWith('{ids['NX-2']}') && document.querySelector('[data-fnext]') && document.querySelector('[data-fnext]').getAttribute('href').endsWith('{ids['NX-3']}')",timeout=15000)
        check(True,f'{lang} {w}px: Klick öffnet das nächste, dort weiter zu NX-3')
        q.goto(B+'/#/fines/'+ids['NX-3']); q.wait_for_function(f"() => location.hash.endsWith('{ids['NX-3']}') && document.querySelector('[data-fnext]') && document.querySelector('[data-fnext]').getAttribute('href').endsWith('{ids['NX-1']}')",timeout=15000)
        check(True,f'{lang} {w}px: am Ende wieder das erste offene')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/bg_naechstes_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Status „Eingestellt“ → Verweis führt weiter; zuletzt keines mehr offen
    api('PATCH','/api/me',{'language':'de'})
    ctx=br.new_context(viewport={'width':1366,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'nx.leitung','password':PW}])
    for ref in ['NX-1','NX-2']:
        q.goto(B+'/#/fines/'+ids[ref]); q.wait_for_function("(r) => document.querySelector('#sf') && document.querySelector('dl.kv') && document.querySelector('dl.kv').innerText.includes(r)", arg=ref, timeout=15000); q.wait_for_timeout(300)
        q.evaluate("()=>document.querySelector('#sf').closest('details').open=true")
        q.select_option('#sf select[name=status]','eingestellt'); q.fill('#sf input[name=note]','Verfahren eingestellt'); q.click('#sf button')
        q.wait_for_function("() => document.querySelector('#fnext') && /→ Eingestellt/.test(document.body.innerText)",timeout=15000)
    tx=q.inner_text('#fnext')
    check('NX-AB 3' in tx and 'noch 1 offen' in tx,f'nach zwei eingestellten bleibt NX-3 ({tx!r})')
    q.goto(B+'/#/fines/'+ids['NX-3'])
    try: q.wait_for_function("(t) => document.querySelector('#fnext') && document.querySelector('#fnext').innerText.includes(t) && !document.querySelector('[data-fnext]')", arg=NONE['de'], timeout=15000); okn=True
    except Exception: okn=False
    check(okn,'letztes offenes: „Keine weiteren offenen Schreiben“ ('+(q.inner_text('#fnext') if q.query_selector('#fnext') else '–')+')')
    check(not errs,f'Statuswechsel: keine Skriptfehler {errs[:2]}')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
