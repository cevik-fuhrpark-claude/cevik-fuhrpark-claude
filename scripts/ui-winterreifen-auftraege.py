# [CLAUDE] UI-Test Backlog 407 (Fortsetzung „Winterreifen bestellen“): Reifen-Flotte → „Winter nicht erfüllt“ → „Winterreifen-Aufträge für
# mehrere Lkw“: ohne Werkstatt → Hinweis; drei Lkw → je ein Auftrag mit Link; Lkw mit offenem Auftrag danach nicht wählbar.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DONE={'de':'3 Aufträge angelegt','uk':'Створено 3 замовлення','en':'3 orders created'}
NEEDWS={'de':'Werkstatt wählen','uk':'Виберіть майстерню','en':'choose a workshop'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wa.inhaber','display_name':'WA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wa.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=[w['code'] for w in api('GET','/api/meta')['d']['workshops'] if w['code']!='EXTERN'][0]
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        vids=[]
        for i in range(3):
            n+=1; vin=f'WMA06XZZ0HP10{9000+n}'; api('POST','/api/vehicles',{'plate':f'WA-{lang.upper()} {w%1000+i}','vin':vin,'site':'Dortmund'}); vids.append('VIN:'+vin)
            for pos in ['VA-L','VA-R']: api('POST',f'/api/vehicles/VIN:{vin}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'ms'})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wa.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/tires?f=winter_bad'); q.wait_for_selector('#wobatch',timeout=15000); q.click('#wobatch summary')
        for v in vids: q.check(f'#wobf input[value="{v}"]')
        q.click('#wobgo'); q.wait_for_timeout(400)
        check(NEEDWS[lang] in q.inner_text('body') and not q.query_selector('[data-wobdone]'),f'{lang}/{w}: ohne Werkstatt → Hinweis')
        q.select_option('#wobws',ws)
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wob_form_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        q.click('#wobgo'); q.wait_for_selector('[data-wobdone]',timeout=30000)
        t=q.inner_text('[data-wobdone]')
        check(DONE[lang] in t and len(q.query_selector_all('[data-wobdone] a'))==3 and not q.query_selector('[data-wobfail]'),f'{lang}/{w}: 3 Aufträge mit Link ({t[:50]!r})')
        check(not any(NEEDWS[lang] in (x.inner_text() or '') for x in q.query_selector_all('.toast')),f'{lang}/{w}: alter Hinweis nach Erfolg entfernt')
        dis=[q.eval_on_selector(f'#wobf input[value="{v}"]','e => e.disabled') if q.query_selector(f'#wobf input[value="{v}"]') else True for v in vids]
        check(all(dis),f'{lang}/{w}: Lkw mit offenem Auftrag nicht mehr wählbar')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wob_done_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        q.click('[data-wobdone] a'); q.wait_for_timeout(1200)
        check('#/cases/' in q.url and 'Alpine' in q.inner_text('body'),f'{lang}/{w}: Link öffnet den Auftrag')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
