# [CLAUDE] UI-Test Backlog 1643 (Blickwinkel „Nur noch eine Werkstatt aktiv – Leitung legt einen Lagerartikel an bzw. importiert eine Lagerliste“):
# Bei genau einer aktiven Werkstatt zeigt „Neuer Artikel“ keine Werkstattauswahl, sendet das Lager aber mit (vorher „Werkstatt/Lager ist erforderlich“);
# Anfangsbestand, der auf 0 rundet, markiert das Feld „Anfangsbestand“; Beschriftungen fokussieren ihr Feld (for/id).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ezl.inhaber','display_name':'EZL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ezl.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    wss=[w['code'] for w in api('GET','/api/meta')['d']['workshops']]; keep=wss[0]; closed=wss[1:]
    for c in closed: a.evaluate("async (c) => (await fetch('/__dev/workshop-active?active=0&code='+encodeURIComponent(c), { method: 'POST' })).status", c)
    try:
      check([w['code'] for w in api('GET','/api/meta')['d']['workshops']]==[keep],'nur eine Werkstatt aktiv')
      n=0
      for lang in ['de','uk','en']:
        api('PATCH','/api/me',{'language':lang})
        for w,h in [(390,844),(820,1180),(1366,900)]:
          n+=1
          ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
          q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ezl.inhaber','password':PW}])
          q.goto(B+'/#/stock'); q.wait_for_selector('#nf',state='attached',timeout=15000)
          q.click('#nf >> xpath=ancestor::details/summary')
          check(q.locator('#nf select[name=site]').count()==0 and q.locator('#nf input[type=hidden][name=site]').get_attribute('value')==keep,f'{lang}/{w}: keine Auswahl, Lager {keep} wird mitgesendet')
          q.click('label[for=nf_name]'); check(q.evaluate("document.activeElement && document.activeElement.id")=='nf_name',f'{lang}/{w}: Beschriftung fokussiert Bezeichnung')
          name=f'EZL Filter {lang} {w}'
          q.fill('#nf_name',name); q.fill('#nf_init','0,0004'); q.click('#nf button.btn'); q.wait_for_selector('#err_nf_init',timeout=8000)
          check(q.get_attribute('#nf_init','aria-invalid')=='true' and q.is_visible('#err_nf_init'),f'{lang}/{w}: Anfangsbestand markiert')
          if SHOTS: q.locator('#nf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ezl_{lang}_{w}.png')
          check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
          q.fill('#nf_init','2'); q.click('#nf button.btn'); q.wait_for_timeout(1500)
          items=api('GET','/api/stock')['d']['items']; it=[i for i in items if i['name']==name]
          check(len(it)==1 and it[0]['site']==keep and it[0]['on_hand']==2,f'{lang}/{w}: Artikel im einzigen Lager angelegt')
          check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
          ctx.close()
    finally:
      for c in closed: a.evaluate("async (c) => (await fetch('/__dev/workshop-active?active=1&code='+encodeURIComponent(c), { method: 'POST' })).status", c)
      api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Einzellager: alles grün')
raise SystemExit(1 if fails else 0)
