# [CLAUDE] UI-Test: Lager → Inventur (Werkstatt), DE/UK/EN bei 390/820/1366 px.
# „Abweichungen buchen“ erst nach „Abweichungen prüfen“; Zählmenge danach geändert → Buchen wieder gesperrt + Hinweis „erneut prüfen“;
# Buchen fragt mit Anzahl nach (Abbrechen bucht nichts), Bestätigen bucht. Kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BOOK={'de':'Buchbestand','uk':'Обліковий залишок','en':'Book stock'}
RE={'de':'erneut ausführen','uk':'знову виконайте','en':'run “Check differences” again'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'iv.inhaber','display_name':'IV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'iv.inhaber','password':PW})
    u=api('POST','/api/users',{'username':'iv.werkstatt','display_name':'IV Werkstatt','role':'workshop','environment':'production','workshop_site':'DORTMUND'})
    if u['s'] in (200,201): api('POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'iv.werkstatt','password':PW})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        name=f'Inventurtest {lang} {w}'
        r=api('POST','/api/stock',{'name':name,'unit':'Stk','initial_qty':10}); iid=r['d']['id']
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        dlg=[]; mode={'accept':False}
        def on_dialog(d):
            dlg.append(d.message)
            d.accept() if mode['accept'] else d.dismiss()
        q.on('dialog',on_dialog)
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'iv.werkstatt','password':PW}])
        q.goto(B+'/#/stock'); q.wait_for_selector('#inv'); q.click('#inv summary')
        inp=q.locator(f'[data-inv="{iid}"]'); inp.fill('7')
        check(q.is_disabled('#invbook'),f'{lang} {w}px: Buchen vor Prüfung gesperrt')
        q.click('#invchk'); q.wait_for_function("()=>!document.querySelector('#invbook').disabled")
        check(name in q.inner_text('#invres') and '-3' in q.inner_text('#invres'),f'{lang} {w}px: Abweichung −3 angezeigt')
        inp.fill('6')
        check(q.is_disabled('#invbook') and RE[lang] in q.inner_text('#invres'),f'{lang} {w}px: nach Änderung gesperrt + „erneut prüfen“')
        q.click('#invchk'); q.wait_for_function("()=>!document.querySelector('#invbook').disabled")
        if SHOTS: q.locator('#inv').screenshot(path=f'{SHOTS}/inventur_{lang}_{w}.png')
        q.click('#invbook'); q.wait_for_timeout(300)
        check(len(dlg)>=1 and '1' in dlg[-1],f'{lang} {w}px: Rückfrage mit Anzahl')
        st=api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']
        check(st==10,f'{lang} {w}px: Abbrechen bucht nichts ({st})')
        mode['accept']=True; q.click('#invbook'); q.wait_for_timeout(600)
        st=api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']
        check(st==6,f'{lang} {w}px: Bestätigen bucht ({st})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        # Zählliste: Link im Inventur-Bereich, Standard ohne Buchbestand (Blindzählung), Schalter blendet ihn ein; Druckansicht ohne Bedienelemente
        q.goto(B+'/#/stock'); q.wait_for_selector('#inv'); q.click('#inv summary'); q.click('#invsheet'); q.wait_for_selector('#ctab')
        hdr=q.inner_text('#ctab thead')
        check(BOOK[lang] not in hdr and name in q.inner_text('#ctab'),f'{lang} {w}px: Zählliste ohne Buchbestand, Artikel enthalten')
        check(q.locator('#ctab tbody tr').count()>=1,f'{lang} {w}px: Zeilen vorhanden')
        q.check('#cbook'); q.wait_for_function(f"()=>document.querySelector('#ctab thead').innerText.includes({BOOK[lang]!r})")
        check(BOOK[lang] in q.inner_text('#ctab thead'),f'{lang} {w}px: Buchbestand eingeblendet')
        q.uncheck('#cbook'); q.wait_for_function(f"()=>!document.querySelector('#ctab thead').innerText.includes({BOOK[lang]!r})")
        q.emulate_media(media='print')
        check(not q.locator('#cprt').is_visible() and q.locator('.print-only').first.is_visible(),f'{lang} {w}px: Druck ohne Knöpfe, mit Kopfzeile')
        if SHOTS and w==1366: q.screenshot(path=f'{SHOTS}/zaehlliste_{lang}.png',full_page=True)
        q.emulate_media(media='screen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Zählliste ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Inventur: alles grün')
raise SystemExit(1 if fails else 0)
