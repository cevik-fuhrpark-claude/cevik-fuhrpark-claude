# [CLAUDE] UI-Test (16.11.2026, Backlog 1529, Blickwinkel „Leitung fragt: Welches Fahrzeug fährt Fahrer X gerade? Wer hat noch kein Fahrzeug?“):
# Fahrerliste (Mehr → Fahrer) zeigt 🚚 mit den zurzeit zugeordneten Fahrzeugen, Kästchen „Ohne Fahrzeug (n)“ (nur Akten mit App-Konto),
# Hinweis, Druckkopf. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Ohne Fahrzeug','uk':'Без ТЗ','en':'Without vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fz.inhaber','display_name':'FZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    def invite(un,dn,role):
        u=api('POST','/api/users',{'username':un,'display_name':dn,'role':role,'environment':envn})
        check(u['s']==201,f'Konto {un}')
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d']['id']
    invite('fz.leitung','FZ Leitung','fleet')
    d1=invite('fz.fahrer1','Olena Kovalenko','driver'); d2=invite('fz.fahrer2','Petro Ohnefahrzeug','driver')
    for plate,vin in [('FZ-AB 1529','WDB96340315290001'),('FZ-CD 1529','WDB96340315290002')]:
        check(api('POST','/api/vehicles',{'plate':plate,'vin':vin,'site':'Dortmund'})['s'] in (200,201),f'Fahrzeug {plate}')
    check(api('POST','/api/vehicles/VIN:WDB96340315290001/drivers',{'user_id':d1})['s']==201,'Zuordnung')
    for n,u in [('Olena Kovalenko',d1),('Petro Ohnefahrzeug',d2),('Ivan Kontolos',None)]:
        b={'display_name':n}; 
        if u: b['user_id']=u
        check(api('POST','/api/drivers',b)['s']==201,f'Akte {n}')
    for lang in ['de','uk','en']:
      lab=LBL[lang]
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fz.leitung','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/drivers'); q.reload(); q.wait_for_selector('#dinact',timeout=15000); q.wait_for_timeout(600)
        rows=q.locator('.list a.row[href^="#/drivers/"]')
        ol=[x for x in rows.all() if 'Olena Kovalenko' in x.inner_text()]
        check(bool(ol) and ol[0].locator('[data-vehnow]').count()==1 and 'FZ-AB 1529' in ol[0].locator('[data-vehnow]').inner_text(),f'{lang} {wd}px: 🚚 FZ-AB 1529 bei Olena')
        check(q.locator('[data-vehnow]').count()==1,f'{lang} {wd}px: nur eine Akte mit Fahrzeug')
        cb=q.locator('#dnoveh'); lt=q.locator('label:has(#dnoveh)')
        check(cb.count()==1 and lt.inner_text().strip().startswith(lab+' (1)'),f'{lang} {wd}px: Kästchen „{lab} (1)“')
        if cb.count(): cb.check(); q.wait_for_timeout(700)
        names=q.locator('.list a.row[href^="#/drivers/"]').all_inner_texts()
        check(len(names)==1 and 'Petro Ohnefahrzeug' in names[0],f'{lang} {wd}px: nur Petro (ohne Konto zählt nicht) {len(names)}')
        check(q.locator('[data-novehhint]').count()==1,f'{lang} {wd}px: Hinweis')
        check(lab in (q.locator('p.print-only').first.text_content() or ''),f'{lang} {wd}px: Druckkopf')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrzeug_fahrerliste_{lang}_{wd}.png',full_page=False)
        q.locator('#dnoveh').uncheck(); q.wait_for_timeout(600)
        check(q.locator('.list a.row[href^="#/drivers/"]').count()==3,f'{lang} {wd}px: wieder alle')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
