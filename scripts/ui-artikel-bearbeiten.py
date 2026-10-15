# [CLAUDE] UI-Test: Lagerartikel-Stammdaten in der Artikelakte bearbeiten (Bezeichnung, Teilenummer, Mindestbestand, Lagerort, Preis, aktiv).
# Ablauf je Sprache/Breite: Formular vorbelegt (Komma), ändern + speichern → neue Überschrift, Mindestbestand leer = entfernt;
# erneut speichern ohne Änderung → Hinweis „Keine Änderung“; Deaktivieren mit Restbestand fragt nach → Kennzeichnung „inaktiv“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EDIT={'de':'Artikel bearbeiten','uk':'Редагувати артикул','en':'Edit item'}
SAME={'de':'Keine Änderung.','uk':'Без змін.','en':'No change.'}
INACT={'de':'inaktiv','uk':'неактивний','en':'inactive'}
fails=[]
OPEN="()=>{document.querySelector('#itedp').open=true}"  # bleibt nach dem Speichern ggf. aufgeklappt (Seitenzustand bleibt erhalten)
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ab.inhaber','display_name':'AB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ab.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        nm=f'AB-Probe {lang} {w}'
        r=api('POST','/api/stock',{'name':nm,'part_number':f'AB-{lang}-{w}','site':ws,'min_qty':2,'unit_price_net':'3,5','location':'Regal A','initial_qty':3})
        iid=r['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        dialogs=[]; q.on('dialog',lambda d: (dialogs.append(d.message), d.accept()))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ab.inhaber','password':PW}])
        q.goto(B+f'/#/stock/{iid}'); q.wait_for_selector('#itedp')
        check(q.inner_text('#itedp summary').strip()==EDIT[lang],f'{lang} {w}px: Bereich „{EDIT[lang]}“')
        q.click('#itedp summary')
        check(q.input_value('#ie_price')=='3,5' and q.input_value('#ie_min')=='2' and q.input_value('#ie_loc')=='Regal A',f'{lang} {w}px: vorbelegt (Komma)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/artikel_bearbeiten_{lang}_{w}.png',full_page=True)
        q.fill('#ie_name',nm+' neu'); q.fill('#ie_min',''); q.fill('#ie_price','4,20')
        q.click('#itedf button.btn'); q.wait_for_function(f"()=>document.querySelector('h1') && document.querySelector('h1').textContent.includes({repr(nm+' neu')})",timeout=10000)
        it=api('GET',f'/api/stock/{iid}')['d']['item']
        check(it['name']==nm+' neu' and it['min_qty'] is None and it['unit_price_net']==4.2,f'{lang} {w}px: gespeichert ({it["name"]}, {it["min_qty"]}, {it["unit_price_net"]})')
        q.wait_for_selector('#itedp'); q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())"); q.evaluate(OPEN); q.click('#itedf button.btn')
        q.wait_for_selector('.toast'); check(SAME[lang] in q.inner_text('.toast'),f'{lang} {w}px: ohne Änderung → {q.inner_text(".toast")}')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.wait_for_selector('#itedp'); q.evaluate(OPEN); q.uncheck('#ie_act'); q.click('#itedf button.btn')
        q.wait_for_selector('#itinact',timeout=10000)
        check(len(dialogs)==1 and '3' in dialogs[0],f'{lang} {w}px: Rückfrage bei Restbestand ({dialogs})')
        check(q.inner_text('#itinact').strip()==INACT[lang],f'{lang} {w}px: Kennzeichnung „{INACT[lang]}“')
        check(not any(x['id']==iid for x in api('GET','/api/stock')['d']['items']),f'{lang} {w}px: nicht mehr in der Lagerliste')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/artikel_inaktiv_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print(f"{'FEHLER' if fails else 'OK'}: {len(fails)} Fehler")
raise SystemExit(1 if fails else 0)
