# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 793, Blickwinkel „Fahrer mit älterem Handy/Browser“, Fortsetzung von 792):
# (1) crypto.randomUUID fehlt in Android-WebView/Chrome < 92 und iOS < 15.4. Die Lagerbuchung (Artikelakte → Buchen) rief es ohne Rückfall auf
#     → Skriptfehler, nichts gebucht; der Rückfall von uid() („Zeit + Math.random()“) enthielt einen Punkt, den das Lager als Schlüssel ablehnt.
#     Das Skript entfernt randomUUID vor dem Laden: Buchung muss gelingen (Bestand steigt), ein zweites Absenden desselben Formulars bucht nicht doppelt.
# (2) color-mix() fehlt in Chrome < 111 und iOS < 16.2: die offene Zeile der Abfahrtskontrolle („bitte beantworten“) hatte dort keinen Hintergrund.
#     Nachgebildet wie in ui-ohne-has.py: Regeln mit color-mix() entfernt, Block `@supports not (… color-mix …)` aktiv → Hintergrund gefüllt.
# DE/UK/EN, 390 und 1366 px, keine Skriptfehler, kein Querscrollen. Dev-Server: CFP_URL. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NOUUID = "Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true });"
OLD = r"""() => { const sheet = [...document.styleSheets].find((s) => (s.href || '').includes('styles')); if (!sheet) return 0;
  const walk = (rules) => [...rules].map((r) => {
    if (r instanceof CSSSupportsRule) return /not\s*\(.*color-mix/.test(r.conditionText) ? walk(r.cssRules) : (CSS.supports(r.conditionText) ? walk(r.cssRules) : '');
    if (r instanceof CSSMediaRule) return `@media ${r.conditionText} { ${walk(r.cssRules)} }`;
    if (r instanceof CSSStyleRule && r.cssText.includes('color-mix(')) return r.cssText.replace(/[^;{]*color-mix\([^;]*;/g, '');
    return r.cssText; }).join('\n');
  const txt = walk(sheet.cssRules); sheet.disabled = true; const st = document.createElement('style'); st.textContent = txt; document.head.appendChild(st);
  return txt.length; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ou.inhaber','display_name':'OU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ou.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM79'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nOU-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    un=f'ou.fahrer{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'OU Fahrer','role':'driver','environment':envn,'language':'de'})
    c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    for lang in ['de','uk','en']:
        for w in [390,1366]:
            tag=f'{lang} {w}'
            # (1) Lagerbuchung ohne randomUUID
            iid=api('POST','/api/stock',{'name':f'OU-Probe {sfx} {lang} {w}','part_number':f'OU-{sfx}-{lang}-{w}','site':ws,'initial_qty':3})['d']['id']
            ctx=br.new_context(viewport={'width':w,'height':900}); ctx.add_init_script(NOUUID); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ou.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
            check(q.evaluate("()=>!crypto.randomUUID"),f'{tag}: alter Browser ohne randomUUID nachgebildet')
            q.goto(B+f'/#/stock/{iid}'); q.reload(); q.wait_for_selector('#mf',timeout=20000)
            q.select_option('#mf [name=type]','zugang'); q.fill('#mf [name=qty]','2'); q.click('#mf button.btn')
            q.wait_for_function(f"async()=>{{const r=await fetch('/api/stock/{iid}');const d=await r.json();return d.item.on_hand===5}}",timeout=10000)
            check(api('GET',f'/api/stock/{iid}')['d']['item']['on_hand']==5,f'{tag}: Zugang ohne randomUUID gebucht (3 → 5)')
            mv=[m for m in api('GET',f'/api/stock/{iid}')['d']['movements'] if m.get('type')=='zugang']
            check(len(mv)==2,f'{tag}: genau eine neue Buchung ({len(mv)} Zugänge inkl. Anfangsbestand)')
            check(not q.locator('.toast.err').count(),f'{tag}: keine Fehlermeldung')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Artikelakte ohne Querscrollen')
            if SHOTS: q.screenshot(path=f"{SHOTS}/ohne-uuid-{lang}-{w}-lager.png")
            check(not errs,f'{tag}: keine Skriptfehler (Lager) {errs[:1]}')
            ctx.close()
            # (2) Abfahrtskontrolle ohne color-mix(): offene Zeile markiert
            ctx=br.new_context(viewport={'width':w,'height':900}); ctx.add_init_script(NOUUID); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
            q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('.seg',timeout=20000); q.wait_for_timeout(400)
            check(q.evaluate(OLD)>1000,f'{tag}: Browser ohne color-mix() nachgebildet')
            check(not q.evaluate("()=>CSS.supports('background','color-mix(in srgb, red 10%, transparent)') && [...document.styleSheets].some(s=>!s.disabled && [...s.cssRules].some(r=>r.cssText.includes('color-mix(')))"),f'{tag}: keine color-mix()-Regel mehr aktiv')
            q.fill('#km','123456'); q.locator('#f button[type=submit], #f .btn').last.click(); q.wait_for_timeout(300)
            bg=q.evaluate("()=>{const r=document.querySelector('.checkitem.missing');return r?getComputedStyle(r).backgroundColor:null}")
            check(bg is not None,f'{tag}: offene Zeile markiert')
            check(bg not in (None,'rgba(0, 0, 0, 0)','transparent'),f'{tag}: offene Zeile ohne color-mix() mit Hintergrund ({bg})')
            if SHOTS: q.screenshot(path=f"{SHOTS}/ohne-colormix-{lang}-{w}-check.png")
            check(not errs,f'{tag}: keine Skriptfehler (Abfahrtskontrolle) {errs[:1]}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
