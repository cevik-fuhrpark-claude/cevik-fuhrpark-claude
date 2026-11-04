# [CLAUDE] UI-Test (04.11.2026, Backlog 974, Blickwinkel „Werkstatt bucht Teilemengen vom Lieferschein“): Lagerbuchung mit Einheit wie auf dem
# Lieferschein („3 Stk.“) wird gebucht; eine fremde Einheit („5 l“ bei einem Artikel in Stk) wird in der App-Sprache abgewiesen, das Formular
# bleibt mit Eingabe offen. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MSG={'de':'Einheit passt nicht zum Artikel','uk':'одиниця не відповідає артикулу','en':'unit does not match the item'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'le.inhaber','display_name':'LE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'le.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    r=api('POST','/api/stock',{'site':ws,'name':'Ölfilter LE '+str(uuid.uuid4().int)[:4],'unit_price_net':'8,00'}); check(r['s']==201,'Artikel angelegt'); iid=r['d']['id']
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; tag=f'{lang}/{w}'
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'le.inhaber','password':PW},None])
        q.goto(B+'/#/stock/'+iid); q.wait_for_selector('#mf input[name=qty]',timeout=15000)
        before=api('GET','/api/stock/'+iid)['d']['item']['on_hand']
        q.fill('#mf input[name=qty]','5 l'); q.click('#mf button.btn'); q.wait_for_selector('.toast.err',timeout=10000)
        msg=q.inner_text('.toast.err'); check(MSG[lang] in msg,f'{tag}: fremde Einheit in der App-Sprache ({msg[:80]!r})')
        check(q.input_value('#mf input[name=qty]')=='5 l',f'{tag}: Formular bleibt mit Eingabe offen')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Meldung)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lager-einheit-fehler-{lang}-{w}.png')
        q.evaluate("document.querySelectorAll('.toast').forEach((x) => x.remove())")
        q.fill('#mf input[name=qty]','3 Stk.'); q.click('#mf button.btn'); oh=before
        for _ in range(40):
            q.wait_for_timeout(250); oh=api('GET','/api/stock/'+iid)['d']['item']['on_hand']
            if oh!=before: break
        check(oh==before+3,f'{tag}: „3 Stk.“ gebucht ({before} → {oh})')
        check(q.evaluate(noscroll),f'{tag}: ohne Querscrollen (Artikel)')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
