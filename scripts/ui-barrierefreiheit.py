# [CLAUDE] UI-Test Barrierefreiheit (21.10.2026): Kopfzeilen-Symbole ≥ 44 px, Glocke mit Anzahl im zugänglichen Namen, Fokusring mit dunklem
# Innenring, „Dringlichkeit“/„Fahrbereit?“ als benannte Radiogruppen, Erfolgsmeldung mit Wort in dauerhafter Live-Region, Aktionsformular holt
# den Fokus und „Abbrechen“ gibt ihn zurück. DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BELL={'de':'Hinweise','uk':'Сповіщення','en':'Alerts'}
SAVED={'de':'Gespeichert','uk':'Збережено','en':'Saved'}
URG={'de':'Wie dringend?','uk':'Наскільки терміново?','en':'How urgent?'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bf.inhaber','display_name':'BF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'bf.leitung','display_name':'BF Leitung','role':'fleet','environment':'production'})
    tok=u['d']['invite_token']
    api('POST','/api/vehicles',{'vin':'WDB96340310777101','plate':'BF-ANL 1','site':'Dortmund'})
    cs=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310777101','description':'UI-Test: Spiegel lose','priority':'mittel','driveability':'fahrbereit','request_key':'bf-1'})
    check(cs['s']==201,f'Vorgang angelegt {cs["s"]}'); cid=cs['d']['id']
    b2=br.new_page(); b2.goto(B); b2.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}])
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'bf.leitung','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        unread=q.evaluate(JS,['GET','/api/notifications?count=1'])['d']['unread']
        q.goto(B+'/#/'); q.wait_for_selector('header.topbar a[href="#/inbox"]'); q.wait_for_timeout(700)
        for sel in ['a[href="#/inbox"]','a[href="#/search"]']:
            q.wait_for_selector('header.topbar '+sel); bx=q.locator('header.topbar '+sel).bounding_box()
            check(bx and bx['width']>=44 and bx['height']>=44,f'{lang} {w}px: {sel} Tippfläche {bx and (round(bx["width"]),round(bx["height"]))}')
        lbl=q.get_attribute('header.topbar a[href="#/inbox"]','aria-label')
        check(lbl==(BELL[lang]+(f': {unread}' if unread else '')),f'{lang} {w}px: Glocke „{lbl}“ (ungelesen {unread})')
        check(q.evaluate("()=>[...document.querySelectorAll('header.topbar svg')].every(s=>s.getAttribute('aria-hidden')==='true')"),f'{lang} {w}px: Symbole aria-hidden')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/kopf_{lang}_{w}.png')
        # Meldeformular: Radiogruppen mit Namen aus dem Label
        q.goto(B+'/#/new'); q.wait_for_selector('input[name=prio]')
        names=q.evaluate("()=>[...document.querySelectorAll('[role=radiogroup][aria-labelledby]')].map(g=>(document.getElementById(g.getAttribute('aria-labelledby'))||{}).textContent||'')")
        check(len(names)>=2 and all(n.strip() for n in names),f'{lang} {w}px: Radiogruppen benannt {names}')
        if URG[lang]: check(URG[lang] in names,f'{lang} {w}px: „{URG[lang]}“')
        # Fokusring: Tab → sichtbarer dunkler Innenring
        q.keyboard.press('Tab')
        sh=q.evaluate("()=>{const e=document.activeElement; return e&&e!==document.body?getComputedStyle(e).boxShadow:'body'}")
        check(sh not in ('none','body',''),f'{lang} {w}px: Fokus mit Ring ({sh})')
        # Formularfehler am Feld (Backlog 110): Meldung ohne Beschreibung → #d aria-invalid + sichtbarer Hinweis, Eingabe hebt auf
        if not q.locator('input[name=veh]:checked').count(): q.locator('.vehpick label').first.click()
        q.evaluate("()=>document.getElementById('sb').click()"); q.wait_for_selector('#d[aria-invalid=true]',timeout=5000)
        hint=q.evaluate("()=>{const d=document.getElementById('d'); const p=document.getElementById(d.getAttribute('aria-describedby')||'x'); return p?p.textContent:''}")
        check(len(hint)>3,f'{lang} {w}px: Beschreibung mit Feldhinweis „{hint}“')
        tb=q.locator('.toast.err').last.bounding_box() if q.locator('.toast.err').count() else None
        check(tb and tb['y']+tb['height']<h/2,f'{lang} {w}px: Fehlermeldung oben (Backlog 111) {tb and round(tb["y"])}')
        if SHOTS and w==390: q.locator('#d').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/feldfehler_{lang}_{w}.png')
        q.fill('#d','Spiegel wackelt')
        check(q.get_attribute('#d','aria-invalid') is None and q.locator('.fielderr').count()==0,f'{lang} {w}px: Hinweis nach Eingabe weg')
        # Abfahrtskontrolle ohne Antworten → Radiogruppe aria-invalid mit Hinweis, Antwort hebt auf
        q.goto(B+'/#/check'); q.wait_for_selector('#v')
        if not q.input_value('#v'): q.select_option('#v',index=1)
        q.evaluate("()=>document.getElementById('sb').click()"); q.wait_for_selector('.seg[aria-invalid=true]',timeout=5000)
        hint=q.evaluate("()=>{const g=document.querySelector('.seg[aria-invalid=true]'); const p=document.getElementById(g.getAttribute('aria-describedby')||'x'); return p?p.textContent:''}")
        check(len(hint)>3,f'{lang} {w}px: Kontrolle mit Feldhinweis „{hint}“')
        check(q.locator('.fielderr').count()==1 and q.locator('.seg[aria-invalid=true]').count()>1,f'{lang} {w}px: ein Hinweistext, alle offenen Gruppen markiert')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/kontrollfehler_{lang}_{w}.png')
        q.locator('.seg[aria-invalid=true] input[value=ok]').first.check(force=True)
        check(q.evaluate("()=>{const r=document.querySelector('.checkitem'); return !r.querySelector('.seg').hasAttribute('aria-invalid') && !document.querySelector('#'+CSS.escape('err_cl_'+r.dataset.key))}"),f'{lang} {w}px: Hinweis nach Antwort weg')
        # Vorgang: Aktionsformular holt den Fokus, Abbrechen gibt ihn zurück; Kommentar → Erfolg mit Wort in der Live-Region
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('#ct')
        ab=q.locator('button[data-act]').first
        if ab.count():
            act=ab.get_attribute('data-act'); ab.click(); q.wait_for_selector('#af')
            check(q.evaluate("()=>document.activeElement&&document.activeElement.closest('#af')!==null"),f'{lang} {w}px: Fokus im Formular ({act})')
            q.click('#ac')
            check(q.evaluate(f"()=>document.activeElement&&document.activeElement.dataset.act==='{act}'"),f'{lang} {w}px: Fokus zurück auf „{act}“')
        q.fill('#ct',f'Barrierefrei {lang} {w}'); q.locator('#cf button').first.click()
        q.wait_for_function("()=>document.getElementById('live')&&document.getElementById('live').textContent.length>1",timeout=8000)
        lt=q.evaluate("()=>document.getElementById('live').textContent")
        check(lt=='✓ '+SAVED[lang],f'{lang} {w}px: Live-Region „{lt}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vorgang_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
