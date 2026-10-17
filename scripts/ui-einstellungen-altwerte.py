# [CLAUDE] UI-Test: gespeicherte Einstellungswerte außerhalb der Regeln (Altwerte von vor der Werteprüfung 16.10.2026, z. B. „-5“ Tage,
# Stundensatz „0“) werden beim Öffnen der Einstellungen oben gemeldet (Feld, gespeicherter Wert, erlaubter Bereich in der App-Sprache)
# und die Felder rot markiert. Nach dem Korrigieren und Speichern verschwindet die Meldung. DE/UK/EN bei 390/820/1366 px ohne Querscrollen/
# Skriptfehler. Frischer Dev-Server nötig (Hilfspfad /__dev/setting-raw). Screenshots: CFP_SHOTS=<Ordner>.
import os, urllib.request
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HEAD={'de':'außerhalb des zulässigen Bereichs','uk':'поза допустимим діапазоном','en':'outside the permitted range'}
RANGE={'de':'erlaubt 0 bis 365 (ganze Zahl)','uk':'дозволено від 0 до 365 (ціле число)','en':'permitted 0 to 365 (whole number)'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def raw(k,v): urllib.request.urlopen(urllib.request.Request(f'{B}/__dev/setting-raw?key={k}&value={urllib.parse.quote(v)}',method='POST')).read()
import urllib.parse
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'aw.inhaber','display_name':'AW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'aw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        raw('maintenance_warn_days','-5'); raw('workshop_hourly_rate_net','0')
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'aw.inhaber','password':PW}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#sinv .warn')
        txt=q.inner_text('#sinv'); lab=q.inner_text('label[for="maintenance_warn_days"]').strip(); lab2=q.inner_text('label[for="workshop_hourly_rate_net"]').strip()
        check(HEAD[lang] in txt and lab in txt and '-5' in txt and RANGE[lang] in txt and lab2 in txt,f'{lang} {w}px: Meldung nennt Feld, Wert, Bereich ({txt[:160]!r})')
        check(q.get_attribute('#maintenance_warn_days','aria-invalid')=='true' and q.get_attribute('#workshop_hourly_rate_net','aria-invalid')=='true' and q.get_attribute('#tire_warn_tread_mm','aria-invalid') is None,f'{lang} {w}px: genau die betroffenen Felder markiert')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/einstellungen_altwerte_{lang}_{w}.png')
        q.fill('#maintenance_warn_days','30'); q.fill('#workshop_hourly_rate_net',''); q.click('#sf button:not([type])')
        q.wait_for_selector('.toast:not(.err)'); q.wait_for_function("()=>!document.querySelector('#sinv .warn')")
        check(q.get_attribute('#maintenance_warn_days','aria-invalid') is None and api('GET','/api/settings')['d']['invalid']==[],f'{lang} {w}px: nach Korrektur keine Meldung/Markierung')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        api('PUT','/api/settings',{'maintenance_warn_days':None})
        c.close()
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
