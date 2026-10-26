# [CLAUDE] UI-Test Backlog 410 (Blickwinkel „Jährliche Fahrerunterweisung – viele Fahrer in einer Schulung“): Mehr → Fahrer →
# „Unterweisung für mehrere Fahrer erfassen“: ohne Auswahl → Hinweis; „Alle“ → je Fahrer ein Nachweis mit Link; erneut senden → „bereits erfasst“;
# Nachweis in der Fahrerakte sichtbar. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
NONE={'de':'mindestens einen Fahrer','uk':'принаймні одного водія','en':'at least one driver'}
WAS={'de':'bereits erfasst','uk':'вже було внесено','en':'already recorded'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'uw.inhaber','display_name':'UW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'uw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        for i in range(2): api('POST','/api/drivers',{'display_name':f'Teilnehmer {lang.upper()} {w} Nr. {i+1} mit langem Namen','personnel_no':f'UW-{n}-{i}'})
        total=len(api('GET','/api/drivers')['d']['drivers'])
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'uw.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/drivers'); q.wait_for_selector('#dtb',timeout=15000); q.click('#dtb summary')
        title=f'Ladungssicherung {lang} {w}'
        q.fill('#dtbf input[name=title]',title); q.fill('#dtbf input[name=evidence]','Teilnehmerliste UI')
        q.click('#dtbgo'); q.wait_for_timeout(400)
        check(any(NONE[lang] in (x.inner_text() or '') for x in q.query_selector_all('.toast')) and not q.query_selector('[data-dtbdone]'),f'{lang}/{w}: ohne Auswahl → Hinweis')
        q.click('[data-dtb="1"]')
        check(str(total) in q.inner_text('#dtbcount'),f'{lang}/{w}: Zähler {total}')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/uw_form_{lang}.png',full_page=True)
        check(q.evaluate(noscroll),f'{lang}/{w}: Formular ohne Querscrollen')
        q.click('#dtbgo'); q.wait_for_selector('[data-dtbdone]',timeout=20000)
        check(str(total) in q.inner_text('[data-dtbdone]') and len(q.query_selector_all('#dtbres a'))==total and WAS[lang] not in q.inner_text('#dtbres'),f'{lang}/{w}: {total} erfasst mit Link')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/uw_done_{lang}.png',full_page=True)
        check(not any(NONE[lang] in (x.inner_text() or '') for x in q.query_selector_all('.toast')),f'{lang}/{w}: alter Hinweis nach Erfolg entfernt')
        split=q.evaluate("""() => [...document.querySelectorAll('#dtbf .tfpos .muted')].filter((x) => x.getClientRects().length > 1).length""")
        check(split==0,f'{lang}/{w}: Personalnummer nicht umbrochen ({split})')
        check(q.evaluate(noscroll),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        q.fill('#dtbf input[name=title]',title); q.fill('#dtbf input[name=evidence]','Teilnehmerliste UI'); q.click('[data-dtb="1"]'); q.click('#dtbgo')
        q.wait_for_function(f"() => {{ const x = document.querySelector('#dtbres'); return x && x.innerText.includes({WAS[lang]!r}); }}",timeout=20000)
        check(q.query_selector_all('#dtbres .muted') and len(q.query_selector_all('#dtbres .muted'))==total,f'{lang}/{w}: erneut gesendet → alle „bereits erfasst“')
        q.click('#dtbres a'); q.wait_for_timeout(1200)
        check('#/drivers/' in q.url and title in q.inner_text('body'),f'{lang}/{w}: Nachweis in der Fahrerakte')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
