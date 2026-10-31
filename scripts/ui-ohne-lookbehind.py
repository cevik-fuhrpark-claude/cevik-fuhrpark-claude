# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 794, Blickwinkel „Fahrer mit älterem Handy/Browser“): Safari/iOS < 16.4 kennt im regulären
# Ausdruck kein Lookbehind `(?<=…)`/`(?<!…)`. Als Literal im Modul ist das ein Syntaxfehler beim Laden – die App startete auf solchen iPhones gar
# nicht. Die erzeugten Module bauen diese Ausdrücke jetzt über lbRx() (scripts/build-app.mjs); ohne Lookbehind entsteht eine Ersatzfassung.
# Das Skript bildet einen alten Browser nach: `new RegExp` mit Lookbehind wirft wie in Safari < 16.4 einen SyntaxError. Dann muss die App
# starten (Fahrer-Startseite, Meldeformular) und jeder Hinweis im Meldeformular, den ein neuer Browser zu einer Beispielbeschreibung zeigt,
# auch im alten Browser erscheinen (Ersatzfassung trifft eher mehr, nie weniger). Zusätzlich: ausgelieferte Module ohne Lookbehind-Literal.
# DE/UK/EN, 390 und 1366 px, keine Skriptfehler, kein Querscrollen. Dev-Server: CFP_URL. Screenshots: CFP_SHOTS=<Ordner>.
import os, re, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OLD = r"""(() => { const R = RegExp; let n = 0;
  const chk = (a) => { const s = a && typeof a === 'object' && 'source' in a ? a.source : String(a); if (/\(\?<[=!]/.test(s)) { n++; throw new SyntaxError('Invalid regular expression: invalid group specifier name'); } };
  window.RegExp = new Proxy(R, { construct(t, a, nt) { chk(a[0]); return Reflect.construct(t, a, nt); }, apply(t, th, a) { chk(a[0]); return Reflect.apply(t, th, a); } });
  window.__lbThrown = () => n; })();"""
SAMPLES = ['Unfall beim Rangieren, Spiegel abgefahren', 'Reifen hinten links platt', 'Windschutzscheibe hat einen Riss', 'Kennzeichen hinten verloren',
  'Motor springt nicht an', 'Klimaanlage geht net', 'Bremse kaput, Bremslicht defekt', 'Tachograph zeigt Fehler, Fahrerkarte wird nicht gelesen',
  'Anhänger an der Brücke hängen geblieben, zu hoch für die Brücke', 'Diesel läuft aus, Tank undicht', 'Plane gerissen, Ladung verrutscht',
  'лобове скло тріснуло', 'колесо спущене', 'не заводиться двигун', 'windscreen cracked', 'tyre is flat on the trailer', 'brake light not working', 'hit a cyclist while turning']
HINTS = """() => [...document.querySelectorAll('form [id]')].filter((e) => e.hidden === false && e.dataset.lbw === '1').map((e) => e.id).sort()"""
MARK = """() => document.querySelectorAll('form [id]').forEach((e) => { if (e.hidden) e.dataset.lbw = '1'; })"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lb.inhaber','display_name':'LB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lb.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM77'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nLB-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    un=f'lb.fahrer{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':'LB Fahrer','role':'driver','environment':envn,'language':'de'})
    c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close()
    # ausgelieferte Module: kein Regex-Literal mit Lookbehind (wäre in Safari < 16.4 ein Syntaxfehler des ganzen Moduls)
    for f in ['app-main.js','app-verwaltung.js','app-lager.js','app-fahrzeug.js','i18n-core.js','i18n-de.js','i18n-uk.js','i18n-en.js','boot.js','sw.js','werkstatt/app.js']:
        txt=a.evaluate("async (u) => (await fetch(u)).text()", '/'+f)
        bad=[m.start() for m in re.finditer(r'\(\?<[=!]', txt) if 'String.raw`' not in txt[max(0,txt.rfind('\n',0,m.start())):m.start()] and "new RegExp('(?<=a)b')" not in txt[m.start()-20:m.start()+20] and 'startsWith(' not in txt[m.start()-20:m.start()]]
        check(not bad,f'/{f}: kein Lookbehind-Literal ({len(bad)})')
    for lang in ['de','uk','en']:
        for w in [390,1366]:
            res={}
            for old in [False,True]:
                tag=f'{lang} {w} {"alter Browser" if old else "neuer Browser"}'
                ctx=br.new_context(viewport={'width':w,'height':900})
                if old: ctx.add_init_script(OLD)
                q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                q.goto(B+'/#/'); q.reload(); q.wait_for_selector('nav.tabbar',timeout=20000)
                if old:
                    n0=q.evaluate('()=>window.__lbThrown()'); check(n0==1,f'{tag}: beim Start nur die Fähigkeitsprobe von lbRx abgewiesen ({n0})')
                    check(q.evaluate('()=>{ try { new RegExp("(?<=a)b"); return false; } catch (e) { return e instanceof SyntaxError; } }'),f'{tag}: Lookbehind wirft wie in Safari < 16.4')
                check(q.locator('text=Die App konnte nicht').count()==0 and q.locator('text=could not be loaded').count()==0,f'{tag}: App gestartet (Startseite)')
                q.goto(B+'/#/new'); q.wait_for_selector('#d',timeout=20000); q.wait_for_timeout(300); q.evaluate(MARK)
                hits=[]
                for s in SAMPLES:
                    q.fill('#d',''); q.fill('#d',s); q.wait_for_timeout(120); hits.append(q.evaluate(HINTS))
                res[old]=hits
                check(sum(1 for h in hits if h)>=8,f'{tag}: Hinweise im Meldeformular erscheinen ({sum(1 for h in hits if h)} von {len(SAMPLES)} Beispielen)')
                check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{tag}: Meldeformular ohne Querscrollen')
                if old: n1=q.evaluate('()=>window.__lbThrown()'); check(n1==2,f'{tag}: beim Tippen kein Ausdruck mit Lookbehind gebaut ({n1-2} weitere abgewiesen)')
                if SHOTS: q.screenshot(path=f"{SHOTS}/ohne-lookbehind-{lang}-{w}-{int(old)}.png")
                check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
                ctx.close()
            miss=[(SAMPLES[i],sorted(set(n)-set(o))) for i,(n,o) in enumerate(zip(res[False],res[True])) if set(n)-set(o)]
            check(not miss,f'{lang} {w}: alter Browser zeigt jeden Hinweis des neuen {miss[:2]}')
            more=sum(1 for n,o in zip(res[False],res[True]) if set(o)-set(n))
            print(f'    (alter Browser zeigt bei {more} von {len(SAMPLES)} Beispielen zusätzlich einen Hinweis)')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
