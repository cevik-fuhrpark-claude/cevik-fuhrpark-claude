# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1491, Blickwinkel „Person mit Bewegungsempfindlichkeit, System auf ‚Bewegung reduzieren‘“, WCAG 2.3.3):
# Öffnet ein Aktionsformular am Vorgang, springt die Seite bei „Bewegung reduzieren“ sofort dorthin (kein weiches Scrollen);
# ohne die Einstellung bleibt das weiche Scrollen. Kein Toast-Hineingleiten bei „reduzieren“. DE/UK/EN, 390/820/1366 px,
# ohne Querscrollen/Skriptfehler. Screenshots optional (CFP_SHOTS=<Ordner>).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# klickt den ersten Aktionsknopf (öffnet das Formular unten auf der Seite) und misst die Scrollposition direkt danach und nach 1,2 s
PROBE = """async () => { const b = document.querySelector('button[data-act]'); if (!b) return null; window.scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(() => r())); b.click(); const y0 = window.scrollY;
  await new Promise((r) => setTimeout(r, 1200)); const f = document.querySelector('#af');
  return { act: b.dataset.act, y0, y1: window.scrollY, form: !!f, top: f ? Math.round(f.getBoundingClientRect().top) : null,
    over: document.documentElement.scrollWidth > innerWidth + 1 }; }"""
TOAST = """() => { const el = document.createElement('div'); el.className = 'toast'; el.textContent = 'x'; document.body.appendChild(el);
  const a = getComputedStyle(el).animationName; el.remove(); return a; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bw.inhaber','display_name':'BW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:5]; vin=f'WDB9634032{sfx}01'
    r=api('POST','/api/vehicles',{'vin':vin,'plate':f'BW-RM {sfx[:4]}','site':'Dortmund'}); check(r['s'] in (200,201),f'Fahrzeug angelegt ({r["s"]})')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts lose, Test Bewegung reduzieren','priority':'niedrig','driveability':'fahrbereit','request_key':str(uuid.uuid4())})
    cid=r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else (r['d'] or {}).get('id'); check(bool(cid),'Vorgang angelegt')
    for motion in ['reduce','no-preference']:
      for lang in ['de','uk','en']:
        for wd,h in [(390,560),(820,600),(1366,600)]:
            ctx=br.new_context(viewport={'width':wd,'height':h},reduced_motion=motion); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bw.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('button[data-act]',timeout=15000); q.wait_for_timeout(400)
            r=q.evaluate(PROBE); tag=f'{motion} {lang} {wd}px'
            check(r and r['form'],f'{tag}: Aktionsformular „{r and r["act"]}“ geöffnet')
            check(r['y1']>0 and r['top'] is not None and r['top']<h,f'{tag}: Formular in Sicht gescrollt (y={r["y1"]}, oben {r["top"]} px)')
            if motion=='reduce': check(abs(r['y0']-r['y1'])<=2,f'{tag}: sofortiger Sprung ohne weiches Scrollen (direkt {r["y0"]}, später {r["y1"]})')
            else: check(r['y0']<r['y1']-2,f'{tag}: ohne Einstellung weiches Scrollen (direkt {r["y0"]}, später {r["y1"]})')
            an=q.evaluate(TOAST)
            check((an=='none')==(motion=='reduce'),f'{tag}: Toast-Animation {an}')
            check(not r['over'],f'{tag}: kein Querscrollen')
            if SHOTS: q.screenshot(path=os.path.join(SHOTS,f'bewegung-{motion}-{lang}-{wd}.png'))
            check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
            ctx.close()
    br.close()
print('UI Bewegung reduzieren:', 'OK' if not fails else f'{len(fails)} FEHLER'); raise SystemExit(1 if fails else 0)
