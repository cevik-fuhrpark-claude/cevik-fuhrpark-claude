# [CLAUDE] UI-Test (24.10.2026, Backlog 228, Teilagent „Fahrer diktiert die Meldung auf Ukrainisch/Russisch“): Unfall-Hinweis im
# Meldeformular nicht bei „аварійна сигналізація“/„аварийка“ (Warnblinker), wohl bei „аварія“/„авария“/„ДТП“; Diktat, das nur „change“
# auslöst, zeigt den Hinweis; ukrainischer Freitext trägt in DE/EN-Oberfläche lang="uk" (Vorgang, Vorgangsliste), in der UK-Oberfläche nicht.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UA='Сталася аварія на парковці, дзеркало розбите, водійські двері не відкриваються'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dk.inhaber','display_name':'DK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nDK-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM722791;Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WMA15SZZ2HM722791','description':UA,'priority':'mittel','driveability':'fahrbereit','request_key':'dk-228-1'})
    check(r['s'] in (200,201),'Meldung auf Ukrainisch angelegt'); cid=r['d']['id']
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dk.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for x in ['Не працює аварійна сигналізація','Аварийка не работает']:
            q.fill('#d',x); q.wait_for_timeout(100); check(not vis('#acc'),f'{lang}/{w}: „{x}“ ohne Unfall-Hinweis')
        for x in ['Сталася аварія на парковці','Была авария на стоянке','ДТП на трасі']:
            q.fill('#d',x); q.wait_for_timeout(100); check(vis('#acc'),f'{lang}/{w}: „{x}“ mit Unfall-Hinweis')
        # Diktat ohne input-Ereignis (nur change)
        q.fill('#d','Фара'); q.wait_for_timeout(100)
        q.evaluate("() => { const d = document.querySelector('#d'); d.value = 'Після аварії не світить фара'; d.dispatchEvent(new Event('change')); }"); q.wait_for_timeout(100)
        check(vis('#acc'),f'{lang}/{w}: Diktat (nur change) zeigt den Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Meldeformular ohne Querscrollen')
        if SHOTS and w==390: q.locator('#acc').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/diktat-form-{lang}-{w}.png')
        q.fill('#d','')
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_timeout(1200)
        la=q.evaluate("() => { const p = [...document.querySelectorAll('section.panel p')].find((x) => x.textContent.startsWith('Сталася')); return p ? p.getAttribute('lang') : 'FEHLT'; }")
        check(la==(None if lang=='uk' else 'uk'),f'{lang}/{w}: Vorgang – Beschreibung lang={la}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/diktat-vorgang-{lang}-{w}.png')
        q.goto(B+'/#/cases'); q.wait_for_timeout(1200)
        ll=q.evaluate("() => { const s = [...document.querySelectorAll('.title span[lang], .title')].find((x) => x.textContent.includes('Сталася')); return s ? (s.querySelector('span[lang]') || s).getAttribute('lang') : 'FEHLT'; }")
        check(ll==(None if lang=='uk' else 'uk'),f'{lang}/{w}: Vorgangsliste lang={ll}')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
