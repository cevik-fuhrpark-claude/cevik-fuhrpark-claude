# [CLAUDE] UI-Test (28.10.2026): Backlog 567–569/572 (große Systemschrift, Zoom 200 %, Fahrerkarte-Hinweis im Vorgang). Braucht einen frischen Dev-Server (scripts/dev-server.mjs).
import os, sys
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL', 'http://localhost:8787'); PW='Sicheres-Passwort-2026'; SH=os.environ.get('CFP_SHOTS') or '/tmp'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gs.inhaber','display_name':'GS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'gs.inhaber','password':PW})
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    v=api('POST','/api/vehicles',{'plate':'DO-GS 1234','vin':'WDB96340310776099','site':'Dortmund'}); vid=v['d']['id']
    u=api('POST','/api/users',{'username':'gs.fahrer','display_name':'Gerhard Schmidt-Langenbach','role':'driver','environment':'production'})
    c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c.close()
    uid=[x for x in api('GET','/api/users')['d']['users'] if x['username']=='gs.fahrer'][0]['id']
    api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':uid})
    dr=api('POST','/api/drivers',{'display_name':'Gerhard Schmidt-Langenbach','user_id':uid}); did=dr['d'].get('id')
    # Meldung des Fahrers
    c=br.new_context(); d=c.new_page(); d.goto(B); d.evaluate(JS,['POST','/api/login',{'username':'gs.fahrer','password':PW}])
    cs=d.evaluate(JS,['POST','/api/cases',{'vehicle_id':vid,'description':'Fahrerkarte wird vom Tachograph nicht gelesen','priority':'mittel','driveability':'fahrbereit','workshop_site':site,'request_key':'k-1'}]); cid=cs['d']['id']; c.close()
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gs.inhaber','password':PW}])
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('[data-tachocard]',timeout=30000); q.wait_for_timeout(300)
        href=q.get_attribute('[data-tachocard] a','href'); sw=q.evaluate('document.documentElement.scrollWidth')
        if href!='#/drivers/'+did: fails.append((lang,w,'href',href))
        if sw>w: fails.append((lang,w,'sw',sw))
        q.locator('[data-tachocard]').screenshot(path=f'{SH}/tc_{lang}_{w}.png')
        q.click('[data-tachocard] a'); q.wait_for_timeout(800)
        if 'Schmidt' not in q.inner_text('main h1'): fails.append((lang,w,'akte'))
        ctx.close()
      # Fahrer: kein Hinweis; Zoom/große Schrift
      for pct,(w,h) in [('200',(360,740)),('100',(180,370)),('130',(360,740))]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gs.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        for rt in ['new/'+vid,'check/'+vid,'','cases/'+cid]:
          q.goto(B+'/#/'+rt); q.reload(); q.wait_for_selector('.tabbar',timeout=30000); q.wait_for_timeout(500); q.add_style_tag(content=f'html{{font-size:{pct}%}}'); q.wait_for_timeout(250)
          r=q.evaluate("()=>({sw:document.documentElement.scrollWidth, tabs:[...document.querySelectorAll('.tabbar a > span:last-child')].filter(s=>s.scrollHeight>s.clientHeight+1).map(s=>s.textContent), file:[...document.querySelectorAll('input[type=file]')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).length, tc:!!document.querySelector('[data-tachocard]')})")
          if r['sw']>w or r['tabs'] or r['file'] or r['tc']: fails.append((lang,pct,w,rt[:8],r))
          if lang!='en' and rt.startswith('new'): q.screenshot(path=f'{SH}/z_{lang}_{pct}_{w}.png')
        ctx.close()
    br.close()
print('FEHLER' if fails else 'alles grün', fails)
raise SystemExit(1 if fails else 0)
