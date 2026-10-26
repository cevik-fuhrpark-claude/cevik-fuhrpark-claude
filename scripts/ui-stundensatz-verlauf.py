# [CLAUDE] UI-Test Backlog 412 (Blickwinkel „Jahreswechsel: Werkstatt-Stundensatz steigt zum 01.01.“): Einstellungen → Stundensatz ändern →
# „Bisherigen Satz … behalten“ erscheint erst bei geändertem Satz, Datum vorbelegt (gestern), Speichern legt den früheren Satz an (Liste unter
# dem Feld), „Entfernen“ (mit Rückfrage) nimmt ihn wieder heraus. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HEAD={'de':'Frühere Stundensätze','uk':'Попередні погодинні ставки','en':'Previous hourly rates'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sv.inhaber','display_name':'SV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        for x in api('GET','/api/settings')['d'].get('hourly_rate_periods',[]): api('DELETE',f"/api/settings/hourly-rate-periods/{x['valid_until']}")
        check(api('PUT','/api/settings',{'workshop_hourly_rate_net':'80'})['s']==200,f'{lang}/{w}: Satz 80')
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e))); q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sv.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/settings'); q.wait_for_selector('#workshop_hourly_rate_net',timeout=15000)
        check(q.is_hidden('#hrkeep'),f'{lang}/{w}: Behalten-Feld erst bei geändertem Satz')
        q.fill('#workshop_hourly_rate_net','95'); q.wait_for_selector('#hrkeep',state='visible')
        check(q.is_hidden('#hrkd'),f'{lang}/{w}: Datum erst mit Haken')
        q.check('#hrk'); q.wait_for_selector('#hrkdate',state='visible')
        yday=q.evaluate("() => { const t = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()); const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }")
        check(q.input_value('#hrkdate')==yday,f'{lang}/{w}: Datum vorbelegt mit gestern ({q.input_value("#hrkdate")})')
        check(q.evaluate(noscroll),f'{lang}/{w}: Formular ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/stundensatz_behalten_{lang}_{w}.png')
        q.click('#sf button:not([type])'); q.wait_for_selector('#hrper',timeout=15000)
        txt=q.inner_text('#hrper')
        check(HEAD[lang] in txt and '80' in txt,f'{lang}/{w}: früherer Satz gelistet ({txt[:120]!r})')
        st=api('GET','/api/settings')['d']
        check(st['values']['workshop_hourly_rate_net']=='95' and len(st['hourly_rate_periods'])==1 and st['hourly_rate_periods'][0]['valid_until']==yday,f'{lang}/{w}: gespeichert (95, bis gestern 80)')
        check(q.evaluate(noscroll),f'{lang}/{w}: Liste ohne Querscrollen')
        split=q.evaluate("() => [...document.querySelectorAll('#hrper button')].filter((x) => x.getClientRects().length > 1).length")
        check(split==0,f'{lang}/{w}: Knopf nicht umbrochen')
        if SHOTS: q.locator('#hrper').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/stundensatz_liste_{lang}_{w}.png')
        q.click('[data-hrdel]'); q.wait_for_selector('#hrper',state='detached',timeout=15000)
        check(api('GET','/api/settings')['d']['hourly_rate_periods']==[],f'{lang}/{w}: Entfernen wirkt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
