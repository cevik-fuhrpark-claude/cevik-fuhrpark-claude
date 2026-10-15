# [CLAUDE] UI-Test: Lager → Inventur (Werkstatt), DE/UK/EN bei 390/820/1366 px.
# „Abweichungen buchen“ erst nach „Abweichungen prüfen“; Zählmenge danach geändert → Buchen wieder gesperrt + Hinweis „erneut prüfen“;
# Buchen fragt mit Anzahl nach (Abbrechen bucht nichts), Bestätigen bucht; „Zuletzt gezählt“ in Inventurliste, Zählliste und Artikelakte. Kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DIFFS={'de':'Inventurdifferenzen','uk':'Розбіжності інвентаризації','en':'Stocktake differences'}
ASOF={'de':'Bestand zum Stichtag','uk':'Залишок на дату','en':'Stock at key date'}
LAST={'de':'Letzte Inventur','uk':'Остання інвентаризація','en':'Last stocktake'}
CLOSE={'de':'Inventur abschließen','uk':'Завершити інвентаризацію','en':'Complete stocktake'}
ZERO={'de':'0 Abweichung(en)','uk':'відхилень: 0','en':'0 difference(s)'}
BOOK={'de':'Buchbestand','uk':'Обліковий залишок','en':'Book stock'}
LC={'de':'Zuletzt gezählt','uk':'Востаннє підраховано','en':'Last counted'}
NEVER={'de':'noch nie','uk':'ще не','en':'never counted'}
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
        lc=lambda: q.locator('#invlist tr',has=q.locator(f'[data-inv="{iid}"]')).locator('[data-lc]').inner_text()
        check(NEVER[lang] in lc(),f'{lang} {w}px: neuer Artikel „noch nie gezählt“ ({lc()!r})')
        inp=q.locator(f'[data-inv="{iid}"]'); inp.fill('7')
        check(q.is_disabled('#invbook'),f'{lang} {w}px: Buchen vor Prüfung gesperrt')
        q.click('#invchk'); q.wait_for_function("()=>!document.querySelector('#invbook').disabled")
        check(name in q.inner_text('#invres') and '-3' in q.inner_text('#invres'),f'{lang} {w}px: Abweichung −3 angezeigt')
        inp.fill('6')
        check(q.is_disabled('#invbook') and RE[lang] in q.inner_text('#invres'),f'{lang} {w}px: nach Änderung gesperrt + „erneut prüfen“')
        # Entwurf: Neuladen behält die Zählmenge (nur dieses Gerät), Hinweis mit „Entwurf verwerfen“
        q.reload(); q.wait_for_selector('#inv'); q.click('#inv summary')
        check(q.locator(f'[data-inv="{iid}"]').input_value()=='6' and q.locator('#invdx').count()==1,f'{lang} {w}px: Entwurf nach Neuladen wiederhergestellt')
        inp=q.locator(f'[data-inv="{iid}"]')
        q.click('#invchk'); q.wait_for_function("()=>!document.querySelector('#invbook').disabled")
        if SHOTS: q.locator('#inv').screenshot(path=f'{SHOTS}/inventur_{lang}_{w}.png')
        q.click('#invbook'); q.wait_for_timeout(300)
        check(len(dlg)>=1 and '1' in dlg[-1],f'{lang} {w}px: Rückfrage mit Anzahl')
        st=api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']
        check(st==10,f'{lang} {w}px: Abbrechen bucht nichts ({st})')
        mode['accept']=True; q.click('#invbook'); q.wait_for_timeout(600)
        st=api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']
        check(st==6,f'{lang} {w}px: Bestätigen bucht ({st})')
        q.wait_for_selector('#inv')
        if not q.evaluate("()=>document.querySelector('#inv').open"): q.click('#inv summary')  # bleibt seit 15.10. nach Aktionen aufgeklappt
        q.wait_for_selector(f'[data-inv="{iid}"]')
        check(q.locator('#invdx').count()==0 and q.locator(f'[data-inv="{iid}"]').input_value()=='',f'{lang} {w}px: Entwurf nach Buchung gelöscht')
        check(LAST[lang] in q.inner_text('#invlast'),f'{lang} {w}px: „Letzte Inventur“ angezeigt')
        check(LC[lang] in lc(),f'{lang} {w}px: Inventurliste „zuletzt gezählt“ nach Buchung ({lc()!r})')
        # Inventur ohne Abweichung abschließen: Zählmenge = Buchbestand → Knopf „Inventur abschließen“, Rückfrage, nichts gebucht, vermerkt
        q.locator(f'[data-inv="{iid}"]').fill('6'); q.click('#invchk'); q.wait_for_function("()=>!document.querySelector('#invbook').disabled")
        check(CLOSE[lang] in q.inner_text('#invbook'),f'{lang} {w}px: Knopf „Inventur abschließen“')
        n0=len(dlg); q.click('#invbook'); q.wait_for_timeout(600)
        check(len(dlg)==n0+1 and api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']==6,f'{lang} {w}px: Abschluss mit Rückfrage, nichts gebucht')
        q.wait_for_selector('#inv')
        if not q.evaluate("()=>document.querySelector('#inv').open"): q.click('#inv summary')  # bleibt seit 15.10. nach Aktionen aufgeklappt
        q.wait_for_selector(f'[data-inv="{iid}"]')
        check(q.inner_text('#invlast').rstrip().endswith(ZERO[lang]),f'{lang} {w}px: letzte Inventur mit 0 Abweichungen ({q.inner_text("#invlast")!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        # Inventurdifferenzen: Link im Inventur-Bereich → Lagerjournal mit Auswahl Inventur, Zeile Buchbestand 10 → gezählt 6, Differenz −4
        q.click('#invdiffs'); q.wait_for_selector('#invtab')
        row=q.locator('#invtab tbody tr',has_text=name).inner_text()
        check(DIFFS[lang] in q.inner_text('h1') and q.locator('#jtype').input_value()=='inventur',f'{lang} {w}px: Inventurdifferenzen geöffnet')
        check('10' in row and '6' in row and '-4' in row,f'{lang} {w}px: Zeile Buchbestand/gezählt/Differenz ({row!r})')
        check(q.locator('#invsum').count()==1 and q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Summe, kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/inventurdiff_{lang}_{w}.png',full_page=True)
        q.goto(B+'/#/stock'); q.wait_for_selector('#inv')
        # Zählliste: Link im Inventur-Bereich, Standard ohne Buchbestand (Blindzählung), Schalter blendet ihn ein; Druckansicht ohne Bedienelemente
        if not q.evaluate("()=>document.querySelector('#inv').open"): q.click('#inv summary')
        q.click('#invsheet'); q.wait_for_selector('#ctab')
        hdr=q.inner_text('#ctab thead')
        check(BOOK[lang] not in hdr and name in q.inner_text('#ctab'),f'{lang} {w}px: Zählliste ohne Buchbestand, Artikel enthalten')
        check(q.locator('#ctab tbody tr').count()>=1,f'{lang} {w}px: Zeilen vorhanden')
        check(LC[lang] in hdr and LAST[lang] in q.inner_text('.print-only'),f'{lang} {w}px: Zählliste mit Spalte „zuletzt gezählt“ und letzter Inventur im Druckkopf')
        # Rollierende Inventur: „nicht gezählt seit 90 Tagen“ blendet den heute gezählten Artikel aus, „alle Artikel“ wieder ein
        q.select_option('#cage','90'); q.wait_for_function(f"()=>!(document.querySelector('#ctab')||document.body).innerText.includes({name!r}) || !document.querySelector('#ctab')")
        check(name not in q.inner_text('main') if q.locator('main').count() else name not in q.inner_text('body'),f'{lang} {w}px: Zählliste „nicht gezählt seit 90 Tagen“ ohne heute gezählten Artikel')
        q.select_option('#cage',''); q.wait_for_selector('#ctab')
        check(name in q.inner_text('#ctab'),f'{lang} {w}px: „alle Artikel“ wieder mit Artikel')
        q.check('#cbook'); q.wait_for_function(f"()=>document.querySelector('#ctab thead').innerText.includes({BOOK[lang]!r})")
        check(BOOK[lang] in q.inner_text('#ctab thead'),f'{lang} {w}px: Buchbestand eingeblendet')
        q.uncheck('#cbook'); q.wait_for_function(f"()=>!document.querySelector('#ctab thead').innerText.includes({BOOK[lang]!r})")
        q.emulate_media(media='print')
        check(not q.locator('#cprt').is_visible() and q.locator('.print-only').first.is_visible(),f'{lang} {w}px: Druck ohne Knöpfe, mit Kopfzeile')
        if SHOTS and w==1366: q.screenshot(path=f'{SHOTS}/zaehlliste_{lang}.png',full_page=True)
        q.emulate_media(media='screen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Zählliste ohne Querscrollen')
        # Artikelliste „Anzeigen: nicht gezählt seit 365 Tagen“ blendet den heute gezählten Artikel aus
        q.goto(B+'/#/stock'); q.wait_for_selector('#sf'); q.select_option('#sf','c365')
        check(q.locator(f'#sl a[data-id="{iid}"]').is_hidden(),f'{lang} {w}px: Artikelliste „nicht gezählt seit 365 Tagen“ ohne gezählten Artikel')
        q.select_option('#sf',''); check(q.locator(f'#sl a[data-id="{iid}"]').is_visible(),f'{lang} {w}px: Artikelliste „alle“ mit Artikel')
        # Artikelakte: „Zuletzt gezählt“ mit Datum und Zählmenge
        q.goto(B+f'/#/stock/{iid}'); q.wait_for_selector('#lcnt')
        check('6' in q.inner_text('#lcnt') and NEVER[lang] not in q.inner_text('#lcnt'),f'{lang} {w}px: Artikelakte zuletzt gezählt ({q.inner_text("#lcnt")!r})')
        check(not re.search(r'Inventur \d{4}-\d\d-\d\d +Inventur',q.inner_text('body')),f'{lang} {w}px: Verlauf ohne doppelten Inventur-Beleg')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/artikel_gezaehlt_{lang}.png',full_page=True)
        # Bestand zum Stichtag: Knopf im Lager, Stichtag heute → Artikel mit 6 Stk, Summen, kein Querscrollen
        q.goto(B+'/#/stock'); q.wait_for_selector('#sasof'); q.click('#sasof'); q.wait_for_selector('#saf')
        check(ASOF[lang] in q.inner_text('h1'),f'{lang} {w}px: Bestand zum Stichtag geöffnet')
        q.fill('#sadate',q.evaluate("()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin'}).format(new Date())")); q.click('#saf button.btn:not(.secondary)'); q.wait_for_selector('#satab')
        row=q.locator('#satab tbody tr',has_text=name).inner_text()
        check('6' in row and q.locator('#sasum li').count()==3,f'{lang} {w}px: Stichtagszeile + Summen ({row!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Stichtag ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/stichtag_{lang}_{w}.png',full_page=True)
        q.evaluate("()=>sessionStorage.removeItem('cfp_sa_date')")
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Inventur: alles grün')
raise SystemExit(1 if fails else 0)
