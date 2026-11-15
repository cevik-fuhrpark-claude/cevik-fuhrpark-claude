# [CLAUDE] UI-Test Backlog 1499 (WCAG 3.3.1, 15.11.2026): Prüffehler in Sammelformularen hängen an der Auswahlliste bzw. am Feld –
# „Unterweisung für mehrere Fahrer“ ohne Auswahl → Liste aria-invalid + aria-describedby auf sichtbaren Hinweis, Fokus aufs erste Kästchen,
# Haken setzen hebt auf; Protokoll-CSV mit „von“ nach „bis“ → Feld „bis“ markiert, Ändern von „von“ hebt auf. DE/UK/EN, 390/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh; eigener Port: CFP_URL). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ff.inhaber','display_name':'FF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ff.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for n in ['FF Fahrer Eins','FF Fahrer Zwei']: api('POST','/api/drivers',{'display_name':n})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ff.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/drivers'); q.wait_for_selector('#dtb summary'); q.click('#dtb summary')
        q.fill('#dtbf input[name=title]','Ladungssicherung'); q.fill('#dtbf input[name=evidence]','Teilnehmerliste')
        q.evaluate("()=>document.querySelector('#dtbf').requestSubmit()")
        q.wait_for_selector('#dtbf [role=group][aria-invalid=true]',timeout=5000)
        r=q.evaluate("""()=>{const g=document.querySelector('#dtbf [role=group][aria-invalid=true]'); const p=document.getElementById(g.getAttribute('aria-describedby')||'x');
          const a=document.activeElement; return {hint:p?p.textContent:'', vis:!!(p&&p.offsetParent), focus:!!(a&&a.name==='driver_ids'&&g.contains(a)), after:!!(p&&g.nextElementSibling===p)}}""")
        check(len(r['hint'])>3 and r['vis'] and r['after'],f'{lang} {w}px: Fahrerliste mit sichtbarem Hinweis unter der Liste „{r["hint"]}“')
        check(r['focus'],f'{lang} {w}px: Fokus auf dem ersten Kästchen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/liste_{lang}_{w}.png')
        q.keyboard.press('Space')
        check(q.evaluate("()=>!document.querySelector('#dtbf [aria-invalid]') && !document.querySelector('#dtbf .fielderr')"),f'{lang} {w}px: Haken (Leertaste) hebt Markierung auf')
        q.goto(B+'/#/audit'); q.wait_for_selector('#auf',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#auf').closest('details'); if(d) d.open=true}")
        q.fill('#auf input[name=from]','2026-11-10'); q.fill('#auf input[name=to]','2026-11-01')
        q.evaluate("()=>document.querySelector('#auf').requestSubmit()")
        q.wait_for_selector('#auf input[name=to][aria-invalid=true]',timeout=5000)
        r=q.evaluate("()=>{const e=document.querySelector('#auf input[name=to]'); const p=document.getElementById(e.getAttribute('aria-describedby')||'x'); return {hint:p?p.textContent:'', focus:document.activeElement===e}}")
        check(len(r['hint'])>3 and r['focus'],f'{lang} {w}px: Protokoll „bis“ markiert und fokussiert „{r["hint"]}“')
        if SHOTS and w==390: q.locator('#auf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/zeitraum_{lang}_{w}.png')
        q.fill('#auf input[name=from]','2026-10-01'); q.evaluate("()=>document.querySelector('#auf input[name=from]').dispatchEvent(new Event('change'))")
        check(q.evaluate("()=>!document.querySelector('#auf [aria-invalid]') && !document.querySelector('#auf .fielderr')"),f'{lang} {w}px: „von“ geändert hebt Markierung auf')
        sw=q.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
        check(sw<=1,f'{lang} {w}px: kein Querscrollen ({sw})')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
