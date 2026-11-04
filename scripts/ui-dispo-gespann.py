# [CLAUDE] UI-Test (04.11.2026, Backlog 981, Folge aus 979, Blickwinkel „Disposition plant morgens die Touren“):
# Startseite der Disposition zählt „Gespann ohne Meldungen“ (gleiche Regel wie die Fahrzeugliste) und verlinkt auf den Filter;
# im Ausdruck stehen die Kennzeichen Lkw + Anhänger. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Gespann ohne Meldungen','uk':'Зчіпка без заявок','en':'Combination without reports'}
HINT={'de':'ersetzt keine Abfahrtskontrolle','uk':'не замінює контролю перед виїздом','en':'does not replace the departure check'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dg.inhaber','display_name':'DG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'dg.dispo','display_name':'DG Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    today=a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())")
    dm=(date.fromisoformat(today)-timedelta(days=3)).isoformat()
    for n in ['1','2','3']:
        check(api('POST','/api/vehicles',{'plate':f'DG-LK 979{n}','vin':f'WDB9634031097900{n}','kind':'lkw','site':'Dortmund','trailer_plate':f'DG-AH 979{n}'})['s'] in (200,201),f'Lkw {n}')
        check(api('POST','/api/vehicles',{'plate':f'DG-AH 979{n}','vin':f'WSM0000000097900{n}','kind':'anhaenger','site':'Dortmund'})['s'] in (200,201),f'Anhänger {n}')
    # Gespann 2: Meldung am Anhänger; Gespann 3: UVV am Anhänger überfällig; Gespann 1 frei
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WSM00000000979002','description':'Plane eingerissen','priority':'niedrig','request_key':str(uuid.uuid4())}); check(r['s']==201,'Meldung Anhänger 2')
    r=api('POST','/api/vehicles/VIN:WSM00000000979003/maintenance',{'kind':'UVV','next_due_date':dm,'evidence':'UVV-Nachweis'}); check(r['s']==201,'überfällige UVV Anhänger 3')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dg.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.reload(); q.wait_for_selector('#dcombo',timeout=15000); q.wait_for_timeout(500)
        l=q.locator('#dcombo')
        check(l.inner_text().startswith(LBL[lang]) and '(1)' in l.inner_text(),f'{lang} {wd}px: Zähler ({l.inner_text()})')
        check(HINT[lang] in (l.get_attribute('title') or ''),f'{lang} {wd}px: Hinweis als Tooltip')
        pl=q.locator('[data-dprint="combo"]')
        check(pl.count()==1 and 'DG-LK 9791 + DG-AH 9791' in pl.text_content() and 'DG-LK 9792' not in pl.text_content(),f'{lang} {wd}px: Ausdruck mit Kennzeichen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: l.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dispogespann_{lang}_{wd}.png',full_page=False)
        l.click(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        check(q.locator('[data-av="combo_clear"]:not(.secondary)').count()==1 and q.locator('#vl a.row').count()==1,f'{lang} {wd}px: Link öffnet den Filter')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
