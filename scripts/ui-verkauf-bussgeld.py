# [CLAUDE] UI-Test Backlog 1579 (Backlog 195, Blickwinkel „Leitung nimmt einen verkauften Lkw außer Betrieb, während noch Bußgeldverfahren
# laufen“): Fahrzeug mit offenem Anhörungsverfahren wird in der Akte außer Betrieb genommen → Hinweis nennt das offene Verfahren; danach wieder
# in Betrieb (für den nächsten Durchlauf). DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'offenes Bußgeld/Anhörungsverfahren','uk':'відкрита справа про штраф','en':'open fine/notice procedure'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vb.inhaber','display_name':'VB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vb.inhaber','password':PW})['s']==200,'Anmeldung')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']; pid=os.getpid()
    vin='WDB96340310781579'; VID='VIN:'+vin; api('POST','/api/vehicles',{'plate':'VB-AB 1579','vin':vin,'kind':'lkw','site':'Dortmund'})
    off=(datetime.datetime.utcnow()-datetime.timedelta(days=2)).isoformat()+'Z'
    f=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Dortmund Bußgeldstelle','reference':f'AZ-1579-{pid}','offense_type':'geschwindigkeit','offense_at':off,'location':'B1, Dortmund','plate_in_letter':'VB-AB 1579','amount_eur':70})
    check(f['s']==201 and f['d'].get('vehicle_matched'),f'Anhörung erfasst und zugeordnet {f}')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Verkauft'))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vb.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#deact',state='attached',timeout=15000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#deact')) d.open = true; }")
        q.click('#deact'); q.wait_for_selector('.toast',timeout=15000)
        tx=q.inner_text('.toast')
        check(HINT[lang] in tx,f'{lang} {w}px: Hinweis auf offenes Bußgeldverfahren ({tx[:80]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vb_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('POST',f'/api/vehicles/{VID}/active',{'active':True})['s']==200,f'{lang} {w}px: wieder in Betrieb')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
