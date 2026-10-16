# [CLAUDE] UI-Test: Einstellungen nur mit plausiblen Werten. „2000000“ € Freigabegrenze und „-5“ Tage werden abgewiesen (vorher gespeichert):
# Meldung nennt das Feld und den erlaubten Bereich in der App-Sprache, Feld rot markiert und fokussiert, nichts gespeichert.
# „1.000,50“ (vorher im Browser zu „1.000.50“ gemacht und still übergangen, Meldung trotzdem ✓) wird als 1000,5 gespeichert und mit Dezimalkomma (DE/UK) angezeigt.
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
RANGE={'de':'von 0 bis 1.000.000','uk':'від 0 до 1','en':'from 0 to 1,000,000'}
NOTHING={'de':'nichts gespeichert','uk':'нічого не збережено','en':'nothing saved'}
INT={'de':'(ganze Zahl)','uk':'(ціле число)','en':'(whole number)'}
SHOWN={'de':'1000,5','uk':'1000,5','en':'1000.5'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ep.inhaber','display_name':'EP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ep.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        api('PUT','/api/settings',{'repair_cost_limit_net':None,'maintenance_warn_days':None})
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ep.inhaber','password':PW}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#repair_cost_limit_net')
        lab=q.inner_text('label[for="repair_cost_limit_net"]').strip()
        q.fill('#repair_cost_limit_net','2000000'); q.click('#sf button[type=submit], #sf button:not([type])')
        q.wait_for_selector('.toast.err'); msg=q.inner_text('.toast.err')
        check(lab in msg and RANGE[lang] in msg and NOTHING[lang] in msg,f'{lang} {w}px: Meldung nennt Feld und Bereich ({msg[:110]!r})')
        check(q.get_attribute('#repair_cost_limit_net','aria-invalid')=='true' and q.evaluate("()=>document.activeElement.id")=='repair_cost_limit_net',f'{lang} {w}px: Feld markiert und fokussiert')
        if SHOTS: q.screenshot(path=f'{SHOTS}/einstellungen_fehler_{lang}_{w}.png')
        check(api('GET','/api/settings')['d']['values'].get('repair_cost_limit_net') in (None,''),f'{lang} {w}px: nichts gespeichert')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.fill('#repair_cost_limit_net',''); q.fill('#maintenance_warn_days','-5'); q.click('#sf button[type=submit], #sf button:not([type])')
        q.wait_for_selector('.toast.err'); msg=q.inner_text('.toast.err')
        check(INT[lang] in msg and q.get_attribute('#maintenance_warn_days','aria-invalid')=='true' and q.get_attribute('#repair_cost_limit_net','aria-invalid') is None,f'{lang} {w}px: ganze Zahl verlangt, alte Markierung entfernt')
        q.evaluate("()=>document.querySelectorAll('.toast').forEach(x=>x.remove())")
        q.fill('#maintenance_warn_days',''); q.fill('#repair_cost_limit_net','1.000,50'); q.click('#sf button[type=submit], #sf button:not([type])')
        q.wait_for_selector('.toast:not(.err)')
        check(api('GET','/api/settings')['d']['values'].get('repair_cost_limit_net')=='1000.5',f'{lang} {w}px: „1.000,50“ gespeichert als 1000,5')
        q.goto(B+'/#/more'); q.goto(B+'/#/settings'); q.wait_for_selector('#repair_cost_limit_net')
        check(q.input_value('#repair_cost_limit_net')==SHOWN[lang],f'{lang} {w}px: Anzeige „{SHOWN[lang]}“ ({q.input_value("#repair_cost_limit_net")})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else str(len(fails))+' Fehler'}")
raise SystemExit(1 if fails else 0)
