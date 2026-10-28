# [CLAUDE] UI-Test (28.10.2026, Backlog 480, Blickwinkel „geteiltes Werkstatt-Tablet“): zwei Personen ändern denselben Lagerartikel.
# A hat die Artikelakte offen, B ändert inzwischen den Lagerort; A ändert den Mindestbestand und speichert → Versionskonflikt:
# Ansicht neu geladen, Hinweis „Inzwischen von jemand anderem geändert …“, A's Mindestbestand steht noch im Formular, B's Lagerort
# ist sichtbar und wird beim zweiten Speichern nicht zurückgesetzt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KEPT={'de':'Ihre Eingaben stehen noch im Formular','uk':'ваші дані залишилися у формі','en':'your entries are still in the form'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lk.inhaber','display_name':'LK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    env=api('GET','/api/me')['d']['active_environment']
    u=api('POST','/api/users',{'username':'lk.ws','display_name':'LK Werkstatt','role':'workshop','environment':env,'workshop_site':ws})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        iid=api('POST','/api/stock',{'name':f'LK-Probe {lang} {w}','part_number':f'LK-{lang}-{w}','site':ws,'min_qty':2,'location':'Regal A','initial_qty':3})['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lk.ws','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/stock/{iid}'); q.reload(); q.wait_for_selector('#itedp',timeout=15000); q.click('#itedp summary')
        it=api('GET',f'/api/stock/{iid}')['d']['item']
        check(api('PATCH',f'/api/stock/{iid}',{'location':'Regal B','expected_updated_at':it['updated_at']})['s']==200,f'{lang} {w}px: B ändert den Lagerort')
        q.fill('#ie_min','5'); q.click('#itedf button.btn')
        q.wait_for_selector('[data-stocklost]',timeout=10000)
        check(KEPT[lang] in q.inner_text('[data-stocklost]'),f'{lang} {w}px: Hinweis „Eingaben stehen noch im Formular“')
        check(q.evaluate("document.querySelector('#itedp').open") and q.input_value('#ie_min')=='5' and q.input_value('#ie_loc')=='Regal B',f'{lang} {w}px: eigener Mindestbestand bleibt, fremder Lagerort sichtbar ({q.input_value("#ie_min")}/{q.input_value("#ie_loc")})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager_konflikt_{lang}_{w}.png',full_page=True)
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.click('#itedf button.btn'); q.wait_for_timeout(1200)
        it=api('GET',f'/api/stock/{iid}')['d']['item']
        check(it['min_qty']==5 and it['location']=='Regal B',f'{lang} {w}px: zweites Speichern gelingt, Lagerort von B bleibt ({it["min_qty"]}/{it["location"]})')
        check(q.locator('[data-stocklost]').count()==0,f'{lang} {w}px: Hinweis nach Erfolg weg')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
