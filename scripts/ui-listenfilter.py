# [CLAUDE] UI-Test: Listen-Filter bauen die Seite neu auf – eine eingetippte Suche muss stehen bleiben und weiter wirken.
# Fahrzeugliste: Suche tippen, dann Verfügbarkeits-Filter, Art-Filter (Lkw/Anhänger) und Sortierung wechseln → Suchtext bleibt,
# nur passende Fahrzeuge sichtbar, Druckkopf nennt die Suche. Suche findet auch Hersteller/Modell (Liste zeigt beides). 390/820/1366 px, keine Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
VIS="()=>[...document.querySelectorAll('#vl a')].filter(a=>!a.hidden).map(a=>a.dataset.s)"
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fm.inhaber','display_name':'FM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for j,(pl,kind) in enumerate([('FM-LF 11','lkw'),('FM-LF 12','lkw'),('FM-XY 13','lkw'),('FM-LF 14','anhaenger')]):
        r=api('POST','/api/vehicles',{'vin':f'WDB96340310777{j:03d}','plate':pl,'site':'Dortmund','kind':kind,**({'manufacturer':'Volvo','model':'FH 500'} if pl=='FM-XY 13' else {})})
        check(r['s'] in (200,201),f'Fahrzeug {pl} angelegt ({r["s"]})')
    for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fm.inhaber','password':PW}])
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl')
        q.fill('#q','fm-lf 1'); q.wait_for_timeout(100)
        v0=q.evaluate(VIS)
        check(len(v0)==3 and not any('fm-xy' in x for x in v0),f'{w}px: Suche grenzt ein ({len(v0)})')
        for sel,name in [('[data-av="einsatzbereit_lt_system"]','Verfügbarkeit'),('[data-av="all"]','Verfügbarkeit „Alle“'),('[data-vk="lkw"]','Art Lkw')]:
            if not q.locator(sel).count(): check(False,f'{w}px: Knopf {sel} fehlt'); continue
            q.locator(sel).first.click(); q.wait_for_timeout(400)
            check(q.input_value('#q')=='fm-lf 1',f'{w}px: Suchtext bleibt nach Filter {name}')
            vis=q.evaluate(VIS)
            check(vis and not any('fm-xy' in x for x in vis),f'{w}px: Suche wirkt weiter nach Filter {name} ({len(vis)} sichtbar)')
        check(len(q.evaluate(VIS))==2,f'{w}px: Lkw + Suche → 2 Fahrzeuge')
        q.select_option('#vsort','km_desc'); q.wait_for_timeout(400)
        check(q.input_value('#q')=='fm-lf 1',f'{w}px: Suchtext bleibt nach Sortierung')
        check(q.input_value('#vsort')=='km_desc',f'{w}px: neue Sortierung gilt')
        check(len(q.evaluate(VIS))==2,f'{w}px: Suche wirkt weiter nach Sortierung')
        check('fm-lf 1' in q.evaluate("()=>document.querySelector('#vprl').textContent"),f'{w}px: Druckkopf nennt die Suche')
        if SHOTS: q.screenshot(path=f'{SHOTS}/listenfilter_{w}.png')
        q.select_option('#vsort','plate'); q.locator('[data-vk="all"]').first.click(); q.wait_for_timeout(300)
        # Seitenwechsel: Suche gilt nur für diese Seite (anderes Ziel → frisch)
        q.goto(B+'/#/'); q.wait_for_timeout(300); q.goto(B+'/#/vehicles'); q.wait_for_selector('#vl'); q.wait_for_timeout(200)
        check(q.input_value('#q')=='',f'{w}px: nach Seitenwechsel leere Suche')
        # Suche nach Hersteller/Modell (Liste zeigt Hersteller + Modell)
        for term in ['volvo','fh 500']:
            q.fill('#q',term); q.wait_for_timeout(100); vis=q.evaluate(VIS)
            check(len(vis)==1 and 'fm-xy 13' in vis[0],f'{w}px: Suche „{term}“ findet FM-XY 13 ({len(vis)})')
        check('Volvo FH 500' in q.locator('#vl a:not([hidden])').first.inner_text(),f'{w}px: Liste zeigt Hersteller und Modell')
        check('Hersteller' in (q.get_attribute('#q','placeholder') or ''),f'{w}px: Platzhalter nennt Suchfelder')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'ALLES GRÜN' if not fails else str(len(fails))+' FEHLER'}")
raise SystemExit(1 if fails else 0)
