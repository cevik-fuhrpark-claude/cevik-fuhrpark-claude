# [CLAUDE] UI-Test Backlog 1601/1602 (Blickwinkel „Leitung nimmt einen Lkw mit offenen Terminen/Rückrufen außer Betrieb“): Fahrzeug mit
# offenem Rückruf (ohne Frist) und verstrichenem, nicht eingetragenem UVV-Termin wird in der Akte außer Betrieb genommen → Hinweis nennt
# beides; „Wieder in Betrieb“ → Rückkehr-Prüfung nennt beides ebenfalls. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vr.inhaber','display_name':'VR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    un='vr.inhaber'
    if api('POST','/api/login',{'username':un,'password':PW})['s']!=200:
        un=None
        for x in ['ot.inhaber','vb.inhaber','or.inhaber','tf.inhaber']:
            if api('POST','/api/login',{'username':x,'password':PW})['s']==200: un=x; break
    check(un is not None,'Anmeldung')
    R=os.getpid()%100000; vin=f'WVR{R:05d}16010000000'[:17]; VID='VIN:'+vin
    check(api('POST','/api/vehicles',{'plate':f'VR-R {R%9000+1}','vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Lkw')
    check(api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'Rückruf','evidence':'Herstellerschreiben ohne Frist'})['s']==201,'Rückruf ohne Frist')
    u=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'UVV','interval_months':12,'last_done_date':(today-datetime.timedelta(days=300)).isoformat(),'evidence':'Prüfbuch'})
    check(u['s']==201 and api('POST',f"/api/maintenance/{u['d']['id']}/plan",{'planned_date':(today-datetime.timedelta(days=2)).isoformat()})['s']==200,'UVV-Termin vorgestern')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Verkauft'))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}])
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); const P = m.PLURALS[l]; return { r: P.recalls_open_deact.one.replace('{n} ', '').slice(0, 20), m: P.missed_appt_deact.one.replace('{n} ', '').slice(0, 20), rr: P.rc_recalls.one.replace('{n} ', ''), rm: P.rc_missed.one.replace('{n} ', '') }; }", lang)
        q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('#deact',state='attached',timeout=15000)
        q.evaluate("()=>{ for (const d of document.querySelectorAll('details')) if (d.querySelector('#deact')) d.open = true; }")
        q.click('#deact'); q.wait_for_selector('.toast',timeout=15000)
        tx=q.inner_text('.toast')
        check(T['r'] in tx and T['m'] in tx,f'{lang} {w}px: Hinweis Rückruf + verstrichener Termin ({tx[:120]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vr_aus_{lang}_{w}.png')
        q.wait_for_selector('#react',state='attached',timeout=15000)
        q.evaluate("()=>{ for (const t of document.querySelectorAll('.toast')) t.remove(); for (const d of document.querySelectorAll('details')) if (d.querySelector('#react')) d.open = true; }")
        q.click('#react'); q.wait_for_selector('.toast',timeout=15000)
        tx=q.inner_text('.toast')
        check(T['rr'] in tx and T['rm'] in tx,f'{lang} {w}px: Rückkehr-Prüfung nennt Rückruf + Termin ({tx[:160]})')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vr_zurueck_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('GET',f'/api/vehicles/{VID}')['d']['vehicle']['active'] in (1,True),f'{lang} {w}px: wieder in Betrieb')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
