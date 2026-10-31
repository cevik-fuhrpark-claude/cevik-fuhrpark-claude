# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 792, Blickwinkel „Fahrer mit älterem Handy/Browser“): Ältere Browser ohne CSS :has()
# (Android-WebView/Chrome < 105, Samsung Internet < 20, Firefox < 121, iOS < 15.4) zeigten in der Abfahrtskontrolle (OK/Mangel/entfällt)
# und in der Fahrzeugwahl nach dem Tippen keine Auswahl an, weil das Auswahlfeld unsichtbar ist und nur :has() die Beschriftung färbt.
# Chromium kann :has() – das Skript bildet einen alten Browser nach: alle Regeln mit :has() werden entfernt, der Block
# `@supports not selector(:has(*))` gilt. Dann müssen die Auswahlfelder sichtbar sein, das getippte Feld gewählt, kein Querscrollen
# (320/390/1366 px). Mit :has() bleibt alles wie bisher (Feld unsichtbar, gewählte Beschriftung gefüllt). DE/UK/EN. Dev-Server: CFP_URL.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# Bildet einen Browser ohne :has() nach (Regeln mit :has() weg, @supports-not-Block aktiv)
OLD = r"""() => { const sheet = [...document.styleSheets].find((s) => (s.href || '').includes('styles')); if (!sheet) return 0;
  const walk = (rules) => [...rules].map((r) => {
    if (r instanceof CSSSupportsRule) return /not\s+selector\(:has/.test(r.conditionText) ? walk(r.cssRules) : (CSS.supports(r.conditionText) ? walk(r.cssRules) : '');
    if (r instanceof CSSMediaRule) return `@media ${r.conditionText} { ${walk(r.cssRules)} }`;
    if (r instanceof CSSStyleRule && r.selectorText.includes(':has(')) return '';
    return r.cssText; }).join('\n');
  const txt = walk(sheet.cssRules); sheet.disabled = true; const st = document.createElement('style'); st.id = 'ohnehas'; st.textContent = txt; document.head.appendChild(st);
  return txt.length; }"""
VIS = r"""(sel) => [...document.querySelectorAll(sel)].filter((e) => e.closest('label') && e.closest('label').checkVisibility()).map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  return { op: Number(cs.opacity), w: Math.round(r.width), pos: cs.position, chk: e.checked }; })"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'oh.inhaber','display_name':'OH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'oh.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM78'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nOH-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    un=f'oh.fahrer{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'OH Fahrer','role':'driver','environment':envn,'language':'de'})
    c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
    for lang in ['de','uk','en']:
        for w in [320,390,1366]:
            for old in [True,False]:
                ctx=br.new_context(viewport={'width':w,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                tag=f'{lang} {w} {"ohne :has()" if old else "mit :has()"}'
                # Abfahrtskontrolle
                q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('.seg',timeout=20000); q.wait_for_timeout(500)
                if old: check(q.evaluate(OLD)>1000,f'{tag}: alter Browser nachgebildet')
                q.locator('.seg').nth(0).locator('label').nth(1).click(); q.locator('.seg').nth(1).locator('label').nth(0).click(); q.wait_for_timeout(150)
                v=q.evaluate(VIS,'.seg input')
                check(len(v)>=3*15,f'{tag}: Prüfpunkte gefunden ({len(v)//3})')
                if old: check(all(x['op']==1 and x['w']>=16 and x['pos']=='static' for x in v),f'{tag}: Auswahlfelder der Abfahrtskontrolle sichtbar')
                else:
                    check(all(x['op']==0 for x in v),f'{tag}: Auswahlfelder wie bisher unsichtbar')
                    bg=q.evaluate("()=>getComputedStyle(document.querySelectorAll('.seg')[0].querySelectorAll('label')[1]).backgroundColor")
                    check(bg not in ('rgba(0, 0, 0, 0)','transparent'),f'{tag}: gewählte Beschriftung „Mangel“ gefüllt ({bg})')
                check(v[1]['chk'] and v[3]['chk'] and not v[0]['chk'],f'{tag}: getippte Auswahl gewählt (Mangel, OK)')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Abfahrtskontrolle ohne Querscrollen')
                if SHOTS: q.screenshot(path=f"{SHOTS}/ohne-has-{lang}-{w}-{int(old)}-check.png")
                # Fahrzeugwahl im Meldeformular
                q.goto(B+'/#/new'); q.reload(); q.wait_for_selector('.vehpick',timeout=20000); q.wait_for_timeout(500)
                if old: q.evaluate(OLD)
                lab=q.locator('.vehpick label',has_text=f'OH-ZM {sfx}'); lab.click(); q.wait_for_timeout(150)
                v=q.evaluate(VIS,'.vehpick input')
                check(len(v)>=1,f'{tag}: Fahrzeugwahl gefunden ({len(v)})')
                if old: check(all(x['op']==1 and x['w']>=16 for x in v),f'{tag}: Auswahlfelder der Fahrzeugwahl sichtbar')
                else: check(all(x['op']==0 for x in v),f'{tag}: Fahrzeugwahl wie bisher')
                check(q.evaluate(f"()=>[...document.querySelectorAll('.vehpick label')].some(l=>l.textContent.includes('OH-ZM {sfx}') && l.querySelector('input').checked)"),f'{tag}: getipptes Fahrzeug gewählt')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Meldeformular ohne Querscrollen')
                if SHOTS: q.screenshot(path=f"{SHOTS}/ohne-has-{lang}-{w}-{int(old)}-new.png")
                check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
                ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
