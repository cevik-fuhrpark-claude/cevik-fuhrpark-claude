# [CLAUDE] UI-Test Bußgeld mit Fahrverbot (26.10.2026, Backlog 364): Auswahl „Fahrverbot laut Schreiben“ beim Erfassen,
# Chip in der Liste, Hinweis (§ 21 StVG) und Angabe im Vorgang, Vorbelegung und Entfernen über „Angaben laut Schreiben ändern“.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BAN={'de':'Fahrverbot laut Schreiben','uk':'Заборона керування згідно з листом','en':'Driving ban according to the letter'}
M2={'de':'2 Monate','uk':'2 місяці','en':'2 months'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fv.inhaber','display_name':'FV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'fv.inhaber','password':PW})
    vin='WDB96340310736401'; api('POST','/api/vehicles',{'plate':'FV-BG 364','vin':vin,'kind':'lkw'})
    off=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=4)).strftime('%Y-%m-%dT%H:%M:%SZ')
    fi=api('POST','/api/fines',{'kind':'bussgeldbescheid','authority':'Bußgeldstelle FV','reference':'AZ-FV-364','offense_type':'geschwindigkeit','offense_at':off,'plate_in_letter':'FV-BG 364','amount_eur':320,'driving_ban_months':2,'request_key':'fv-1'})
    check(fi['s']==201,f'Schreiben mit Fahrverbot erfasst ({fi["s"]} {fi["d"]})'); FID=fi['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fv.inhaber','password':PW}])
        q.goto(B+'/#/fines'); q.wait_for_selector('#nf', state='attached', timeout=15000)
        check(q.locator('#nfban option').count()==4,f'{lang} {w}px: Auswahl Fahrverbot im Erfassungsformular (leer + 1–3)')
        chip=q.locator('[data-fban]').first
        check(chip.count()==1 and M2[lang] in chip.inner_text(),f'{lang} {w}px: Chip in der Liste')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Liste ohne Querscrollen')
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#uf', state='attached', timeout=15000)
        check(q.locator('#fban').count()==1 and '§ 21 StVG' in q.inner_text('#fban'),f'{lang} {w}px: Hinweis Fahrverbot')
        check(BAN[lang] in q.inner_text('dl.kv') and M2[lang] in q.inner_text('dl.kv'),f'{lang} {w}px: Angabe im Vorgang')
        check(q.eval_on_selector('#ufban','e=>e.value')=='2',f'{lang} {w}px: Ändern vorbelegt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang ohne Querscrollen')
        if SHOTS: q.evaluate("()=>document.querySelector('#uf').closest('details').open=true"); q.screenshot(path=f'{SHOTS}/fahrverbot_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Erfassen per Formular mit 3 Monaten, danach Entfernen über „ändern“
    api('PATCH','/api/me',{'language':'de'})
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fv.inhaber','password':PW}])
    q.goto(B+'/#/fines'); q.wait_for_selector('#nf', state='attached', timeout=15000)
    q.evaluate("()=>document.querySelector('#nf').closest('details').open=true")
    q.fill('#nf input[name=authority]','Stadt FV'); q.fill('#nf input[name=reference]','AZ-FV-365')
    q.fill('#nf input[name=offense_at]',(datetime.datetime.now()-datetime.timedelta(days=2)).strftime('%Y-%m-%dT%H:%M'))
    q.fill('#nf input[name=plate_in_letter]','FV-BG 364'); q.select_option('#nfban','3'); q.locator('#nf button').click()
    q.wait_for_selector('#fban', timeout=15000)
    fid2=q.evaluate('()=>location.hash.split("/").pop()')
    f=api('GET',f'/api/fines/{fid2}')['d']['fine']; check(f.get('driving_ban_months')==3,f'Formular speichert 3 Monate ({f.get("driving_ban_months")})')
    q.evaluate("()=>document.querySelector('#uf').closest('details').open=true"); q.select_option('#ufban',''); q.locator('#uf button').click(); q.wait_for_timeout(1000)
    f=api('GET',f'/api/fines/{fid2}')['d']['fine']; check(f.get('driving_ban_months') is None,f'Fahrverbot entfernt ({f.get("driving_ban_months")})')
    check(q.locator('#fban').count()==0,'Hinweis nach dem Entfernen weg')
    check('3 Monate' in q.inner_text('.timeline'),'Verlauf zeigt alt → neu')
    check(not errs,f'Formular: keine Skriptfehler {errs[:2]}')
    ctx.close()
    # Fahrerakte (Backlog 367): offenes Schreiben mit Fahrverbot des verknüpften Kontos
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    du=api('POST','/api/users',{'username':'fv.fahrer','display_name':'FV Fahrer','role':'driver','environment':envn}); DUID=du['d']['id']
    dr=api('POST','/api/drivers',{'display_name':'FV Fahrer','user_id':DUID}); check(dr['s']==201,f'Fahrerakte angelegt ({dr["s"]} {dr["d"]})'); DRID=dr['d']['id']
    v=api('GET',f'/api/fines/{FID}')['d']['fine']['version']
    c=api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','expected_version':v,'payload':{'driver_id':DUID,'basis':'manuell','evidence':'Tourenplan (Test)'}}); check(c['s']==200,f'Fahrer bestätigt ({c["s"]} {c["d"]})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fv.inhaber','password':PW}])
        q.goto(B+'/#/drivers/'+DRID); q.wait_for_selector('#dban', timeout=15000)
        check(M2[lang] in q.inner_text('#dban') and q.locator('#dban a').count()==1,f'{lang} {w}px: Fahrerakte zeigt das Fahrverbot')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Fahrerakte ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrverbot_akte_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px Akte: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
