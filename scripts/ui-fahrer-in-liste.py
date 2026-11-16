# [CLAUDE] UI-Test (16.11.2026, Backlog 1528, Blickwinkel „Disposition fragt: Wer fährt heute den Lkw? Welche Lkw haben keinen festen Fahrer?“):
# Fahrzeugliste zeigt 👤 mit den zurzeit zugeordneten Fahrern, Knopf „Ohne Fahrer (n)“ (nur Lkw, keine Anhänger), Hinweis, Druckkopf,
# Suche nach dem Fahrernamen; Werkstatt sieht keine Namen. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Ohne Fahrer','uk':'Без водія','en':'Without driver'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wf.inhaber','display_name':'WF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    def invite(un,dn,role,extra=None):
        u=api('POST','/api/users',{'username':un,'display_name':dn,'role':role,'environment':envn,**(extra or {})})
        check(u['s']==201,f'Konto {un}')
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
        return u['d']['id']
    invite('wf.dispo','WF Dispo','dispatch'); invite('wf.werkstatt','WF Werkstatt','workshop',{'workshop_site':'DORTMUND'})
    d1=invite('wf.fahrer1','Olena Kovalenko','driver')
    for plate,vin,extra in [('WF-AB 1528','WDB96340315280001',{'trailer_plate':'WF-AH 1528'}),('WF-CD 1528','WDB96340315280002',{}),('WF-AH 1528','WSM00000015280003',{'kind':'anhaenger'})]:
        check(api('POST','/api/vehicles',{'plate':plate,'vin':vin,'site':'Dortmund',**extra})['s'] in (200,201),f'Fahrzeug {plate}')
    r=api('POST','/api/vehicles/VIN:WDB96340315280001/drivers',{'user_id':d1}); check(r['s']==201,f'Zuordnung {r}')
    for lang in ['de','uk','en']:
      lab=LBL[lang]
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wf.dispo','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles'); q.reload(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(600)
        row=[x for x in q.locator('#vl a.row').all() if x.locator('.plate').inner_text().endswith('WF-AB 1528')]
        check(bool(row) and row[0].locator('[data-drvnow]').count()==1 and 'Olena Kovalenko' in row[0].locator('[data-drvnow]').inner_text(),f'{lang} {wd}px: 👤 Olena Kovalenko an WF-AB')
        btn=q.locator('[data-av="no_driver"]')
        check(btn.count()==1 and btn.inner_text().startswith(lab+' ('),f'{lang} {wd}px: Knopf „{lab} (n)“')
        if btn.count(): btn.click(); q.wait_for_timeout(600)
        rows=q.locator('#vl a.row').all_inner_texts()
        check(any('WF-CD 1528' in x for x in rows) and not any('WF-AB 1528' in x or 'WF-AH 1528' in x for x in rows),f'{lang} {wd}px: nur Lkw ohne Fahrer, kein Anhänger ({len(rows)})')
        check(q.locator('[data-nodrvhint]').count()==1,f'{lang} {wd}px: Hinweis')
        check(lab in (q.locator('#vprl').text_content() or ''),f'{lang} {wd}px: Druckkopf')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrer_liste_{lang}_{wd}.png',full_page=False)
        q.locator('[data-av="all"]').click(); q.wait_for_timeout(500)
        q.fill('#q','kovalenko'); q.wait_for_timeout(300)
        vis=[x.inner_text() for x in q.locator('#vl a.row').all() if x.is_visible()]
        check(len(vis)==1 and 'WF-AB 1528' in vis[0],f'{lang} {wd}px: Suche nach Fahrername ({len(vis)})')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # Werkstatt: keine Namen, kein Knopf
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wf.werkstatt','password':PW}])
    q.goto(B+'/#/vehicles'); q.reload(); q.wait_for_selector('#vl',timeout=15000); q.wait_for_timeout(500)
    check(q.locator('[data-drvnow]').count()==0 and q.locator('[data-av="no_driver"]').count()==0,'Werkstatt: keine Fahrernamen, kein Knopf')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
