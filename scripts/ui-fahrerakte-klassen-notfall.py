# [CLAUDE] UI-Test (20.10.2026): Fahrerakte – Feld „Klassen“ nur bei Art Führerschein; unbenannte Unterweisung ohne interne Kennung
# in Liste und Akte; Fahrzeugakte → „Panne & Notfall“ → „Zurück“ führt zur Akte (nicht zur QR-Seite).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, re
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
UUID=re.compile(r'#[0-9a-f]{8}-[0-9a-f]{4}-')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    r=api('POST','/api/login',{'username':'fk.inhaber','password':PW}); check(r['s']==200,f'Anmeldung ({r["s"]})')
    d=api('POST','/api/drivers',{'display_name':'FK Fahrer Unbenannt'}); check(d['s']==201,f'Fahrerakte ({d["s"]})'); D=d['d']['id']
    y=(date.today()-timedelta(days=2)).isoformat()
    u=api('POST',f'/api/drivers/{D}/documents',{'kind':'unterweisung','valid_until':y,'evidence':'Liste'}); check(u['s']==201,f'Unterweisung ohne Bezeichnung ({u["s"]})')
    v=api('POST','/api/vehicles',{'plate':'FK-NO 1','vin':'WDB96340310776001','kind':'lkw'}); vid=(v['d'] or {}).get('id') or (v['d'].get('vehicle') or {}).get('id')
    check(bool(vid),f'Fahrzeug ({v["s"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW}])
        q.goto(B+'/#/drivers'); q.wait_for_selector('.list a.row', timeout=15000)
        txt=q.inner_text('main') if q.query_selector('main') else q.inner_text('body')
        check(not UUID.search(txt),f'{lang} {w}px: Fahrerliste ohne interne Kennung')
        q.goto(B+f'/#/drivers/{D}'); q.wait_for_selector('#ddf', state='attached', timeout=15000)
        q.evaluate("()=>document.querySelectorAll('details').forEach(x=>x.open=true)")
        check(q.is_visible('#ddf input[name=license_classes]'),f'{lang} {w}px: Klassen beim Führerschein sichtbar')
        q.select_option('#ddf select[name=kind]','unterweisung')
        check(not q.is_visible('#ddf input[name=license_classes]'),f'{lang} {w}px: Klassen bei Unterweisung ausgeblendet')
        check(not UUID.search(q.inner_text('body')),f'{lang} {w}px: Akte ohne interne Kennung')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Akte ohne Querscrollen ({sw})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/fk-akte-{lang}.png', full_page=True)
        q.goto(B+f'/#/vehicles/{vid}'); q.wait_for_selector('a[href*="&from=file"]', timeout=15000)
        q.click('a[href*="&from=file"]'); q.wait_for_selector('#em112', timeout=15000)
        back=q.get_attribute('main p.noprint a, p.noprint a','href')
        check(back==f'#/vehicles/{vid}' or back==f'#/vehicles/{vid.replace(":","%3A")}',f'{lang} {w}px: Zurück zur Akte ({back})')
        sw=q.evaluate('()=>document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: Notfall ohne Querscrollen ({sw})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print(f'{"FEHLER" if fails else "OK"}: {len(fails)} Abweichungen')
raise SystemExit(1 if fails else 0)
