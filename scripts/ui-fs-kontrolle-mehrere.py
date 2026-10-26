# [CLAUDE] UI-Test Backlog 411 (Blickwinkel „Halbjährliche Führerscheinkontrolle aller Fahrer an einem Tag“): Mehr → Fahrer →
# „Führerscheinkontrolle für mehrere Fahrer (in Ordnung)“: „Fällige auswählen“ wählt nur Fahrer ohne aktuelle Kontrolle, Erfassen → Link je Fahrer,
# Fahrer danach „aktuell“; erneut → „bereits erfasst“. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WAS={'de':'bereits erfasst','uk':'вже було внесено','en':'already recorded'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('PUT','/api/settings',{'license_check_months':6})['s']==200,'Intervall 6 Monate')
    today=api('GET','/api/contracts')['d']['today']
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        ids=[api('POST','/api/drivers',{'display_name':f'Kontrolle {lang.upper()} {w} Nr. {i+1}','personnel_no':f'FK-{n}-{i}'})['d']['id'] for i in range(3)]
        # ein Fahrer ist heute schon kontrolliert → nicht fällig
        api('POST',f'/api/drivers/{ids[2]}/license-checks',{'checked_on':today,'result':'in_ordnung'})
        due=sum(1 for d in api('GET','/api/drivers')['d']['drivers'] if d['status']['check']['status'] in ('faellig','bald','fehlt'))
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/drivers'); q.wait_for_selector('#dlb',timeout=15000); q.click('#dlb summary')
        q.click('[data-dlb="due"]')
        sel=q.evaluate("() => [...document.querySelectorAll('#dlbf input[name=driver_ids]:checked')].map((x) => x.value)")
        check(len(sel)==due and ids[0] in sel and ids[2] not in sel,f'{lang}/{w}: Fällige ausgewählt ({len(sel)}/{due})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/fk_form_{lang}.png',full_page=True)
        check(q.evaluate(noscroll),f'{lang}/{w}: Formular ohne Querscrollen')
        split=q.evaluate("() => [...document.querySelectorAll('#dlbf .tfpos .muted, #dlbf .tfpos .chip')].filter((x) => x.getClientRects().length > 1).length")
        check(split==0,f'{lang}/{w}: Personalnummer/Status nicht umbrochen ({split})')
        q.click('#dlbgo'); q.wait_for_selector('[data-dlbdone]',timeout=20000)
        check(str(due) in q.inner_text('[data-dlbdone]') and len(q.query_selector_all('#dlbres a'))==due,f'{lang}/{w}: {due} erfasst mit Link')
        left=q.evaluate("() => document.querySelectorAll('#dlbf input[data-due=\"1\"]').length")
        check(left==0,f'{lang}/{w}: danach keiner mehr fällig ({left})')
        check(q.evaluate(noscroll),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        q.click('[data-dlb="1"]'); q.click('#dlbgo')
        q.wait_for_function(f"() => {{ const x = document.querySelector('#dlbres'); return x && x.innerText.includes({WAS[lang]!r}); }}",timeout=20000)
        check('✓' in q.inner_text('[data-dlbdone]'),f'{lang}/{w}: erneut → bereits erfasst')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
