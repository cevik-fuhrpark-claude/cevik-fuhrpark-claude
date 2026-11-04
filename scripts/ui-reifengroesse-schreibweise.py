# [CLAUDE] UI-Test (04.11.2026, Backlog 988, Blickwinkel „Reifendienst-Rechnung und Diktat: Reifengröße in anderer Schreibweise“): In der
# Fahrzeugakte → Reifen erfassen (Wechsel an VA-L, Achsgröße 315/70 R22.5 geprüft) zeigen „315 70 R 22,5“ / „315/70 Р22,5“ (kyrillisch) /
# „315/70r22.5 154/150 l“ keinen Hinweis „andere Größe“, das Feld wird beim Verlassen zu „315/70 R22.5…“, der Wechsel wird ohne Hinweis
# gespeichert; „315/80 R22,5“ zeigt den Hinweis weiter. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SAY={'de':('315 70 R 22,5','315/70 R22.5'),'uk':('315/70 Р22,5','315/70 R22.5'),'en':('315/70r22.5 154/150 l','315/70 R22.5 154/150L')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rg.inhaber','display_name':'RG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ8RP'+str(uuid.uuid4().int)[:6]; plate='RG-K '+str(uuid.uuid4().int)[:3]
    r=api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201),'Fahrzeug angelegt')
    vid=r['d'].get('id') or r['d'].get('vehicle',{}).get('id')
    check(api('POST',f'/api/vehicles/{vid}/tires/specs',{'axle':'lenkachse','size':'315/70 R22.5','verified':True})['s']==200,'Achsgröße hinterlegt')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        tag=f'{lang}/{wd}'; say,want=SAY[lang]
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rg.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+vid); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        q.select_option('#tf select[name="event_type"]','wechsel'); q.select_option('#tf select[name="position"]','VA-L')
        f=q.locator('#tf input[name="size"]'); f.click(); f.fill(''); f.type('315/80 R22,5'); q.wait_for_timeout(50)
        check(q.locator('#tfsizediff [data-tfsizediff]').count()==1,f'{tag}: „315/80 R22,5“ → Hinweis andere Größe')
        f.fill(''); f.type(say); q.wait_for_timeout(50)
        check(q.locator('#tfsizediff [data-tfsizediff]').count()==0,f'{tag}: „{say}“ beim Tippen ohne Hinweis')
        f.evaluate('el => el.blur()'); q.wait_for_timeout(50)
        check(f.input_value()==want,f'{tag}: beim Verlassen → {f.input_value()!r}')
        check(q.locator('#tfsizediff [data-tfsizediff]').count()==0,f'{tag}: nach dem Umschreiben ohne Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: f.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/reifengroesse-{lang}-{wd}.png')
        before=len((api('GET','/api/vehicles/'+vid+'/tires')['d'] or {}).get('history') or [])
        q.locator('#tf button.btn:not(.secondary)').last.click(); hist=[]
        for _ in range(40):
            q.wait_for_timeout(250); hist=(api('GET','/api/vehicles/'+vid+'/tires')['d'] or {}).get('history') or []
            if len(hist)>before: break
        check(len(hist)>before and hist[0]['size']==want,f'{tag}: Wechsel gespeichert ({hist[0]["size"] if hist else None})')
        q.wait_for_timeout(300)
        check(q.locator('[data-tfsizediff]').count()==0,f'{tag}: nach dem Speichern kein Hinweis andere Größe')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
