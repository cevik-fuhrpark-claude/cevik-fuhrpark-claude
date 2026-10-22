# [CLAUDE] UI-Test (22.10.2026, Fund Teilagent „kleine Handys/große Schrift“): 320 px und 360 px mit 150 % Schrift, DE/UK/EN –
# Tab-Beschriftungen mit weichen Trennstellen (kein Umbruch mitten im Wort ohne Strich), Lagerliste ohne abgeschnittene Zusatzzeile,
# „Alle“ unter offenen Vorgängen und „Hilfe zu dieser Seite“ mit Tippfläche ≥ 40 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
# Tab-Beschriftung: jede Zeilengrenze liegt an einem Leerzeichen oder einer weichen Trennstelle (Range-Messung je Zeichen)
TABJS = """() => [...document.querySelectorAll('.tabbar a > span:last-child')].map((sp) => {
  const tn = sp.firstChild; if (!tn || tn.nodeType !== 3) return { t: sp.textContent, ok: true };
  const s = tn.textContent; const r = document.createRange(); let lastTop = null; let bad = false;
  for (let i = 0; i < s.length; i++) { r.setStart(tn, i); r.setEnd(tn, i + 1); const rs = r.getClientRects(); const rc = rs[rs.length - 1]; if (!rc) continue;
    if (lastTop !== null && rc.top > lastTop + 2 && !/[\\s\\u00AD]/.test(s[i - 1]) && s[i] !== ' ') bad = true; lastTop = rc.top; }
  return { t: s.replace(/\\u00AD/g, '·'), ok: !bad }; })"""
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kh.inhaber','display_name':'KH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kh.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'KH-AB 1','vin':'WDB96340310776001','site':'Dortmund'})
    acc={}
    for un,role,extra in [('kh.leitung','fleet',{}),('kh.ws','workshop',{'workshop_site':site}),('kh.fahrer','driver',{})]:
        u=api('POST','/api/users',{'username':un,'display_name':un,'role':role,'environment':'production',**extra})
        c=br.new_context(); pg=c.new_page(); pg.goto(B); pg.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        acc[un]=(c,pg)
    wsapi=lambda m,pa,b=None: acc['kh.ws'][1].evaluate(JS,[m,pa,b])
    check(wsapi('POST','/api/stock',{'name':'KH Bremsbelagsatz Vorderachse mit Verschleißanzeige','part_number':'BB-12345-XYZ','unit_price_net':'84,50','min_qty':5,'initial_qty':2})['s']==201,'Lagerartikel')
    api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310776001','description':'KH Spiegel locker','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':'kh-1'})
    for lang in ['de','uk','en']:
      for w,h,zoom in [(320,568,1.0),(360,740,1.5)]:
        for un,route in [('kh.leitung','/#/'),('kh.ws','/#/stock'),('kh.fahrer','/#/')]:
          ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
          q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
          q.goto(B+route); q.reload(); q.wait_for_selector('.tabbar',timeout=15000); q.wait_for_timeout(600)
          if zoom!=1.0: q.add_style_tag(content=f'html{{font-size:{int(zoom*100)}%}}'); q.wait_for_timeout(200)
          tag=f'{lang} {w}px {int(zoom*100)}% {un}'
          tabs=q.evaluate(TABJS)
          check(all(x['ok'] for x in tabs),f'{tag}: Tabs ohne Wortbruch {[x["t"] for x in tabs if not x["ok"]]}')
          check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
          if un=='kh.ws':
            cut=q.evaluate("()=>[...document.querySelectorAll('#sl .row > .sub')].filter((e)=>e.scrollWidth>e.clientWidth+1).length")
            check(cut==0,f'{tag}: Lagerzeile nicht abgeschnitten ({cut})')
          if un=='kh.leitung' and zoom==1.0:
            hs=q.evaluate("()=>[...document.querySelectorAll('main a[href^=\"#/help\"], main p.navlinks a')].map((e)=>Math.round(e.getBoundingClientRect().height))")
            check(len(hs)>=1 and min(hs)>=40,f'{tag}: Tippflächen Hilfe/Alle ≥ 40 px {hs}')
          if SHOTS: q.screenshot(path=f'{SHOTS}/klein_{un}_{lang}_{w}_{int(zoom*100)}.png')
          check(not errs,f'{tag}: keine Skriptfehler {errs}')
          ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
