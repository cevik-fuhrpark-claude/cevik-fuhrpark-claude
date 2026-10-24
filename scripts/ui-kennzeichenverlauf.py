# [CLAUDE] UI-Test (25.10.2026, Backlog 256, Blickwinkel „Lkw wird umgekennzeichnet“): Kennzeichen in den Stammdaten geändert →
# Fahrzeugakte zeigt „Frühere Kennzeichen … (bis …)“, die Suche nach dem alten Kennzeichen findet das Fahrzeug mit „früher …“.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':('Frühere Kennzeichen','früher'),'uk':('Попередні номери','раніше'),'en':('Former plates','formerly')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kv.inhaber','display_name':'KV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        vin=f'WDB9634031V{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); old=f'KV-OL {n}{pid%100:02d}'; new=f'KV-NE {n}{pid%100:02d}'
        check(api('POST','/api/vehicles',{'vin':vin,'plate':old,'site':'Dortmund'})['s']==201,'Fahrzeug')
        check(api('POST','/api/vehicles',{'vin':vin,'plate':new,'site':'Dortmund','keep_active':True})['s']==201,'Kennzeichen geändert')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kv.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/VIN:'+vin); q.reload(); q.wait_for_selector('[data-formerplates]',timeout=15000)
        tx=q.inner_text('[data-formerplates]'); dl=q.inner_text('dl.kv') if q.locator('dl.kv').count() else q.inner_text('main')
        check(old in tx and LBL[lang][0] in dl,f'{lang} {wd}px: Akte zeigt frühere Kennzeichen ({tx[:60]!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Akte ohne Querscrollen')
        if SHOTS: q.locator('[data-formerplates]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kennzeichenverlauf-akte-{lang}-{wd}.png')
        q.goto(B+'/#/search'); q.wait_for_selector('#gq',timeout=15000); q.fill('#gq',old); q.wait_for_selector('[data-formerhit]',timeout=15000)
        hit=q.inner_text('[data-formerhit]')
        check(LBL[lang][1] in hit and old in hit,f'{lang} {wd}px: Suche findet altes Kennzeichen ({hit!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Suche ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/kennzeichenverlauf-suche-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
