# [CLAUDE] UI-Test (04.11.2026, Backlog 989, Blickwinkel „Werkstatt bucht vom Lieferschein: Teilenummer in anderer Schreibweise“):
# Lager → „Neuer Artikel“: Tippt die Werkstatt „A 000 420 12 20“, obwohl „A0004201220“ schon im eigenen Lager steht, erscheint sofort der
# Hinweis mit Verweis auf den vorhandenen Artikel; eine fremde Nummer zeigt keinen Hinweis. Speichern derselben Bezeichnung → 409, Hinweis
# bleibt mit Verweis, der Verweis öffnet den Artikel. Kein zweiter Artikel. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine
# Skriptfehler. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'gibt es in diesem Lager schon','uk':'вже є на цьому складі','en':'already exists in this stock'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tn.inhaber','display_name':'TN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    w1=api('GET','/api/meta')['d']['workshops'][0]['code']
    un='tn.ws'+str(uuid.uuid4().int)[:5]
    u=api('POST','/api/users',{'username':un,'display_name':'TN Werkstatt','role':'workshop','environment':env,'workshop_site':w1})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    sfx=str(uuid.uuid4().int)[:4]; name='Bremsscheibe TN'+sfx; pn='A000420'+sfx+'20'; spaced=f'A 000 420 {sfx[:2]} {sfx[2:]} 20'
    A=api('POST','/api/stock',{'site':w1,'name':name,'part_number':pn,'initial_qty':3})['d']['id']
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang}/{wd}'
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/stock'); q.reload(); q.wait_for_selector('#nf',state='attached',timeout=15000)
        q.locator('#nf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        box=q.locator('#nf [data-pndup]')
        q.fill('#nf input[name="name"]',name)
        f=q.locator('#nf input[name="part_number"]'); f.click(); f.type('B-999-'+sfx); q.wait_for_timeout(50)
        check(box.is_hidden(),f'{tag}: fremde Nummer ohne Hinweis')
        f.fill(''); f.type(spaced); q.wait_for_timeout(50)
        check(box.is_visible() and TXT[lang] in box.inner_text() and q.locator(f'#nf a[data-pndupitem="{A}"]').count()==1,f'{tag}: „{spaced}“ → Hinweis mit Verweis')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: f.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/teilenummer-{lang}-{wd}.png')
        q.locator('#nf button.btn').click(); q.wait_for_timeout(800)
        check(box.is_visible() and q.locator(f'#nf a[data-pndupitem="{A}"]').count()==1,f'{tag}: nach Speichern (409) Verweis sichtbar')
        n=len([i for i in api('GET','/api/stock')['d']['items'] if i['name']==name])
        check(n==1,f'{tag}: kein zweiter Artikel ({n})')
        q.locator(f'#nf a[data-pndupitem="{A}"]').click(); q.wait_for_function(f"location.hash==='#/stock/{A}'",timeout=10000)
        check(True,f'{tag}: Verweis öffnet den Artikel')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
