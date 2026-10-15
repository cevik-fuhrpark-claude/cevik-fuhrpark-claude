# [CLAUDE] UI-Test: Hinweise (Glockensymbol) – Reiter-Zähler kommen vom Server (über alle Hinweise, nicht nur die neuesten 100),
# Reiter laden serverseitig gefiltert (?filter=unread|urgent), bei `truncated` steht ein Hinweis mit Anzahl. Antworten werden im Browser
# abgefangen und um Zähler/`truncated` ergänzt (über 100 Hinweise anzulegen wäre langsam) – die Serverseite prüft test/run.mjs.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, json
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TT={'de':'neuesten 100 von 250','uk':'найновіші 100 з 250','en':'newest 100 of 250'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hz.inhaber','display_name':'HZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'hz.inhaber','password':PW})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'hz.inhaber','password':PW}])
        seen=[]
        def fake(route):
            r=route.fetch(); d=r.json(); seen.append(route.request.url)
            if 'count=1' not in route.request.url:
                d['counts']={'all':250,'unread':7,'urgent':3}; d['unread']=7; d['truncated']=d.get('filter')=='all'; d['max']=100
            route.fulfill(response=r, body=json.dumps(d))
        q.route('**/api/notifications*', fake)
        q.goto(B+'/#/inbox'); q.wait_for_selector('#nfil')
        tabs=q.locator('#nfil a').all_inner_texts()
        check(any('(7)' in x for x in tabs) and any('(250)' in x for x in tabs) and any('(3)' in x for x in tabs),f'{lang} {w}px: Reiter-Zähler vom Server {tabs}')
        check(any('filter=unread' in u for u in seen),f'{lang} {w}px: ohne Wahl „Ungelesen“, serverseitig gefiltert')
        check(q.locator('#ntrunc').count()==0,f'{lang} {w}px: Auswahl „Ungelesen“ ungekürzt → kein Hinweis')
        q.locator('[data-nf="all"]').click(); q.wait_for_selector('#ntrunc')
        hint=q.locator('#ntrunc').inner_text()
        check(TT[lang] in hint,f'{lang} {w}px: Hinweis mit Anzahl ({hint[:60]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/hinweise_zaehler_{lang}_{w}.png',full_page=True)
        q.locator('[data-nf="urgent"]').click(); q.wait_for_selector('[data-nf="urgent"].on')
        check(any('filter=urgent' in u for u in seen),f'{lang} {w}px: Reiter „Dringend“ lädt gefiltert')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
if fails:
    print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('alles in Ordnung')
