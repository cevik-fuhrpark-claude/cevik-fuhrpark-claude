# [CLAUDE] UI-Test: Dokumentsprache (<html lang>) folgt der Oberflächensprache – nicht nur beim Start (gespeicherte Gerätesprache),
# sondern auch nach der Anmeldung (Sprache des Kontos) und nach dem Sprachwechsel unter Mehr → Mein Konto. Wichtig für Vorlesefunktion
# und Silbentrennung (hyphens: auto). Zusätzlich: Fenstertitel = Seitenüberschrift – App-Name (Reiter, PDF-Dateiname beim Drucken). Fehler bis 16.10.2026: lang blieb „de“, obwohl die Seite ukrainisch/englisch war.
# 390/820/1366 px, keine Skriptfehler. Frischer Dev-Server nötig (CFP_URL, Standard Port 8787). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
NAV={'de':'Mein Konto','uk':'Мій акаунт','en':'My account'}
LOC={'de':'de-DE','uk':'uk-UA','en':'en-GB'}
APP={'de':'CEVIK Fuhrpark','uk':'CEVIK Автопарк','en':'CEVIK Fleet'}
MORE={'de':'Mehr','uk':'Ще','en':'More'}
TITLE_JS="()=>{const h=document.querySelector('#app h1');return [document.title,h?h.textContent.replace(/\\s+/g,' ').trim():'']}"
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hl.inhaber','display_name':'HL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/users',{'username':'hl.fahrer','display_name':'HL Fahrer','role':'driver','environment':'production'})
    api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW})
    for un,acct in [('hl.inhaber','uk'),('hl.fahrer','en')]:
        api('POST','/api/login',{'username':un,'password':PW}); api('PATCH','/api/me',{'language':acct})
        for (w,h),dev in zip([(390,844),(820,1180),(1366,900)],['de','uk','en']):
            # Gerätesprache je Durchlauf verschieden: Anmeldeseite folgt ihr, nach der Anmeldung gilt die Sprache des Kontos
            c=br.new_context(viewport={'width':w,'height':h},locale=LOC[dev]); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.wait_for_selector('#lang')
            check(q.evaluate('()=>document.documentElement.lang')==dev,f'{un} {w}px: Anmeldeseite lang={dev} (Gerätesprache)')
            q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
            q.goto(B+'/#/more'); q.wait_for_selector(f'h2:has-text("{NAV[acct]}")')
            check(q.evaluate('()=>document.documentElement.lang')==acct,f'{un} {w}px: nach Anmeldung lang={acct} (Sprache des Kontos)')
            tt,h1=q.evaluate(TITLE_JS)
            check(tt==f'{h1} – {APP[acct]}' and h1,f'{un} {w}px: Fenstertitel = Seitenüberschrift + App „{tt}“')
            other='de' if acct!='de' else 'en'
            q.select_option('#lang',other); q.wait_for_function(f'()=>document.documentElement.lang==="{other}"',timeout=5000)
            check(q.evaluate('()=>document.documentElement.lang')==other,f'{un} {w}px: nach Sprachwechsel lang={other}')
            tt,h1=q.evaluate(TITLE_JS)
            check(tt==f'{h1} – {APP[other]}' and h1,f'{un} {w}px: Fenstertitel nach Sprachwechsel „{tt}“')
            q.select_option('#lang',acct); q.wait_for_function(f'()=>document.documentElement.lang==="{acct}"',timeout=5000)
            check(True,f'{un} {w}px: zurück auf {acct}')
            if un=='hl.inhaber':
                q.goto(B+'/#/vehicles'); q.wait_for_selector('#app h1')
                q.wait_for_timeout(300); tt,h1=q.evaluate(TITLE_JS)
                check(tt==f'{h1} – {APP[acct]}' and h1 and not h1.startswith(MORE[acct]),f'{un} {w}px: Fahrzeuge-Seite Titel „{tt}“')
            if SHOTS: q.screenshot(path=f'{SHOTS}/html_lang_{un}_{w}.png',full_page=False)
            check(not errs,f'{un} {w}px: keine Skriptfehler {errs}')
            c.close()
    br.close()
if fails: print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('Dokumentsprache: alles grün')
